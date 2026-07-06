/**
 * Build-gated guard: sync scripts must not duplicate fetch checkpoint logic outside syncKernel.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KERNEL = path.join(projectRoot, 'scripts/lib/syncKernel.ts');

test('syncKernel exports checkpoint and summary contract', () => {
  assert.ok(existsSync(KERNEL));
  const src = readFileSync(KERNEL, 'utf8');
  assert.match(src, /export interface SyncCheckpoint\b/);
  assert.match(src, /export type SyncCheckpointStatus\b/);
  assert.match(src, /export function emitSyncSummary/);
  assert.match(src, /export async function loadPriorSnapshot/);
  assert.match(src, /AbortSignal\.timeout/);
});

test('scripts/lib/resilientFetch re-exports lib/data fetchWithRetry (no duplicate impl)', () => {
  const src = readFileSync(
    path.join(projectRoot, 'scripts/lib/resilientFetch.ts'),
    'utf8',
  );
  assert.match(src, /from '\.\.\/\.\.\/lib\/data\/resilientFetch'/);
  assert.doesNotMatch(src, /for \(let attempt = 1; attempt <= maxAttempts/);
});
