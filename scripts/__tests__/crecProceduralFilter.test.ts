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
import { crecFloorSpeechOpenerRegex } from '../lib/crecOpener';
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

// Build-gated guard for the Phase 17b gendered-honorific bug: the floor-speech opener must
// accept a member's OWN honorific in any gendered form (Mr./Ms./Mrs./Miss), uniformly for both
// chambers. A regression to "Mr."-only silently excludes every female member — this test fails
// the build if that happens.
test('floor-speech opener accepts female honorifics (both chambers)', () => {
  const matches: Array<[string, string, string]> = [
    // [label, surname, verbatim opener line]
    ['Radewagen Mrs. (house)', 'RADEWAGEN', 'Mrs. RADEWAGEN. Mr. Speaker, I rise today to honor'],
    ['Baldwin Ms. (senate)', 'BALDWIN', 'Ms. BALDWIN. Mr. President, today, I rise in opposition'],
    ['Murkowski Ms. + Madam (senate)', 'MURKOWSKI', 'Ms. MURKOWSKI. Madam President, like so many of us here'],
    ['Sanders Mr. (senate control)', 'SANDERS', 'Mr. SANDERS. Mr. President, I want to say a few words'],
    ['Massie Mr. (house control)', 'MASSIE', 'Mr. MASSIE. Mr. Speaker, I rise to raise a question'],
  ];
  for (const [label, surname, text] of matches) {
    assert.equal(
      crecFloorSpeechOpenerRegex(surname).test(text),
      true,
      `expected opener regex to MATCH "${label}"`,
    );
  }
  // A bare surname mention (no address to the chair) must NOT be treated as a floor-speech opener.
  assert.equal(
    crecFloorSpeechOpenerRegex('WARREN').test('as Ms. Warren noted in her cosponsor list'),
    false,
    'expected a non-opener surname mention to NOT match',
  );
});
