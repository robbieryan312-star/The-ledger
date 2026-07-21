import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type BundleSection,
  mergeSectionsPreservingMissing,
} from '../build-data-slices';

function section(sourceId: string, marker: string): BundleSection {
  return {
    sourceId,
    label: sourceId,
    meta: { marker },
    records: [{ marker }],
  };
}

test('multi-source slices preserve prior-good sections when a raw source is missing', () => {
  const existing = [section('newsapi', 'old-newsapi'), section('gdelt', 'old-gdelt')];
  const fresh = [section('newsapi', 'fresh-newsapi')];

  const merged = mergeSectionsPreservingMissing(fresh, existing, ['newsapi', 'gdelt']);

  assert.deepEqual(
    merged.map((s) => [s.sourceId, s.records[0].marker]),
    [
      ['newsapi', 'fresh-newsapi'],
      ['gdelt', 'old-gdelt'],
    ],
  );
});

test('multi-source slice merge keeps unexpected existing sections instead of truncating them', () => {
  const existing = [section('legacy-feed', 'old-legacy')];
  const fresh = [section('legiscan', 'fresh-legiscan')];

  const merged = mergeSectionsPreservingMissing(fresh, existing, ['legiscan']);

  assert.deepEqual(
    merged.map((s) => [s.sourceId, s.records[0].marker]),
    [
      ['legiscan', 'fresh-legiscan'],
      ['legacy-feed', 'old-legacy'],
    ],
  );
});
