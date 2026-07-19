/**
 * Build-gated guard (Wave 1 / core-rules §6): data-loss prevention. Verifies the shared
 * writeSnapshotPreservingLive() helper never overwrites a fetched-live snapshot with a
 * non-live (honest-gap / empty) one, and that every audited ingest + national sync is wired
 * to it. Freezes the DATA-02..05 / SYNC-01 defect class.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  snapshotIsLive,
  writeSnapshotPreservingLive,
} from '../lib/ingest-utils';
import {
  HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE,
  LIVE_SNAPSHOT_KNOWN_GOOD,
  PRESERVE_WIRED_INGESTS,
  SCOPE_REQUIRED_SYNCS,
  SPLIT_LIVE_SNAPSHOT_KNOWN_GOOD,
} from '../../lib/data/__fixtures__/ingestPreserve.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('snapshotIsLive detects provenance, fetchedLive, and split-live flags', () => {
  assert.equal(snapshotIsLive(LIVE_SNAPSHOT_KNOWN_GOOD), true);
  assert.equal(snapshotIsLive(SPLIT_LIVE_SNAPSHOT_KNOWN_GOOD), true);
  assert.equal(snapshotIsLive(HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE), false);
  assert.equal(snapshotIsLive({ meta: {} }), false);
  assert.equal(snapshotIsLive(null), false);
});

test('preserve helper refuses to overwrite a live snapshot with an honest-gap one', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ledger-preserve-'));
  const out = path.join(dir, 'snap.json');
  writeFileSync(out, JSON.stringify(LIVE_SNAPSHOT_KNOWN_GOOD, null, 2), 'utf8');

  const res = await writeSnapshotPreservingLive(out, HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE);
  assert.equal(res.action, 'preserved-prior');
  const onDisk = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(onDisk.meta.provenance, 'fetched-live', 'prior live data must survive');
  assert.equal(onDisk.ranks.population.rank, 3);
});

test('preserve helper writes an honest-gap when there is no prior live snapshot', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ledger-preserve-'));
  const out = path.join(dir, 'snap.json');
  assert.equal(existsSync(out), false);

  const res = await writeSnapshotPreservingLive(out, HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE);
  assert.equal(res.action, 'written');
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).meta.provenance, 'honest-gap');
});

test('preserve helper always writes a fresh live snapshot', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ledger-preserve-'));
  const out = path.join(dir, 'snap.json');
  writeFileSync(out, JSON.stringify(HONEST_GAP_SNAPSHOT_KNOWN_BAD_OVERWRITE), 'utf8');

  const res = await writeSnapshotPreservingLive(out, LIVE_SNAPSHOT_KNOWN_GOOD);
  assert.equal(res.action, 'written');
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).meta.provenance, 'fetched-live');
});

test('every audited ingest is wired to the preserve helper', () => {
  for (const rel of PRESERVE_WIRED_INGESTS) {
    const src = readFileSync(path.join(projectRoot, rel), 'utf8');
    assert.match(
      src,
      /writeSnapshotPreservingLive|writeFloridaSnapshotPreservingLive/,
      `${rel} must route writes through the preserve helper (DATA-02..05)`,
    );
  }
});

test('every national sync requires --members/--full-corpus scoping', () => {
  for (const rel of SCOPE_REQUIRED_SYNCS) {
    const src = readFileSync(path.join(projectRoot, rel), 'utf8');
    assert.match(
      src,
      /requireSyncScope|--full-corpus/,
      `${rel} must enforce sync scoping (SYNC-01, core-rules §5)`,
    );
  }
});
