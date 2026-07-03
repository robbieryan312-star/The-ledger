/**
 * reprocess-profiles.ts — re-run current parsers/validators over already-committed profile
 * JSON, NO network calls. Standard backfill step whenever parsing/classification logic
 * changes (displaySummary opener-stripping, topic-keyword precision, HTML-entity decoding,
 * vote-restatement purge). Idempotent — running twice produces the same output.
 *
 * Scope of this pass (see PROGRESS.md / task brief for full spec):
 *  - Re-derive `displayText` on every statement via `clean()`.
 *  - Re-classify statement topic buckets via current `classifyTextToRecordTopicId`.
 *  - Purge vote-restatement entries from positions.json `platformPositions`.
 *  - Decode HTML entities in positions.json and statements.json text fields.
 *  - Best-effort retrim already-stored excerpts to their last sentence boundary
 *    (raw ungtruncated CREC HTML is not cached on disk, so this operates on the
 *    already-truncated stored text — an honest best-effort, not a re-fetch).
 *  - Rebuild saidDid.json via `pruneSaidDidLinksByTopic` so a Said side that only existed
 *    through a now-purged vote-restatement platform position is dropped, not left dangling.
 *  - Refresh manifest.json `positions`/`saidDid` categories (`filled`/`honest-gap`) to match.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean, segmentSentences } from '../lib/data/displaySummary';
import { decodeHtmlEntities, hasUndecodedHtmlEntity } from '../lib/data/htmlEntities';
import { classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import { isVoteRestatementSaid } from '../lib/data/sourceIntegrity';
import { pruneSaidDidLinksByTopic } from '../lib/data/buildSaidDidDiffs';
import type { TopicPositionData } from '../lib/data/topicPositions';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');

const MIGRATED_PROFILE_BIOGUIDES = ['S000033', 'O000172', 'M000355', 'M001184', 'W000817', 'C001098'];

interface StatementEntry {
  title: string;
  date: string;
  url: string;
  tier: string;
  topicId: string;
  displayText?: string;
  verbatim?: boolean;
  outlet?: string;
  corroboratingSources?: unknown[];
}

interface StatementsFile {
  bioguideId: string;
  byTopic: Record<string, { statements: StatementEntry[] }>;
}

interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: string;
  asOf: string;
}

interface PositionsFile {
  bioguideId: string;
  byTopic: Record<string, { platformPositions?: PlatformPositionEntry[]; statedPosition?: string }>;
}

interface SaidDidLinkEntry {
  topicId?: string;
  statedPositionDate: string | null;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: string;
  tier: 'official';
}

interface SaidDidFile {
  bioguideId: string;
  byTopic: Record<string, SaidDidLinkEntry[]>;
}

/**
 * Best-effort retrim of ALREADY-STORED text that was hard-truncated mid-word/mid-sentence
 * by the old `.slice(0, 600)` bug. Drops a trailing incomplete sentence when at least one
 * complete sentence precedes it. When the ENTIRE stored text has no sentence-ending
 * punctuation at all (truncated before the first period), leaves it unchanged — an honestly
 * short excerpt beats fabricating an ending. Operates only on the stored (already-truncated)
 * text; raw un-truncated CREC HTML is not cached on disk, so this cannot recover lost text.
 */
function retrimIncompleteTail(text: string): string {
  const trimmed = text.trim();
  if (/[.!?"\u201d]$/.test(trimmed)) return trimmed;
  const sentences = segmentSentences(trimmed);
  const complete = sentences.filter((s) => /[.!?"\u201d]$/.test(s));
  if (complete.length === 0) return trimmed;
  return complete.join(' ').trim();
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function reprocessStatements(data: StatementsFile): { data: StatementsFile; reclassified: number; retrimmed: number } {
  const newByTopic: Record<string, { statements: StatementEntry[] }> = {};
  let reclassified = 0;
  let retrimmed = 0;

  const allStatements: StatementEntry[] = [];
  for (const topic of Object.values(data.byTopic)) {
    allStatements.push(...topic.statements);
  }

  for (const stmt of allStatements) {
    const decodedTitle = decodeHtmlEntities(stmt.title);
    const retrimmedTitle = retrimIncompleteTail(decodedTitle);
    if (retrimmedTitle !== decodedTitle) retrimmed += 1;
    stmt.title = retrimmedTitle;
    stmt.displayText = clean(stmt.title);

    // Only official CREC-sourced floor statements are re-classified here — media/alleged
    // statements keep the topic they were manually filed under during collection review.
    if (stmt.tier === 'official' && /\/CREC-/i.test(stmt.url)) {
      const newTopicId = classifyTextToRecordTopicId(stmt.title);
      if (newTopicId !== stmt.topicId) {
        // May land on the honest `legislation` catch-all rather than a mis-matched bucket —
        // that is a correct outcome, not a failure to classify.
        reclassified += 1;
        stmt.topicId = newTopicId;
      }
    }

    const bucket = (newByTopic[stmt.topicId] ??= { statements: [] });
    bucket.statements.push(stmt);
  }

  return { data: { ...data, byTopic: newByTopic }, reclassified, retrimmed };
}

function reprocessPositions(data: PositionsFile): { data: PositionsFile; purged: number; before: number } {
  let purged = 0;
  let before = 0;
  const newByTopic: PositionsFile['byTopic'] = {};

  for (const [topicId, topic] of Object.entries(data.byTopic)) {
    const originalPlatform = topic.platformPositions ?? [];
    before += originalPlatform.length;
    const kept = originalPlatform
      .filter((p) => !isVoteRestatementSaid(p.text))
      .map((p) => ({ ...p, text: decodeHtmlEntities(p.text) }));
    purged += originalPlatform.length - kept.length;

    newByTopic[topicId] = {
      ...topic,
      statedPosition: topic.statedPosition ? decodeHtmlEntities(topic.statedPosition) : topic.statedPosition,
      platformPositions: kept,
    };
  }

  return { data: { ...data, byTopic: newByTopic }, purged, before };
}

async function main(): Promise<void> {
  console.log('reprocess-profiles: no network calls, operating only on committed JSON\n');

  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    const dir = path.join(PROFILES_DIR, bioguideId);
    const statementsFile = path.join(dir, 'statements.json');
    const positionsFile = path.join(dir, 'positions.json');

    const statementsData = await readJson<StatementsFile>(statementsFile);
    const { data: newStatements, reclassified, retrimmed } = reprocessStatements(statementsData);
    await writeJson(statementsFile, newStatements);

    const positionsData = await readJson<PositionsFile>(positionsFile);
    const { data: newPositions, purged, before } = reprocessPositions(positionsData);
    await writeJson(positionsFile, newPositions);

    // Rebuild saidDid.json against the reprocessed statements + purged positions so a Said
    // side that only existed via a now-purged vote-restatement platform position is dropped
    // rather than left dangling/unresolvable.
    const saidDidFile = path.join(dir, 'saidDid.json');
    const saidDidData = await readJson<SaidDidFile>(saidDidFile);
    const byTopic: Record<string, TopicPositionData> = {};
    const allTopicIds = new Set([
      ...Object.keys(newStatements.byTopic),
      ...Object.keys(newPositions.byTopic),
      ...Object.keys(saidDidData.byTopic),
    ]);
    for (const topicId of allTopicIds) {
      byTopic[topicId] = {
        statements: (newStatements.byTopic[topicId]?.statements ?? []) as TopicPositionData['statements'],
        platformPositions: newPositions.byTopic[topicId]?.platformPositions as TopicPositionData['platformPositions'],
        statedPosition: newPositions.byTopic[topicId]?.statedPosition,
        saidDidLinks: (saidDidData.byTopic[topicId] ?? []) as TopicPositionData['saidDidLinks'],
      };
    }
    const beforeLinkCount = Object.values(saidDidData.byTopic).reduce((n, arr) => n + arr.length, 0);
    const prunedByTopic = pruneSaidDidLinksByTopic(byTopic);
    const afterLinkCount = Object.values(prunedByTopic).reduce((n, arr) => n + arr.length, 0);
    await writeJson(saidDidFile, { ...saidDidData, byTopic: prunedByTopic });

    // Verify: no leftover undecoded entities in what we just wrote.
    const remainingEntities = JSON.stringify(newPositions).match(/&#\d+;|&#x[0-9a-f]+;|&(?:quot|lt|gt|nbsp|amp|apos);/gi)?.length ?? 0;

    console.log(
      `${bioguideId}: statements reclassified=${reclassified} retrimmed=${retrimmed} | ` +
        `positions platformPositions purged=${purged}/${before} | ` +
        `saidDid links ${beforeLinkCount} -> ${afterLinkCount} | remaining html entities=${remainingEntities}`,
    );

    const manifestFile = path.join(dir, 'manifest.json');
    const manifest = await readJson<{ categories: Record<string, string> }>(manifestFile);
    const hasAnyPosition = Object.values(newPositions.byTopic).some(
      (t) => (t.platformPositions?.length ?? 0) > 0 || Boolean(t.statedPosition?.trim()),
    );
    manifest.categories.positions = hasAnyPosition ? 'filled' : 'honest-gap';
    manifest.categories.saidDid = afterLinkCount > 0 ? 'filled' : 'honest-gap';
    await writeJson(manifestFile, manifest);
  }

  console.log('\nDone. saidDid.json rebuilt via pruneSaidDidLinksByTopic; manifest.json positions/saidDid categories refreshed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Re-export for tests.
export { reprocessStatements, reprocessPositions, hasUndecodedHtmlEntity };
