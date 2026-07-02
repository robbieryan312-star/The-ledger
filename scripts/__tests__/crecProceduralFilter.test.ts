/**
 * Fixture test for the CREC procedural-text filter.
 * Run: npx tsx --test scripts/__tests__/crecProceduralFilter.test.ts
 *
 * Strings live in lib/data/__fixtures__/crecStatementFilter.fixture.ts — the single,
 * committed, corpus-seeded source of truth. This test only wires those fixtures into the
 * filter and is executed by `npm run build` (prebuild), so a regression fails the build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProceduralCrecText } from '../lib/crecProceduralFilter';
import {
  KNOWN_BAD,
  KNOWN_GOOD,
} from '../../lib/data/__fixtures__/crecStatementFilter.fixture';

test('all known-bad procedural strings are rejected', () => {
  for (const { label, text } of KNOWN_BAD) {
    assert.equal(
      isProceduralCrecText(text),
      true,
      `expected BAD "${label}" to be rejected as procedural, but it passed the filter`,
    );
  }
});

test('all known-good floor statements are preserved', () => {
  for (const { label, text } of KNOWN_GOOD) {
    assert.equal(
      isProceduralCrecText(text),
      false,
      `expected GOOD "${label}" to pass the filter, but it was dropped as procedural`,
    );
  }
});
