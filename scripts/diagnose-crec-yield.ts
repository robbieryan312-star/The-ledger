/**
 * M-CREC-YIELD diagnostic — per-stage rejection counts for one member.
 * Does NOT write topicPositions.json. Mirrors sync-topic-positions CREC path.
 *
 * Run: npx tsx scripts/diagnose-crec-yield.ts --member S000033 --full-depth \
 *   2>&1 | tee /tmp/ledger-crec-yield-diag.log
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import { isCeremonialCrecRemark } from '../lib/ceremonialCrecFilter';
import { isProceduralCrecText, matchedProceduralRule } from './lib/crecProceduralFilter';
import { crecFloorSpeechOpenerRegex } from './lib/crecOpener';
import { resolveGovInfoApiKey } from './lib/govinfoApiKey';
import { sleep } from './lib/ingest-utils';
import { truncateAtSentenceBoundary } from '../lib/data/displaySummary';

config({ path: '.env.local' });

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib/data/generated/currentLegislators.json');
const REQUEST_TIMEOUT_MS = 20_000;
const IS_FULL_DEPTH = process.argv.includes('--full-depth');
const MAX_CREC_STATEMENTS_PER_MEMBER = IS_FULL_DEPTH ? 100 : 12;
const CREC_SEARCH_POOL = IS_FULL_DEPTH ? 800 : 150;
const CREC_SEARCH_PAGE_SIZE = 100;
const CREC_CONGRESSES = IS_FULL_DEPTH ? [119, 118, 117, 116] : [119, 118];
const GOVINFO_MAX_RPS = Number(process.env.GOVINFO_MAX_RPS ?? 8);
const CREC_SKIP_PROCEDURAL = (process.env.CREC_SKIP_PROCEDURAL ?? '1') !== '0';
const SAMPLE_LIMIT = 3;

type RejectStage =
  | 'a_fetch_search_fail'
  | 'a_fetch_html_fail'
  | 'b_speaker_miss'
  | 'b_no_opener'
  | 'b_excerpt_short'
  | 'b_opener_lost'
  | 'c_procedural_title'
  | 'c_procedural_body'
  | 'c_ceremonial'
  | 'd_no_topic_legacy'
  | 'd_topic_legislation_catchall'
  | 'e_dedup'
  | 'f_capped'
  | 'f_no_date'
  | 'f_accepted';

interface Sample {
  stage: RejectStage;
  title: string;
  date: string;
  reason: string;
  excerpt?: string;
}

interface LegislatorRow {
  bioguideId: string;
  name: string;
  lastName: string;
  chamber: string;
}

const CREC_PROCEDURAL_TITLE_RE =
  /^(text of (the )?(senate |house )?amendments?|amendments? submitted|submission of .*resolutions?|additional cosponsors|additional sponsors|public bills and resolutions|introduction of bills|reports? of committees?|executive communications?|petitions and memorials|enrolled bills?( and joint resolutions)? signed|constitutional authority statement|daily digest)\b/i;

function parseMember(): string {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--member' && argv[i + 1]) return argv[i + 1];
    if (argv[i] === '--members' && argv[i + 1]) return argv[i + 1].split(',')[0];
  }
  return 'S000033';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

class RateLimiter {
  private tokens: number;
  private last: number;
  constructor(private readonly rps: number, private readonly burst = rps) {
    this.tokens = burst;
    this.last = Date.now();
  }
  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rps);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.max(10, ((1 - this.tokens) / this.rps) * 1000));
    }
  }
}

const limiter = new RateLimiter(GOVINFO_MAX_RPS);

function crecSearchQuery(leg: LegislatorRow): string {
  const surname = leg.lastName.toUpperCase();
  return `("Mr. ${surname}" OR "Ms. ${surname}" OR "Mrs. ${surname}" OR "Miss ${surname}")`;
}

function crecGovInfoUrlStem(url: string): string {
  const granule = url.match(/CREC-[^/?#]+/i)?.[0] ?? url;
  return granule.replace(/-\d+$/, '');
}

/** Legacy map that DROPPED legislation — used for before/after comparison. */
function mapCrecTextToTopicLegacy(text: string): string | null {
  const topicId = classifyTextToRecordTopicId(text);
  return topicId === 'legislation' ? null : topicId;
}

function mapCrecTextToTopicFixed(text: string): string {
  return classifyTextToRecordTopicId(text);
}

function extractExcerptDiag(
  plainText: string,
  lastName: string,
): { excerpt: string | null; stage: RejectStage | null; reason: string } {
  const opener = crecFloorSpeechOpenerRegex(lastName);
  const match = opener.exec(plainText);
  if (!match || match.index === undefined) {
    return { excerpt: null, stage: 'b_no_opener', reason: 'no floor opener' };
  }
  let excerpt = plainText.slice(match.index);
  const nextSpeakerRe = /\b(?:Mr|Ms|Mrs)\.\s+[A-Z][A-Z'\-]+(?=[.,])|The PRESIDING OFFICER|The SPEAKER\b/;
  const nextSpeaker = excerpt.slice(40).search(nextSpeakerRe);
  if (nextSpeaker > 80) excerpt = excerpt.slice(0, 40 + nextSpeaker);
  excerpt = excerpt.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (excerpt.length < 80) {
    return { excerpt: null, stage: 'b_excerpt_short', reason: `excerpt <80 ("${excerpt.slice(0, 60)}")` };
  }
  if (isProceduralCrecText(excerpt)) {
    return {
      excerpt: null,
      stage: 'c_procedural_body',
      reason: `procedural:${matchedProceduralRule(excerpt)}`,
    };
  }
  if (!opener.test(excerpt)) {
    return { excerpt: null, stage: 'b_opener_lost', reason: 'opener lost after trim' };
  }
  return {
    excerpt: truncateAtSentenceBoundary(excerpt, 900).slice(0, 900),
    stage: null,
    reason: 'ok',
  };
}

async function main(): Promise<void> {
  const bioguideId = parseMember();
  const keyInfo = resolveGovInfoApiKey();
  if (!keyInfo.key) {
    console.error('GovInfo key missing');
    process.exit(1);
  }
  console.log(`GovInfo key: supplied by ${keyInfo.sourceEnvVar} (length ${keyInfo.key.length})`);
  console.log(
    `Member=${bioguideId} fullDepth=${IS_FULL_DEPTH} pool=${CREC_SEARCH_POOL} cap=${MAX_CREC_STATEMENTS_PER_MEMBER} congresses=${CREC_CONGRESSES.join(',')}`,
  );

  const raw = JSON.parse(readFileSync(LEGISLATORS_FILE, 'utf8'));
  const arr: LegislatorRow[] = Array.isArray(raw) ? raw : (raw.legislators ?? raw.members ?? []);
  const leg = arr.find((l) => l.bioguideId === bioguideId);
  if (!leg) {
    console.error(`${bioguideId} not in legislators`);
    process.exit(1);
  }

  const counts = new Map<RejectStage, number>();
  const samples = new Map<RejectStage, Sample[]>();
  const bump = (stage: RejectStage, sample: Omit<Sample, 'stage'>) => {
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
    const list = samples.get(stage) ?? [];
    if (list.length < SAMPLE_LIMIT) list.push({ stage, ...sample });
    samples.set(stage, list);
  };

  const searchQuery = crecSearchQuery(leg);
  const speakerNeedle = leg.lastName.toUpperCase().toLowerCase().replace(/\./g, '');
  let searchResults = 0;
  let htmlFetches = 0;
  let granulesExamined = 0;
  const collected: { title: string; date: string; url: string; topicId: string }[] = [];
  const seenStems = new Set<string>();
  let searchOk = false;

  for (const congress of CREC_CONGRESSES) {
    if (granulesExamined >= CREC_SEARCH_POOL) break;
    let offsetMark = '*';
    for (;;) {
      if (granulesExamined >= CREC_SEARCH_POOL) break;
      await limiter.acquire();
      const searchRes = await fetch(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(keyInfo.key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `collection:CREC AND congress:${congress} AND ${searchQuery}`,
          pageSize: CREC_SEARCH_PAGE_SIZE,
          offsetMark,
          sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!searchRes.ok) {
        if (!searchOk) bump('a_fetch_search_fail', { title: `congress ${congress}`, date: '', reason: `http ${searchRes.status}` });
        break;
      }
      searchOk = true;
      const searchData = (await searchRes.json()) as {
        results?: Array<{ title?: string; packageId?: string; granuleId?: string; dateIssued?: string }>;
        offsetMark?: string;
      };
      const results = (searchData.results ?? []).filter((r) => r.granuleId && r.packageId);
      searchResults += results.length;
      if (results.length === 0) break;

      for (const result of results) {
        granulesExamined += 1;
        if (granulesExamined > CREC_SEARCH_POOL) break;
        const title = result.title ?? '';
        const date = (result.dateIssued ?? '').slice(0, 10);
        if (CREC_SKIP_PROCEDURAL && CREC_PROCEDURAL_TITLE_RE.test(title.trim())) {
          bump('c_procedural_title', { title, date, reason: 'procedural title skip' });
          continue;
        }
        let plain = '';
        try {
          await limiter.acquire();
          const textRes = await fetch(
            `https://api.govinfo.gov/packages/${result.packageId}/granules/${result.granuleId}/htm?api_key=${encodeURIComponent(keyInfo.key)}`,
            { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
          );
          htmlFetches += 1;
          if (!textRes.ok) {
            bump('a_fetch_html_fail', { title, date, reason: `http ${textRes.status}` });
            continue;
          }
          plain = stripHtml(await textRes.text());
        } catch (e) {
          htmlFetches += 1;
          bump('a_fetch_html_fail', {
            title,
            date,
            reason: e instanceof Error ? e.message : String(e),
          });
          continue;
        }

        const speakerHay = plain.toLowerCase().replace(/\./g, '');
        if (!speakerHay.includes(speakerNeedle)) {
          bump('b_speaker_miss', { title, date, reason: 'surname not in granule body' });
          continue;
        }

        const { excerpt, stage, reason } = extractExcerptDiag(plain, leg.lastName.toUpperCase());
        if (!excerpt || stage) {
          bump(stage ?? 'b_no_opener', { title, date, reason, excerpt: excerpt?.slice(0, 160) });
          continue;
        }

        if (isCeremonialCrecRemark(excerpt)) {
          bump('c_ceremonial', { title, date, reason: 'ceremonial/tribute', excerpt: excerpt.slice(0, 160) });
          continue;
        }

        const legacyTopic = mapCrecTextToTopicLegacy(excerpt) ?? mapCrecTextToTopicLegacy(title);
        const fixedTopic = mapCrecTextToTopicFixed(excerpt) || mapCrecTextToTopicFixed(title);
        if (!legacyTopic) {
          bump('d_no_topic_legacy', {
            title,
            date,
            reason: `legacy drop; fixed→${fixedTopic}`,
            excerpt: excerpt.slice(0, 160),
          });
        }
        if (fixedTopic === 'legislation') {
          bump('d_topic_legislation_catchall', {
            title,
            date,
            reason: 'catch-all legislation (kept under fix)',
            excerpt: excerpt.slice(0, 160),
          });
        }

        if (!result.dateIssued) {
          bump('f_no_date', { title, date: '', reason: 'missing dateIssued', excerpt: excerpt.slice(0, 160) });
          continue;
        }

        const url = `https://www.govinfo.gov/app/details/${result.granuleId}`;
        const stem = crecGovInfoUrlStem(url);
        const titleKey = excerpt.trim().toLowerCase();
        if (seenStems.has(stem) || collected.some((c) => c.title.trim().toLowerCase() === titleKey)) {
          bump('e_dedup', { title, date, reason: 'url-stem or title dup', excerpt: excerpt.slice(0, 160) });
          continue;
        }
        seenStems.add(stem);
        collected.push({ title: excerpt, date: result.dateIssued.slice(0, 10), url, topicId: fixedTopic });
        bump('f_accepted', {
          title,
          date,
          reason: `topic=${fixedTopic}`,
          excerpt: excerpt.slice(0, 160),
        });
      }

      const next = searchData.offsetMark?.trim();
      if (!next || next === offsetMark) break;
      offsetMark = next;
    }
  }

  const capped = collected
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_CREC_STATEMENTS_PER_MEMBER);
  const cappedOut = collected.length - capped.length;
  if (cappedOut > 0) counts.set('f_capped', cappedOut);

  console.log('\n═══ PER-STAGE COUNTS ═══');
  const order: RejectStage[] = [
    'a_fetch_search_fail',
    'a_fetch_html_fail',
    'b_speaker_miss',
    'b_no_opener',
    'b_excerpt_short',
    'b_opener_lost',
    'c_procedural_title',
    'c_procedural_body',
    'c_ceremonial',
    'd_no_topic_legacy',
    'd_topic_legislation_catchall',
    'e_dedup',
    'f_no_date',
    'f_capped',
    'f_accepted',
  ];
  for (const stage of order) {
    console.log(`  ${stage}: ${counts.get(stage) ?? 0}`);
  }
  console.log(
    `\nsearchResults=${searchResults} htmlFetches=${htmlFetches} granulesExamined=${granulesExamined} collected=${collected.length} afterCap=${capped.length}`,
  );
  console.log(
    `legacyAcceptedEstimate=${(counts.get('f_accepted') ?? 0) - (counts.get('d_no_topic_legacy') ?? 0)} (accepted minus those that would have been no_topic drops)`,
  );

  console.log('\n═══ SAMPLES (up to 3 per reject stage) ═══');
  for (const stage of order) {
    if (stage === 'f_accepted' || stage === 'd_topic_legislation_catchall') continue;
    const list = samples.get(stage) ?? [];
    if (!list.length) continue;
    console.log(`\n--- ${stage} ---`);
    for (const s of list) {
      console.log(`  title: ${s.title.slice(0, 100)}`);
      console.log(`  date: ${s.date} | reason: ${s.reason}`);
      if (s.excerpt) console.log(`  excerpt: ${s.excerpt}`);
    }
  }

  // Also show legislation-catchall samples (valid Said that legacy dropped)
  const legSamples = samples.get('d_no_topic_legacy') ?? [];
  if (legSamples.length) {
    console.log('\n--- d_no_topic_legacy (would keep under fix) ---');
    for (const s of legSamples) {
      console.log(`  title: ${s.title.slice(0, 100)}`);
      console.log(`  date: ${s.date} | reason: ${s.reason}`);
      if (s.excerpt) console.log(`  excerpt: ${s.excerpt}`);
    }
  }

  console.log('\n═══ AFTER-CAP TOPIC BREAKDOWN ═══');
  const byTopic = new Map<string, number>();
  for (const e of capped) byTopic.set(e.topicId, (byTopic.get(e.topicId) ?? 0) + 1);
  for (const [t, n] of [...byTopic.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
