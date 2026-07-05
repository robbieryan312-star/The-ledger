/**
 * Update golden profile snapshot fixtures.
 * Usage: npm run snapshot:update -- --member S000033
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractProfileSnapshot } from '../lib/data/profileSnapshot';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DIR = path.join(projectRoot, 'lib', 'data', '__fixtures__', 'profileSnapshots');

const ALLOWED = new Set(['S000033', 'M000355']);

async function main(): Promise<void> {
  const memberArg = process.argv.find((a) => a.startsWith('--member='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--member') + 1];

  if (!memberArg || !ALLOWED.has(memberArg)) {
    console.error('Usage: npm run snapshot:update -- --member S000033|M000355');
    process.exit(1);
  }

  const snapshot = extractProfileSnapshot(memberArg);
  await mkdir(FIXTURE_DIR, { recursive: true });
  const outPath = path.join(FIXTURE_DIR, `${memberArg}.snapshot.json`);
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
