/**
 * Re-run current parsers/validators over committed profile JSON — no network calls.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean, segmentSentences } from '../../lib/data/displaySummary';
import { decodeHtmlEntities } from '../../lib/data/htmlEntities';
import { classifyTextToRecordTopicId } from '../../lib/data/profileRecordByTopic';
import { isDisqualifiedPlatformPosition } from '../../lib/data/sourceIntegrity';
import { pruneSaidDidLinksByTopic } from '../../lib/data/buildSaidDidDiffs';
import type { TopicPositionData } from '../../lib/data/topicPositions';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROFILES_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');

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

export function reprocessStatements(data: StatementsFile): { data: StatementsFile; reclassified: number; retrimmed: number } {
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

    if (stmt.tier === 'official' && /\/CREC-/i.test(stmt.url)) {
      const newTopicId = classifyTextToRecordTopicId(stmt.title);
      if (newTopicId !== stmt.topicId) {
        reclassified += 1;
        stmt.topicId = newTopicId;
      }
    }

    const bucket = (newByTopic[stmt.topicId] ??= { statements: [] });
    bucket.statements.push(stmt);
  }

  return { data: { ...data, byTopic: newByTopic }, reclassified, retrimmed };
}

export function reprocessPositions(data: PositionsFile): { data: PositionsFile; purged: number; before: number } {
  let purged = 0;
  let before = 0;
  const newByTopic: PositionsFile['byTopic'] = {};

  for (const [topicId, topic] of Object.entries(data.byTopic)) {
    const originalPlatform = topic.platformPositions ?? [];
    before += originalPlatform.length;
    const kept = originalPlatform
      .filter((p) => !isDisqualifiedPlatformPosition(p.text))
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

export interface ReprocessStats {
  bioguideId: string;
  reclassified: number;
  retrimmed: number;
  purged: number;
  positionsBefore: number;
  saidDidBefore: number;
  saidDidAfter: number;
}

export async function reprocessMember(bioguideId: string): Promise<ReprocessStats> {
  const dir = path.join(PROFILES_DIR, bioguideId);
  const statementsFile = path.join(dir, 'statements.json');
  const positionsFile = path.join(dir, 'positions.json');

  const statementsData = await readJson<StatementsFile>(statementsFile);
  const { data: newStatements, reclassified, retrimmed } = reprocessStatements(statementsData);
  await writeJson(statementsFile, newStatements);

  const positionsData = await readJson<PositionsFile>(positionsFile);
  const { data: newPositions, purged, before } = reprocessPositions(positionsData);
  await writeJson(positionsFile, newPositions);

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

  const manifestFile = path.join(dir, 'manifest.json');
  const manifest = await readJson<{ categories: Record<string, string> }>(manifestFile);
  const hasAnyPosition = Object.values(newPositions.byTopic).some(
    (t) => (t.platformPositions?.length ?? 0) > 0 || Boolean(t.statedPosition?.trim()),
  );
  manifest.categories.positions = hasAnyPosition ? 'filled' : 'honest-gap';
  manifest.categories.saidDid = afterLinkCount > 0 ? 'filled' : 'honest-gap';
  await writeJson(manifestFile, manifest);

  return {
    bioguideId,
    reclassified,
    retrimmed,
    purged,
    positionsBefore: before,
    saidDidBefore: beforeLinkCount,
    saidDidAfter: afterLinkCount,
  };
}
