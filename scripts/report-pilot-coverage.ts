/**
 * One-off pilot coverage report for M000355, O000172, M001184.
 * Run: npx tsx scripts/report-pilot-coverage.ts
 */
import { STANDARD_POLICY_TOPICS } from '../lib/data/topicCoverage';
import { buildMergedProfileIssues } from '../lib/data/issuesFromTopicPositions';
import { getMemberTopicPositions } from '../lib/data/topicPositions';
import { mockPoliticians } from '../lib/data/mockPoliticians';
import { derivePromiseStatus } from '../lib/data/derivePromiseStatus';
import { VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE } from './lib/approvedMediaQuotes';
import { cacheStats } from './lib/articleVerificationCache';

const PILOTS = ['M000355', 'O000172', 'M001184'] as const;

function topicPipelineStatus(bioguideId: string, topicId: string): string {
  const member = getMemberTopicPositions(bioguideId);
  if (!member) return 'no-member';
  const data = member[topicId];
  if (!data) return 'empty';
  const n =
    data.statements.length +
    (data.platformPositions?.length ?? 0) +
    (data.saidDidLinks?.length ?? 0) +
    (data.statedPosition?.trim() ? 1 : 0);
  return n > 0 ? `pipeline(${n})` : 'empty';
}

for (const id of PILOTS) {
  const pol = mockPoliticians.find((p) => p.bioguideId === id);
  const legacy = pol?.topIssues ?? [];
  const merged = buildMergedProfileIssues(id, legacy, true);
  console.log(`\n=== ${id} ${pol?.name ?? ''} ===`);
  console.log('Endorsements:', pol?.endorsements ? 'yes' : 'MISSING');
  const quotes = VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE[id] ?? [];
  console.log(
    'Quotes:',
    quotes.map((q) => `${q.topicId}:${q.sources.length}src`).join(', ') || 'none',
  );
  const promises = pol?.consistency?.campaignPromises ?? [];
  const contradictions = promises.filter((p) => derivePromiseStatus(p) !== p.status);
  console.log(
    'Promise audit:',
    contradictions.length ? contradictions.map((c) => `${c.id}:${c.status}->${derivePromiseStatus(c)}`).join(', ') : 'clean',
  );
  console.log('Topic coverage:');
  for (const t of STANDARD_POLICY_TOPICS) {
    const pipe = topicPipelineStatus(id, t.id);
    const issue = merged.find((i) => i.name === t.label);
    const src =
      issue?.evidence?.some((e) => e.source?.tier === 'media') ? 'media' :
      issue?.evidence?.length ? 'evidence' :
      issue?.position?.includes('Pending integration') ? 'legacy-fallback' :
      issue?.position?.includes('No verified') ? 'gap' : 'other';
    console.log(`  ${t.id.padEnd(18)} pipe=${pipe.padEnd(14)} ui=${src}`);
  }
}

console.log('\nCache stats:', cacheStats());
