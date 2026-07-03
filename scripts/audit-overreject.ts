/**
 * Over-rejection audit (Phase 17b §6). DIAGNOSTIC ONLY — does not write topicPositions.json.
 *
 * For each target member, replays the CREC extraction verbatim (same helpers as
 * sync-topic-positions.ts) and prints, for every one of the up-to-12 granules:
 *   - granule title + date
 *   - skip-procedural-title? / HTML fetched? / speaker present?
 *   - the extracted excerpt (or the exact reason there is none)
 *   - whether isProceduralCrecText() rejected it and WHICH rule fired
 *   - the mapped topicId (or "no topic")
 *   - final disposition (added / deduped / capped / dropped)
 *
 * Run: npx tsx scripts/audit-overreject.ts 2>&1 | tee /tmp/ledger-overreject-audit.log
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import { isProceduralCrecText, matchedProceduralRule } from './lib/crecProceduralFilter';
import { crecFloorSpeechOpenerRegex } from './lib/crecOpener';

config({ path: '.env.local' });

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGISLATORS_FILE = path.join(projectRoot, 'lib/data/generated/currentLegislators.json');
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_CREC_STATEMENTS_PER_MEMBER = 12;

const TARGETS = process.env.AUDIT_IDS
  ? process.env.AUDIT_IDS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['K000377', 'S001217', 'R000600', 'J000294', 'C001098'];

interface LegislatorRow {
  bioguideId: string;
  name: string;
  lastName: string;
  chamber: string;
}

interface GovInfoSearchResult {
  title?: string;
  packageId?: string;
  granuleId?: string;
  dateIssued?: string;
}

// ---- verbatim helpers copied from sync-topic-positions.ts ----
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
/** Gender-agnostic GovInfo CREC search query, mirrors sync-topic-positions.ts crecSearchQuery. */
function crecSearchQuery(leg: LegislatorRow): string {
  const surname = leg.lastName.toUpperCase();
  return `("Mr. ${surname}" OR "Ms. ${surname}" OR "Mrs. ${surname}" OR "Miss ${surname}")`;
}
/** Honorific-agnostic presence token: the bare uppercase surname shared by every OR form. */
function crecSpeakerHay(leg: LegislatorRow): string {
  return leg.lastName.toUpperCase();
}
function crecMemberLastName(leg: LegislatorRow): string {
  return leg.lastName.toUpperCase();
}
function mapCrecTextToTopic(text: string): string | null {
  const topicId = classifyTextToRecordTopicId(text);
  return topicId === 'legislation' ? null : topicId;
}

/** Instrumented copy of extractCrecSpeechExcerpt that returns the reason on failure. */
function extractExcerptDiag(plainText: string, leg: LegislatorRow): { excerpt: string | null; reason: string } {
  const lastName = crecMemberLastName(leg);
  const opener = crecFloorSpeechOpenerRegex(lastName);
  const match = opener.exec(plainText);
  if (!match || match.index === undefined) {
    // Show what honorific actually precedes the surname, to detect Mr.-only opener bugs.
    const anyOpener = new RegExp(`(Mr|Mrs|Ms|Miss|Madam)\\.?\\s+${lastName}\\.`, 'i').exec(plainText);
    const near = anyOpener ? plainText.slice(anyOpener.index, anyOpener.index + 60) : '(surname+addr-to-chair not found)';
    return { excerpt: null, reason: `no "(Mr|Ms|Mrs|Miss). ${lastName}. Mr./Madam President/Speaker" opener [nearby: ${near}]` };
  }
  let excerpt = plainText.slice(match.index);
  const nextSpeaker = excerpt.slice(40).search(/\bMr\.|Ms\.|Mrs\.|The PRESID|The SPEAK/i);
  if (nextSpeaker > 80) excerpt = excerpt.slice(0, 40 + nextSpeaker);
  excerpt = excerpt.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (excerpt.length < 80) return { excerpt: null, reason: `excerpt <80 chars ("${excerpt}")` };
  if (isProceduralCrecText(excerpt)) return { excerpt: null, reason: `procedural rule: ${matchedProceduralRule(excerpt)}` };
  if (!opener.test(excerpt)) return { excerpt: null, reason: 'opener lost after trim' };
  return { excerpt: excerpt.slice(0, 600), reason: 'accepted' };
}

const CREC_PROCEDURAL_TITLE_RE =
  /^(text of (the )?(senate |house )?amendments?|amendments? submitted|submission of .*resolutions?|additional cosponsors|additional sponsors|public bills and resolutions|introduction of bills|reports? of committees?|executive communications?|petitions and memorials|enrolled bills?( and joint resolutions)? signed|constitutional authority statement|daily digest)\b/i;
function isProceduralCrecTitle(title: string): boolean {
  return CREC_PROCEDURAL_TITLE_RE.test(title.trim());
}

async function auditMember(leg: LegislatorRow, apiKey: string): Promise<void> {
  const searchQuery = crecSearchQuery(leg);
  const speakerNeedle = crecSpeakerHay(leg).toLowerCase().replace(/\./g, '');
  console.log(`\n================ ${leg.bioguideId} (${leg.name}) — chamber=${leg.chamber} searchQuery=${searchQuery} ================`);
  const searchRes = await fetch(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `collection:CREC AND congress:119 AND ${searchQuery}`,
      pageSize: MAX_CREC_STATEMENTS_PER_MEMBER,
      offsetMark: '*',
      sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!searchRes.ok) {
    console.log(`  SEARCH FAILED http ${searchRes.status} — transient, not "no speeches"`);
    return;
  }
  const searchData = (await searchRes.json()) as { results?: GovInfoSearchResult[] };
  const results = (searchData.results ?? []).filter((r) => r.granuleId && r.packageId);
  console.log(`  search returned ${results.length} granules`);
  const byTopic = new Map<string, string[]>();
  let accepted = 0;

  for (const [i, result] of results.entries()) {
    const title = result.title ?? '';
    const date = (result.dateIssued ?? '').slice(0, 10);
    console.log(`\n  [${i + 1}/${results.length}] "${title}" (${date})`);
    if (isProceduralCrecTitle(title)) {
      console.log('    -> SKIPPED (procedural title, no HTML fetch)  [CORRECT: clerk section header]');
      continue;
    }
    let plain = '';
    try {
      const textRes = await fetch(
        `https://api.govinfo.gov/packages/${result.packageId}/granules/${result.granuleId}/htm?api_key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
      );
      if (!textRes.ok) { console.log(`    -> HTML fetch http ${textRes.status} (skip)`); continue; }
      plain = stripHtml(await textRes.text());
    } catch (e) {
      console.log(`    -> HTML fetch error: ${e instanceof Error ? e.message : e} (skip)`);
      continue;
    }
    const speakerHay = plain.toLowerCase().replace(/\./g, '');
    if (!speakerHay.includes(speakerNeedle)) {
      console.log('    -> speaker string not present in granule text (skip)');
      continue;
    }
    const { excerpt, reason } = extractExcerptDiag(plain, leg);
    if (!excerpt) {
      console.log(`    -> NO EXCERPT (${reason})`);
      continue;
    }
    const topicId = mapCrecTextToTopic(`${title} ${excerpt}`);
    console.log(`    excerpt: "${excerpt.slice(0, 240)}"`);
    console.log(`    procedural? ${isProceduralCrecText(excerpt) ? matchedProceduralRule(excerpt) : 'NO'} | topicId: ${topicId ?? 'NONE (legislation/unmapped)'}`);
    if (!topicId) { console.log('    -> DROPPED (no topic)'); continue; }
    const existing = byTopic.get(topicId) ?? [];
    if (existing.length >= 2) { console.log('    -> DROPPED (topic already has 2)'); continue; }
    existing.push(excerpt);
    byTopic.set(topicId, existing);
    accepted += 1;
    console.log('    -> ACCEPTED as a statement');
  }
  console.log(`\n  === ${leg.bioguideId}: ${accepted} statement(s) would be kept ===`);
}

async function main(): Promise<void> {
  const apiKey = process.env.GOVINFO_API_KEY ?? '';
  if (!apiKey) { console.error('GOVINFO_API_KEY missing'); process.exit(1); }
  const raw = JSON.parse(readFileSync(LEGISLATORS_FILE, 'utf8'));
  const arr: any[] = Array.isArray(raw) ? raw : (raw.legislators ?? raw.members ?? []);
  const byId = new Map<string, LegislatorRow>();
  for (const l of arr) {
    const id = l.bioguideId ?? l.bioguide ?? l.id;
    if (id) byId.set(id, { bioguideId: id, name: l.name, lastName: l.lastName, chamber: l.chamber });
  }
  for (const id of TARGETS) {
    const leg = byId.get(id);
    if (!leg) { console.log(`\n${id}: NOT FOUND in legislators`); continue; }
    try {
      await auditMember(leg, apiKey);
    } catch (e) {
      console.log(`\n${id}: audit error ${e instanceof Error ? e.message : e}`);
    }
  }
}

main();
