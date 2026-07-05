/**
 * reprocess-topic-positions-bundle.ts — sanitize topicPositions.json mega-bundle in place.
 * No network. Drops vote-restatements, bio-boilerplate, site furniture, third-party/event
 * narration; decodes HTML entities; re-classifies official CREC statements.
 *
 * Run: npx tsx scripts/reprocess-topic-positions-bundle.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean, segmentSentences } from '../lib/data/displaySummary';
import { decodeHtmlEntities } from '../lib/data/htmlEntities';
import { classifyTextToRecordTopicId } from '../lib/data/profileRecordByTopic';
import {
  isBioBoilerplate,
  isDisqualifiedPlatformPosition,
  isEventNarration,
  isSiteFurniture,
  isThirdPartyCharacterization,
  isVoteRestatementSaid,
} from '../lib/data/sourceIntegrity';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');

interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: string;
  asOf: string;
}

interface StatementEntry {
  title: string;
  date: string;
  url: string;
  tier: string;
  topicId: string;
  displayText?: string;
  verbatim?: boolean;
  outlet?: string;
}

interface TopicData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statements: StatementEntry[];
  saidDidLinks: unknown[];
}

interface BundleSnapshot {
  meta: Record<string, unknown>;
  byBioguideId: Record<string, Record<string, TopicData>>;
}

function dropClass(text: string): string | null {
  if (isVoteRestatementSaid(text)) return 'vote-restatement';
  if (isThirdPartyCharacterization(text)) return 'third-party';
  if (isEventNarration(text)) return 'event-narration';
  if (isBioBoilerplate(text)) return 'bio-boilerplate';
  if (isSiteFurniture(text)) return 'site-furniture';
  return null;
}

function retrimIncompleteTail(text: string): string {
  const trimmed = text.trim();
  if (/[.!?"\u201d]$/.test(trimmed)) return trimmed;
  const sentences = segmentSentences(trimmed);
  const complete = sentences.filter((s) => /[.!?"\u201d]$/.test(s));
  if (complete.length === 0) return trimmed;
  return complete.join(' ').trim();
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readFile(BUNDLE_FILE, 'utf8')) as BundleSnapshot;
  const dropCounts: Record<string, number> = {
    'vote-restatement': 0,
    'third-party': 0,
    'event-narration': 0,
    'bio-boilerplate': 0,
    'site-furniture': 0,
  };
  let membersAffected = new Set<string>();
  let positionsBefore = 0;
  let positionsAfter = 0;
  let reclassified = 0;

  for (const [bioguideId, topics] of Object.entries(snapshot.byBioguideId)) {
    const newTopics: Record<string, TopicData> = {};
    const allStatements: StatementEntry[] = [];

    for (const topic of Object.values(topics)) {
      for (const stmt of topic.statements ?? []) {
        allStatements.push(stmt);
      }
    }

    const statementsByTopic: Record<string, StatementEntry[]> = {};
    for (const stmt of allStatements) {
      const title = retrimIncompleteTail(decodeHtmlEntities(stmt.title));
      const stmtDrop = dropClass(title);
      if (stmtDrop) {
        dropCounts[stmtDrop] += 1;
        membersAffected.add(bioguideId);
        continue;
      }
      stmt.title = title;
      stmt.displayText = clean(title);

      if (stmt.tier === 'official' && /\/CREC-/i.test(stmt.url)) {
        const newTopicId = classifyTextToRecordTopicId(stmt.title);
        if (newTopicId !== stmt.topicId) {
          reclassified += 1;
          stmt.topicId = newTopicId;
        }
      }

      (statementsByTopic[stmt.topicId] ??= []).push(stmt);
    }

    for (const [topicId, topic] of Object.entries(topics)) {
      const original = topic.platformPositions ?? [];
      positionsBefore += original.length;
      const kept: PlatformPositionEntry[] = [];

      for (const p of original) {
        const text = decodeHtmlEntities(p.text);
        const reason = dropClass(text);
        if (reason) {
          dropCounts[reason] += 1;
          membersAffected.add(bioguideId);
          continue;
        }
        kept.push({ ...p, text });
      }
      positionsAfter += kept.length;

      const statedRaw = topic.statedPosition ? decodeHtmlEntities(topic.statedPosition) : undefined;
      const statedPosition =
        statedRaw && !isDisqualifiedPlatformPosition(statedRaw) ? statedRaw : undefined;

      const statements = statementsByTopic[topicId] ?? [];
      const saidDidLinks = topic.saidDidLinks ?? [];

      if (kept.length === 0 && statements.length === 0 && !statedPosition && saidDidLinks.length === 0) {
        continue;
      }

      newTopics[topicId] = {
        ...topic,
        platformPositions: kept.length > 0 ? kept : undefined,
        statedPosition,
        statements,
        saidDidLinks,
      };
    }

    if (Object.keys(newTopics).length > 0) {
      snapshot.byBioguideId[bioguideId] = newTopics;
    } else {
      delete snapshot.byBioguideId[bioguideId];
    }
  }

  await writeFile(BUNDLE_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log('reprocess-topic-positions-bundle: complete\n');
  console.log('Positions before:', positionsBefore);
  console.log('Positions after:', positionsAfter);
  console.log('Dropped by class:', dropCounts);
  console.log('Members affected:', membersAffected.size);
  console.log('Statements reclassified:', reclassified);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
