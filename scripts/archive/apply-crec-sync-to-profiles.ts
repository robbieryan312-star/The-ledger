/**
 * Apply GovInfo CREC sync output to migrated profile files (batch #1 depth pass).
 * Reads topicPositions.json for synced members, writes statements.json + saidDid.json,
 * removes those members from the mega-bundle, fetches GDELT news for Warren/Cruz.
 *
 * Prerequisite: npm run sync:topic-positions -- --members O000172,M000355,W000817,C001098
 * Run: npx tsx scripts/apply-crec-sync-to-profiles.ts
 */
import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECORD_TOPIC_BUCKETS, classifyTextToRecordTopicId, voteCongressGovUrl, voteTopicId } from '../../lib/data/profileRecordByTopic';
import { pruneSaidDidLinksByTopic } from '../../lib/data/buildSaidDidDiffs';
import { getNationalCongressVotesByBioguide } from '../../lib/data/nationalCongressVotes';
import { getPoliticianByBioguide } from '../../lib/data/allPoliticians';
import { isProceduralCrecText } from '../lib/crecProceduralFilter';
import { stripCrecFloorOpener } from '../../lib/data/crecDisplayText';
import { normalizeTopicId } from '../../lib/data/topicAliases';
import { sanitizeProfileNews, type ProfileNewsItem } from '../../lib/data/sanitizeProfileUiData';
import type {
  PlatformPositionEntry,
  SaidDidLinkEntry,
  TopicPositionData,
  TopicStatementEntry,
} from '../../lib/data/topicPositions';
import type { VoteRecord } from '../../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const topicPositionsFile = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');
const legislatorsFile = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

const CREC_MEMBERS = ['S000033', 'O000172', 'M000355', 'W000817', 'C001098'] as const;
const NEWS_MEMBERS = ['W000817', 'C001098'] as const;
const BATCH_ALL = ['S000033', 'O000172', 'M000355', 'M001184', 'W000817', 'C001098'] as const;

function parseMembersArg(argv: string[]): string[] | null {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) return null;
  return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
}

/** Approved tier-'media' domains (subset — GDELT domain match). */
const APPROVED_NEWS_DOMAINS = [
  'nytimes.com',
  'washingtonpost.com',
  'wsj.com',
  'politico.com',
  'thehill.com',
  'apnews.com',
  'reuters.com',
  'npr.org',
  'pbs.org',
  'rollcall.com',
  'theatlantic.com',
  'bloomberg.com',
  'propublica.org',
  'theguardian.com',
];

function isCollectibleStatement(s: TopicStatementEntry): boolean {
  if (isProceduralCrecText(s.title)) return false;
  if (s.tier === 'official') {
    return /\/CREC-/i.test(s.url) || Boolean(s.url?.trim() && s.verbatim === true);
  }
  if (s.tier === 'alleged' || s.tier === 'media') {
    return Boolean(s.url?.trim() && s.date?.trim() && s.verbatim === true);
  }
  return false;
}

function stampVerbatim(s: TopicStatementEntry): TopicStatementEntry {
  let out = s;
  if (out.verbatim === undefined && out.tier === 'official') {
    out = { ...out, verbatim: true };
  }
  if (!out.displayText && out.tier === 'official' && /\/CREC-/i.test(out.url)) {
    out = { ...out, displayText: stripCrecFloorOpener(out.title) };
  }
  return out;
}

function isOfficialCrecFloorRemark(s: TopicStatementEntry): boolean {
  return s.tier === 'official' && /\/CREC-/i.test(s.url) && !isProceduralCrecText(s.title);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isApprovedOutlet(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, '');
  return APPROVED_NEWS_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
}

function formatGdeltDate(seendate: string): string {
  if (/^\d{8}T\d{6}Z$/.test(seendate)) {
    return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
  }
  return seendate.slice(0, 10);
}

async function fetchGdeltNews(bioguideId: string): Promise<ProfileNewsItem[]> {
  const legislatorsRaw = JSON.parse(await readFile(legislatorsFile, 'utf8')) as {
    legislators: Array<{ bioguideId: string; name: string; state: string; chamber: string }>;
  };
  const leg = legislatorsRaw.legislators.find((l) => l.bioguideId === bioguideId);
  if (!leg) return [];

  const chamber = leg.chamber === 'senate' ? 'senate' : 'house';
  const query = `"${leg.name}" ${leg.state} ${chamber} sourcelang:english`;
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    maxrecords: '8',
    format: 'json',
    sort: 'datedesc',
    timespan: '90d',
  });
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(6000 * attempt);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
      const text = await res.text();
      if (res.status === 429 || text.includes('Please limit requests')) {
        lastErr = new Error(text.slice(0, 80));
        continue;
      }
      if (!res.ok || text.startsWith('Your search')) {
        lastErr = new Error(text.slice(0, 80));
        continue;
      }
      const data = JSON.parse(text) as { articles?: Array<{ url?: string; title?: string; seendate?: string; domain?: string }> };
      const items: ProfileNewsItem[] = [];
      for (const a of data.articles ?? []) {
        const articleUrl = a.url?.trim();
        const headline = a.title?.trim();
        const domain = a.domain?.trim() ?? '';
        const seendate = a.seendate?.trim() ?? '';
        if (!articleUrl || !headline || !domain || !seendate) continue;
        if (!isApprovedOutlet(domain)) continue;
        const date = formatGdeltDate(seendate);
        items.push({
          id: `n${items.length + 1}`,
          headline,
          summary: headline,
          date,
          category: 'Congress',
          isOpinion: false,
          isVerified: false,
          url: articleUrl,
          source: {
            name: domain.replace(/^www\./, ''),
            url: articleUrl,
            tier: 'media',
            date,
          },
        });
        if (items.length >= 3) break;
      }
      return sanitizeProfileNews(items);
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr !== undefined) {
    console.warn(`  GDELT failed for ${bioguideId}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }
  return [];
}

function rebucketStatementsFromContent(
  raw: Record<string, { statements: TopicStatementEntry[] }>,
): Record<string, { statements: TopicStatementEntry[] }> {
  const flat = Object.values(raw).flatMap((t) => t.statements);
  const out: Record<string, { statements: TopicStatementEntry[] }> = {};
  for (const s of flat) {
    if (!isCollectibleStatement(s)) continue;
    const topicId =
      s.tier === 'official' && /\/CREC-/i.test(s.url)
        ? classifyTextToRecordTopicId(s.title)
        : (s.topicId ?? classifyTextToRecordTopicId(s.title));
    const entry = stampVerbatim({ ...s, topicId });
    const list = out[topicId]?.statements ?? [];
    if (list.some((m) => m.url === entry.url || m.title.trim() === entry.title.trim())) continue;
    out[topicId] = { statements: [...list, entry] };
  }
  return out;
}

async function rebuildProfileSaidDid(
  bioguideId: string,
  byTopicStatements: Record<string, { statements: TopicStatementEntry[] }>,
): Promise<number> {
  const profileDir = path.join(profilesRoot, bioguideId);
  const positionsFile = JSON.parse(
    await readFile(path.join(profileDir, 'positions.json'), 'utf8'),
  ) as { byTopic: Record<string, { platformPositions: PlatformPositionEntry[] }> };

  const byTopicClean: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }> = {};
  for (const [topicId, data] of Object.entries(byTopicStatements)) {
    const platformPositions = positionsFile.byTopic[topicId]?.platformPositions ?? [];
    byTopicClean[topicId] = { statements: data.statements, platformPositions };
  }
  for (const [topicId, data] of Object.entries(positionsFile.byTopic ?? {})) {
    if (byTopicClean[topicId]) continue;
    if ((data.platformPositions?.length ?? 0) > 0) {
      byTopicClean[topicId] = { statements: [], platformPositions: data.platformPositions };
    }
  }

  const politicianId = getPoliticianByBioguide(bioguideId)?.id ?? bioguideId;
  const votes = getNationalCongressVotesByBioguide(bioguideId, politicianId)?.votes ?? [];
  let saidDidByTopic = buildPairableLinks(byTopicClean, votes);

  const topicDataForPrune: Record<string, TopicPositionData> = {};
  for (const topicId of new Set([...Object.keys(byTopicClean), ...Object.keys(saidDidByTopic)])) {
    topicDataForPrune[topicId] = {
      statements: byTopicClean[topicId]?.statements ?? [],
      platformPositions: byTopicClean[topicId]?.platformPositions,
      saidDidLinks: saidDidByTopic[topicId] ?? [],
    };
  }

  try {
    const priorSaidDid = JSON.parse(
      await readFile(path.join(profileDir, 'saidDid.json'), 'utf8'),
    ) as { byTopic: Record<string, SaidDidLinkEntry[]> };
    for (const [topicId, links] of Object.entries(priorSaidDid.byTopic ?? {})) {
      for (const link of links) {
        const key = `${topicId}:${link.billNumber}:${link.voteDate}`;
        const bucket = topicDataForPrune[topicId] ?? {
          statements: byTopicClean[topicId]?.statements ?? [],
          platformPositions: byTopicClean[topicId]?.platformPositions,
          saidDidLinks: [],
        };
        if (!topicDataForPrune[topicId]) topicDataForPrune[topicId] = bucket;
        const dup = (bucket.saidDidLinks ?? []).some(
          (l) => `${topicId}:${l.billNumber}:${l.voteDate}` === key,
        );
        if (!dup) bucket.saidDidLinks = [...(bucket.saidDidLinks ?? []), link];
      }
    }
  } catch {
    /* no prior saidDid.json */
  }

  saidDidByTopic = pruneSaidDidLinksByTopic(topicDataForPrune);

  await writeFile(
    path.join(profileDir, 'saidDid.json'),
    JSON.stringify({ bioguideId, byTopic: saidDidByTopic }, null, 2) + '\n',
  );

  const manifest = JSON.parse(await readFile(path.join(profileDir, 'manifest.json'), 'utf8')) as {
    categories: Record<string, string>;
  };
  const linkCount = Object.values(saidDidByTopic).flat().length;
  manifest.categories.saidDid = linkCount > 0 ? 'filled' : 'honest-gap';
  await writeFile(path.join(profileDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return linkCount;
}

async function reclassifyProfileMember(bioguideId: string): Promise<{ stmtCount: number; saidDidCount: number }> {
  const profileDir = path.join(profilesRoot, bioguideId);
  const existing = JSON.parse(await readFile(path.join(profileDir, 'statements.json'), 'utf8')) as {
    bioguideId: string;
    byTopic: Record<string, { statements: TopicStatementEntry[] }>;
    status?: 'none-in-range';
    note?: string;
  };
  const rebucketed = rebucketStatementsFromContent(existing.byTopic ?? {});
  const stmtCount = Object.values(rebucketed).reduce((n, t) => n + t.statements.length, 0);
  const payload: typeof existing = { bioguideId, byTopic: rebucketed };
  if (stmtCount === 0 && existing.status === 'none-in-range') {
    payload.status = existing.status;
    payload.note = existing.note;
  }
  await writeFile(path.join(profileDir, 'statements.json'), JSON.stringify(payload, null, 2) + '\n');
  const saidDidCount = await rebuildProfileSaidDid(bioguideId, rebucketed);
  return { stmtCount, saidDidCount };
}

function buildPairableLinks(
  byTopic: Record<string, { statements: TopicStatementEntry[]; platformPositions: PlatformPositionEntry[] }>,
  votes: VoteRecord[],
): Record<string, SaidDidLinkEntry[]> {
  const out: Record<string, SaidDidLinkEntry[]> = {};
  const seen = new Set<string>();
  for (const vote of votes) {
    const topicId = voteTopicId(vote);
    const bucket = byTopic[topicId];
    if (!bucket) continue;
    const hasSaid =
      bucket.statements.some((s) => s.tier === 'official' || s.tier === 'media' || s.tier === 'alleged') ||
      bucket.platformPositions.some((p) => {
        const text = p.text.toLowerCase();
        const bill = vote.billId.replace(/\s+/g, '').toLowerCase();
        return text.includes(bill.replace(/\./g, '')) || text.includes(vote.billTitle.toLowerCase().slice(0, 30));
      });
    if (!hasSaid) continue;
    const key = `${topicId}:${vote.billId}:${vote.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out[topicId] = out[topicId] ?? [];
    out[topicId].push({
      topicId,
      statedPositionDate: null,
      voteDate: vote.date,
      billTitle: vote.billTitle,
      billNumber: vote.billId,
      congressGovUrl: voteCongressGovUrl(vote),
      voteChoice: vote.vote,
      tier: 'official',
    });
  }
  return out;
}

async function applyCrecMember(
  bioguideId: string,
  topicBundle: Record<string, TopicPositionData> | undefined,
  crecSearchOk: boolean,
): Promise<{ stmtCount: number; saidDidCount: number }> {
  const profileDir = path.join(profilesRoot, bioguideId);
  const positionsFile = JSON.parse(
    await readFile(path.join(profileDir, 'positions.json'), 'utf8'),
  ) as { byTopic: Record<string, { platformPositions: PlatformPositionEntry[] }> };

  const byTopicStatements: Record<string, { statements: TopicStatementEntry[] }> = {};
  let totalCrec = 0;
  let totalOfficialCrec = 0;

  for (const bucket of RECORD_TOPIC_BUCKETS.filter((b) => b.id !== 'legislation')) {
    const topicId = bucket.id;
    const syncedTopic =
      topicBundle?.[topicId] ??
      Object.entries(topicBundle ?? {}).find(([k]) => normalizeTopicId(k) === topicId)?.[1];
    const fromSync = (syncedTopic?.statements ?? []).filter(isCollectibleStatement).map(stampVerbatim);
    totalOfficialCrec += fromSync.filter(isOfficialCrecFloorRemark).length;
    const existingPath = path.join(profileDir, 'statements.json');
    let existingOfficial: TopicStatementEntry[] = [];
    try {
      const existing = JSON.parse(await readFile(existingPath, 'utf8')) as {
        byTopic: Record<string, { statements: TopicStatementEntry[] }>;
      };
      existingOfficial = (existing.byTopic[topicId]?.statements ?? [])
        .filter(isCollectibleStatement)
        .map(stampVerbatim);
    } catch {
      /* fresh */
    }

    const merged: TopicStatementEntry[] = [...fromSync];
    for (const prior of existingOfficial) {
      if (merged.some((m) => m.url === prior.url || m.title === prior.title)) continue;
      merged.push(prior);
    }
    if (merged.length > 0) {
      byTopicStatements[topicId] = { statements: merged };
      totalCrec += merged.length;
    }
  }

  const stmtCount = Object.values(byTopicStatements).reduce((n, t) => n + t.statements.length, 0);

  const rebucketed = rebucketStatementsFromContent(byTopicStatements);
  const rebucketCount = Object.values(rebucketed).reduce((n, t) => n + t.statements.length, 0);

  const statementsPayload: {
    bioguideId: string;
    byTopic: Record<string, { statements: TopicStatementEntry[] }>;
    status?: 'none-in-range';
    note?: string;
  } = { bioguideId, byTopic: rebucketed };

  if (rebucketCount === 0 && crecSearchOk && stmtCount === 0) {
    statementsPayload.status = 'none-in-range';
    statementsPayload.note =
      'GovInfo CREC search completed across the 119th and 118th Congress windows; no verbatim floor-remark granules passed procedural filter.';
  }

  await writeFile(path.join(profileDir, 'statements.json'), JSON.stringify(statementsPayload, null, 2) + '\n');

  const saidDidCount = await rebuildProfileSaidDid(bioguideId, rebucketed);

  const manifest = JSON.parse(await readFile(path.join(profileDir, 'manifest.json'), 'utf8')) as {
    categories: Record<string, string>;
  };
  manifest.categories.statements =
    rebucketCount > 0
      ? 'filled'
      : statementsPayload.status === 'none-in-range'
        ? 'none-in-range'
        : 'honest-gap';
  await writeFile(path.join(profileDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  return { stmtCount: rebucketCount, saidDidCount };
}

async function applyNewsMember(bioguideId: string): Promise<number> {
  const items = await fetchGdeltNews(bioguideId);
  const profileDir = path.join(profilesRoot, bioguideId);
  await writeFile(
    path.join(profileDir, 'news.json'),
    JSON.stringify({ bioguideId, items }, null, 2) + '\n',
  );
  const manifest = JSON.parse(await readFile(path.join(profileDir, 'manifest.json'), 'utf8')) as {
    categories: Record<string, string>;
  };
  manifest.categories.news = items.length > 0 ? 'filled' : 'fetch-blocked';
  await writeFile(path.join(profileDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return items.length;
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  if (process.argv.includes('--reclassify-profiles')) {
    const onlyMembers = parseMembersArg(process.argv);
    const members = onlyMembers ?? [...CREC_MEMBERS];
    console.log('Reclassifying profile statements by content…');
    for (const bioguideId of members) {
      const result = await reclassifyProfileMember(bioguideId);
      console.log(`  ${bioguideId}: stmts=${result.stmtCount} saidDid=${result.saidDidCount}`);
    }
    console.log('\n── Depth table ──');
    for (const bioguideId of BATCH_ALL) {
      const p = path.join(profilesRoot, bioguideId);
      const st = JSON.parse(await readFile(path.join(p, 'statements.json'), 'utf8')) as {
        byTopic: Record<string, { statements: TopicStatementEntry[] }>;
        status?: string;
      };
      const sd = JSON.parse(await readFile(path.join(p, 'saidDid.json'), 'utf8')) as { byTopic: Record<string, SaidDidLinkEntry[]> };
      const stmtN = Object.values(st.byTopic).reduce((n, t) => n + t.statements.length, 0);
      const sdN = Object.values(sd.byTopic).flat().length;
      console.log(`${bioguideId} stmts=${stmtN}${st.status ? ` (${st.status})` : ''} saidDid=${sdN}`);
    }
    return;
  }

  const topicSnapshot = JSON.parse(await readFile(topicPositionsFile, 'utf8')) as {
    byBioguideId: Record<string, Record<string, TopicPositionData>>;
  };

  const onlyMembers = parseMembersArg(process.argv);
  const crecTargets = onlyMembers ?? [...CREC_MEMBERS];

  console.log('Applying CREC sync to migrated profiles…');
  for (const bioguideId of crecTargets) {
    const bundle = topicSnapshot.byBioguideId[bioguideId];
    if (!bundle) {
      console.warn(`  WARN ${bioguideId}: not in topicPositions.json — run sync:topic-positions first`);
      continue;
    }
    const hasCrec = Object.values(bundle).some((t) =>
      (t.statements ?? []).some((s) => s.tier === 'official' && /CREC-/i.test(s.url)),
    );
    const result = await applyCrecMember(bioguideId, bundle, true);
    console.log(`  ${bioguideId}: crecStatements=${result.stmtCount} saidDidLinks=${result.saidDidCount} (sync had crec=${hasCrec})`);
    delete topicSnapshot.byBioguideId[bioguideId];
  }

  await writeFile(topicPositionsFile, JSON.stringify(topicSnapshot, null, 2) + '\n');
  console.log('Removed CREC batch members from topicPositions mega-bundle');

  console.log('Fetching GDELT news for Warren/Cruz…');
  for (const bioguideId of NEWS_MEMBERS) {
    await sleep(6000);
    const count = await applyNewsMember(bioguideId);
    console.log(`  ${bioguideId}: news=${count}`);
  }

  console.log('\n── Depth table ──');
  for (const bioguideId of BATCH_ALL) {
    const p = path.join(profilesRoot, bioguideId);
    const st = JSON.parse(await readFile(path.join(p, 'statements.json'), 'utf8')) as {
      byTopic: Record<string, { statements: TopicStatementEntry[] }>;
      status?: string;
    };
    const pos = JSON.parse(await readFile(path.join(p, 'positions.json'), 'utf8')) as {
      byTopic: Record<string, { platformPositions: PlatformPositionEntry[] }>;
    };
    const sd = JSON.parse(await readFile(path.join(p, 'saidDid.json'), 'utf8')) as { byTopic: Record<string, SaidDidLinkEntry[]> };
    const v = JSON.parse(await readFile(path.join(p, 'votes.json'), 'utf8')) as { votes: unknown[] };
    const n = JSON.parse(await readFile(path.join(p, 'news.json'), 'utf8')) as { items: unknown[] };
    const stmtN = Object.values(st.byTopic).reduce((n, t) => n + t.statements.length, 0);
    const posN = Object.values(pos.byTopic).reduce((n, t) => n + t.platformPositions.length, 0);
    const sdN = Object.values(sd.byTopic).flat().length;
    console.log(
      `${bioguideId} stmts=${stmtN}${st.status ? ` (${st.status})` : ''} pos=${posN} votes=${v.votes.length} saidDid=${sdN} news=${n.items.length}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
