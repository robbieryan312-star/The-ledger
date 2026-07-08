/**
 * Benchmark ingest-member-deep for a fixed member sample.
 * Usage: tsx scripts/benchmark-ingest-sample.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MemberDeepProfile } from './ingest-member-deep';

const SAMPLE = [
  'B001236', 'B001298', 'C000537', 'C001055', 'C001072', 'C001080',
  'E000296', 'G000599', 'J000299', 'K000009', 'M001199', 'M001239',
  'N000015', 'R000609', 'S001159', 'S001194', 'S001230', 'T000474',
  'W000187', 'W000800', 'W000437', 'F000450', 'L000560',
];

const BASELINE_IDS = ['K000009', 'B001236', 'N000015'];

async function compareByTopic(
  before: MemberDeepProfile,
  after: MemberDeepProfile,
): Promise<{ match: boolean; diffs: string[] }> {
  const diffs: string[] = [];
  for (const topicId of Object.keys(before.byTopic)) {
    const bCos = before.byTopic[topicId]?.cosponsored ?? [];
    const aCos = after.byTopic[topicId]?.cosponsored ?? [];
    const bUrls = bCos.map((x) => x.url).sort();
    const aUrls = aCos.map((x) => x.url).sort();
    if (bUrls.length !== aUrls.length) {
      diffs.push(`${topicId}: count ${bUrls.length} → ${aUrls.length}`);
      continue;
    }
    for (let i = 0; i < bUrls.length; i += 1) {
      if (bUrls[i] !== aUrls[i]) {
        diffs.push(`${topicId}: bill mismatch at index ${i}`);
        break;
      }
    }
  }
  if (JSON.stringify(before.meta.topicCoverage) !== JSON.stringify(after.meta.topicCoverage)) {
    diffs.push(`topicCoverage: ${JSON.stringify(before.meta.topicCoverage)} → ${JSON.stringify(after.meta.topicCoverage)}`);
  }
  return { match: diffs.length === 0, diffs };
}

async function main(): Promise<void> {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const membersDir = path.join(projectRoot, 'lib', 'data', 'generated', 'members');

  const baselines = new Map<string, MemberDeepProfile>();
  for (const id of BASELINE_IDS) {
    try {
      const raw = await readFile(path.join(membersDir, `${id}.json`), 'utf8');
      baselines.set(id, JSON.parse(raw) as MemberDeepProfile);
    } catch {
      /* no prior snapshot */
    }
  }

  const { loadEnvLocal } = await import('./lib/ingest-utils');
  const { resetApiCallCount, getApiCallCount } = await import('./ingest-member-deep');
  await loadEnvLocal();

  const key = process.env.CONGRESS_API_KEY?.trim();
  if (!key) throw new Error('CONGRESS_API_KEY missing');

  const ingestModule = await import('./ingest-member-deep');
  const asOf = new Date().toISOString().slice(0, 10);

  resetApiCallCount();
  const started = Date.now();
  const results: Array<{ id: string; ok: boolean; error?: string; elapsedSec?: number; apiCalls?: number }> = [];
  let totalCalls = 0;

  for (const id of SAMPLE) {
    try {
      const memberCallsBefore = getApiCallCount();
      const memberStart = Date.now();
      await ingestModule.ingestOneMember(id, key, asOf);
      const memberCalls = getApiCallCount() - memberCallsBefore;
      totalCalls += memberCalls;
      const elapsed = (Date.now() - memberStart) / 1000;
      results.push({ id, ok: true, elapsedSec: elapsed, apiCalls: memberCalls });
      console.log(`✓ ${id} (${elapsed.toFixed(1)}s, ${memberCalls} calls)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id, ok: false, error: msg });
      console.error(`✗ ${id}: ${msg}`);
    }
  }

  const wallMin = ((Date.now() - started) / 60_000).toFixed(1);
  const failed = results.filter((r) => !r.ok);

  console.log('\n── benchmark summary ──');
  console.log(`Members: ${SAMPLE.length} · Wall time: ${wallMin} min · API calls: ${totalCalls}`);
  console.log(`Succeeded: ${results.length - failed.length} · Failed: ${failed.length}`);
  if (failed.length) {
    console.log('Failures:', failed.map((f) => `${f.id}: ${f.error}`).join('; '));
  }

  console.log('\n── byTopic spot-check ──');
  for (const id of BASELINE_IDS) {
    const before = baselines.get(id);
    if (!before) {
      console.log(`${id}: no baseline to compare`);
      continue;
    }
    const after = JSON.parse(
      await readFile(path.join(membersDir, `${id}.json`), 'utf8'),
    ) as MemberDeepProfile;
    const { match, diffs } = await compareByTopic(before, after);
    console.log(`${id}: ${match ? 'IDENTICAL byTopic cosponsored' : `DIFF: ${diffs.join('; ')}`}`);
  }

  const reportPath = path.join(projectRoot, 'tmp', 'ingest-benchmark-report.json');
  await writeFile(
    reportPath,
    JSON.stringify({ wallMin, totalCalls, results, asOf }, null, 2) + '\n',
    'utf8',
  );
  console.log(`Report: ${reportPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
