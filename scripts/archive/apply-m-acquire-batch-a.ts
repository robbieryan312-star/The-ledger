/**
 * M-ACQUIRE BATCH A apply — S000033 only.
 * Updates votes / statements / saidDid / legislation from national + topicPositions + member deep.
 * Unions prior profile CREC with fresh sync (FAILURE≠ABSENCE).
 * Does NOT touch trades, news, controversies, endorsements, finance, positions, orgVoteLinks.
 *
 * Run: npx tsx scripts/apply-m-acquire-batch-a.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPoliticianByBioguide } from '../../lib/data/allPoliticians';
import { getNationalCongressVotesByBioguide } from '../../lib/data/nationalCongressVotes';
import {
  buildCrecSaidDidLinks,
  crecUrlStem,
  MAX_SAID_DID_LINKS_PER_MEMBER,
} from '../../lib/data/saidDidVoteContext';
import { stripCrecFloorOpener } from '../../lib/data/crecDisplayText';
import type { TopicStatementEntry } from '../../lib/data/topicPositions';
import { syncProfileManifestFromDisk } from '../lib/profileManifestSync';
import { isProceduralCrecText } from '../lib/crecProceduralFilter';
import { isCeremonialCrecRemark } from '../../lib/ceremonialCrecFilter';

const BIOGUIDE = 'S000033';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profileDir = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles', BIOGUIDE);
const topicPositionsPath = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');
const memberDeepPath = path.join(projectRoot, 'lib', 'data', 'generated', 'members', `${BIOGUIDE}.json`);

function cleanStatement(s: TopicStatementEntry): TopicStatementEntry | null {
  if (s.tier === 'official' && /\/CREC-/i.test(s.url ?? '')) {
    if (isProceduralCrecText(s.title ?? '')) return null;
    if (isCeremonialCrecRemark(s.title ?? '')) return null;
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

  const topicSnapshot = JSON.parse(await readFile(topicPositionsPath, 'utf8')) as {
    byBioguideId?: Record<string, Record<string, { statements?: TopicStatementEntry[] }>>;
  };
  const memberTopics = topicSnapshot.byBioguideId?.[BIOGUIDE];
  if (!memberTopics) {
    throw new Error(`${BIOGUIDE}: missing from topicPositions.json — run sync:topic-positions first`);
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

  // Fresh sync first, then prior CREC (FAILURE≠ABSENCE) — dedupe by URL stem / title.
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

  const memberDeep = JSON.parse(await readFile(memberDeepPath, 'utf8')) as {
    meta?: Record<string, unknown>;
  };
  await writeFile(
    path.join(profileDir, 'legislation.json'),
    `${JSON.stringify(
      {
        bioguideId: BIOGUIDE,
        status: 'filled',
        sourcePath: `lib/data/generated/members/${BIOGUIDE}.json`,
        meta: memberDeep.meta ?? null,
      },
      null,
      2,
    )}\n`,
  );

  await syncProfileManifestFromDisk(BIOGUIDE);

  const stmtCount = Object.values(byTopic).reduce((n, t) => n + t.statements.length, 0);
  const crecCount = Object.values(byTopic).reduce(
    (n, t) => n + t.statements.filter((s) => /\/CREC-/i.test(s.url ?? '')).length,
    0,
  );
  console.log(
    `${BIOGUIDE}: votes=${nationalVotes.votes.length} statements=${stmtCount} (crec=${crecCount}) saidDid=${pairCount}/${MAX_SAID_DID_LINKS_PER_MEMBER} legislation=meta-ok`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
