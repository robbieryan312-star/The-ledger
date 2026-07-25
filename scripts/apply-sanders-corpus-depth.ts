/**
 * M-CORPUS-DEPTH apply — S000033 only.
 * Refreshes votes.json from national snapshot, unions statements without wipe,
 * rebuilds saidDid.json via buildCrecSaidDidLinks, syncs manifest.
 * Does NOT touch controversies, endorsements, finance, news, trades, positions.
 *
 * Run: npx tsx scripts/apply-sanders-corpus-depth.ts
 * Prerequisite: npm run sync:votes-national -- --members S000033 --full --full-depth
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPoliticianByBioguide } from '../lib/data/allPoliticians';
import { getNationalCongressVotesByBioguide } from '../lib/data/nationalCongressVotes';
import {
  buildCrecSaidDidLinks,
  crecUrlStem,
  MAX_SAID_DID_LINKS_PER_MEMBER,
} from '../lib/data/saidDidVoteContext';
import { stripCrecFloorOpener } from '../lib/data/crecDisplayText';
import type { TopicStatementEntry } from '../lib/data/topicPositions';
import { syncProfileManifestFromDisk } from './lib/profileManifestSync';
import { isProceduralCrecText } from './lib/crecProceduralFilter';

const BIOGUIDE = 'S000033';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profileDir = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles', BIOGUIDE);
const topicPositionsPath = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');

function cleanStatement(s: TopicStatementEntry): TopicStatementEntry | null {
  if (s.tier === 'official' && /\/CREC-/i.test(s.url ?? '')) {
    if (isProceduralCrecText(s.title ?? '')) return null;
  }
  if (s.tier === 'official' && /\/CREC-/i.test(s.url ?? '') && !s.displayText) {
    return { ...s, displayText: stripCrecFloorOpener(s.title), verbatim: s.verbatim ?? true };
  }
  return s;
}

function mergeByTopic(
  ...sources: Array<Record<string, { statements?: TopicStatementEntry[] }>>
): Record<string, { statements: TopicStatementEntry[] }> {
  const byTopic: Record<string, { statements: TopicStatementEntry[] }> = {};
  const stems = new Set<string>();
  const titleKeys = new Set<string>();

  for (const source of sources) {
    for (const [topicId, data] of Object.entries(source)) {
      for (const raw of data.statements ?? []) {
        const cleaned = cleanStatement(structuredClone(raw));
        if (!cleaned) continue;
        const stem = crecUrlStem(cleaned.url);
        const titleKey = (cleaned.title ?? '').trim().toLowerCase();
        if (stem && stems.has(stem)) continue;
        if (titleKey && titleKeys.has(titleKey)) continue;
        if (stem) stems.add(stem);
        if (titleKey) titleKeys.add(titleKey);
        byTopic[topicId] = byTopic[topicId] ?? { statements: [] };
        byTopic[topicId].statements.push({ ...cleaned, topicId: cleaned.topicId || topicId });
      }
    }
  }
  return byTopic;
}

async function main(): Promise<void> {
  const politician = getPoliticianByBioguide(BIOGUIDE);
  const politicianId = politician?.id ?? 'bernie-sanders';
  const nationalVotes = getNationalCongressVotesByBioguide(BIOGUIDE, politicianId);
  if (!nationalVotes?.votes.length) {
    throw new Error(`${BIOGUIDE}: no national votes — run sync:votes-national --full-depth first`);
  }

  const votesPayload = {
    bioguideId: BIOGUIDE,
    politicianId,
    chamber: nationalVotes.chamber,
    votes: nationalVotes.votes,
    asOf: nationalVotes.asOf,
    source: nationalVotes.source,
  };
  await writeFile(path.join(profileDir, 'votes.json'), `${JSON.stringify(votesPayload, null, 2)}\n`);

  let memberTopics: Record<string, { statements?: TopicStatementEntry[] }> = {};
  try {
    const topicSnapshot = JSON.parse(await readFile(topicPositionsPath, 'utf8')) as {
      byBioguideId?: Record<string, Record<string, { statements?: TopicStatementEntry[] }>>;
    };
    memberTopics = topicSnapshot.byBioguideId?.[BIOGUIDE] ?? {};
  } catch {
    console.warn(`${BIOGUIDE}: topicPositions.json missing/unreadable — unioning prior statements only`);
  }

  let priorByTopic: Record<string, { statements?: TopicStatementEntry[] }> = {};
  try {
    const prior = JSON.parse(await readFile(path.join(profileDir, 'statements.json'), 'utf8')) as {
      byTopic?: Record<string, { statements?: TopicStatementEntry[] }>;
    };
    priorByTopic = prior.byTopic ?? {};
  } catch {
    /* no prior */
  }

  // Fresh sync first (may be empty if CREC key missing), then prior (FAILURE≠ABSENCE).
  const byTopic = mergeByTopic(memberTopics, priorByTopic);
  await writeFile(
    path.join(profileDir, 'statements.json'),
    `${JSON.stringify({ bioguideId: BIOGUIDE, byTopic }, null, 2)}\n`,
  );

  const saidDidByTopic = buildCrecSaidDidLinks(byTopic, nationalVotes.votes);
  const pairCount = Object.values(saidDidByTopic).reduce((n, arr) => n + arr.length, 0);
  const crecSaidCount = Object.values(byTopic).reduce(
    (n, t) =>
      n +
      t.statements.filter(
        (s) =>
          s.tier === 'official' &&
          /\/CREC-/i.test(s.url ?? '') &&
          /^(Mr\.|Madam)\s+[A-Z]/.test((s.title ?? '').trim()) &&
          !isProceduralCrecText(s.title ?? ''),
      ).length,
    0,
  );
  const honestGapNote =
    pairCount >= MAX_SAID_DID_LINKS_PER_MEMBER
      ? undefined
      : `${pairCount} of ${MAX_SAID_DID_LINKS_PER_MEMBER} verified CREC floor-speech↔roll-call pairs; remainder honest-gap — ${crecSaidCount} CREC Said(s) after Said-vs-procedural + URL-stem dedup; unmatched topics lack subject-overlapping Did in the current roll-call corpus (no fabrication).`;

  const saidDidPayload: Record<string, unknown> = {
    bioguideId: BIOGUIDE,
    pairCount,
    pairTarget: MAX_SAID_DID_LINKS_PER_MEMBER,
    status: pairCount >= MAX_SAID_DID_LINKS_PER_MEMBER ? 'filled' : pairCount > 0 ? 'partial' : 'honest-gap',
    byTopic: saidDidByTopic,
  };
  if (honestGapNote) saidDidPayload.honestGapNote = honestGapNote;

  await writeFile(path.join(profileDir, 'saidDid.json'), `${JSON.stringify(saidDidPayload, null, 2)}\n`);

  await syncProfileManifestFromDisk(BIOGUIDE);

  const stmtCount = Object.values(byTopic).reduce((n, t) => n + t.statements.length, 0);
  const crecCount = Object.values(byTopic).reduce(
    (n, t) => n + t.statements.filter((s) => /\/CREC-/i.test(s.url ?? '')).length,
    0,
  );
  const congressCounts: Record<string, number> = {};
  for (const v of nationalVotes.votes) {
    const m = v.id.match(/-s(\d+)-/);
    if (m) congressCounts[m[1]] = (congressCounts[m[1]] ?? 0) + 1;
  }
  console.log(
    `${BIOGUIDE}: votes=${nationalVotes.votes.length} congresses=${JSON.stringify(congressCounts)} statements=${stmtCount} (crec=${crecCount}) saidDid=${pairCount}/${MAX_SAID_DID_LINKS_PER_MEMBER}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
