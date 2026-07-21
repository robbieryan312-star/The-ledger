/**
 * Build-gated guard: failed Florida ingest payloads must not overwrite prior snapshots.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  shouldPreservePriorFloridaSnapshot,
  type FloridaSnapshotPayload,
} from '../lib/ingest-utils';

const source = {
  name: 'Fixture source',
  url: 'https://example.test',
  tier: 'official' as const,
};

function snapshot(
  overrides: Partial<FloridaSnapshotPayload<Record<string, unknown>>['meta']> = {},
  records: Record<string, unknown>[] = [],
): FloridaSnapshotPayload<Record<string, unknown>> {
  return {
    meta: {
      source,
      asOf: '2026-07-17',
      count: records.length,
      stateCode: 'FL',
      fetchedLive: records.length > 0,
      ...overrides,
    },
    records,
  };
}

test('failed incoming Florida snapshot preserves an existing prior artifact', () => {
  const incoming = snapshot({
    fetchedLive: false,
    errors: ['HTTP 503 for upstream API'],
  });

  assert.equal(shouldPreservePriorFloridaSnapshot(incoming, true), true);
});

test('failed incoming Florida snapshot can write when no prior artifact exists', () => {
  const incoming = snapshot({
    fetchedLive: false,
    errors: ['API key not configured'],
  });

  assert.equal(shouldPreservePriorFloridaSnapshot(incoming, false), false);
});

test('verified and explicit honest-gap snapshots are not blocked', () => {
  const verified = snapshot({ fetchedLive: true }, [{ id: 'record-1' }]);
  const honestGap = snapshot({
    fetchedLive: false,
    note: 'No verified record available for this source.',
  });

  assert.equal(shouldPreservePriorFloridaSnapshot(verified, true), false);
  assert.equal(shouldPreservePriorFloridaSnapshot(honestGap, true), false);
});
