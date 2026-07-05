/**
 * Build-gated guard: topicPositions.json mega-bundle must contain no disqualified positions.
 * Append-only fixtures freeze worst-case bundle cruft — never reset.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  PLATFORM_KNOWN_BAD_BIO_BOILERPLATE,
  PLATFORM_KNOWN_BAD_EVENT_NARRATION,
  PLATFORM_KNOWN_BAD_SITE_FURNITURE,
  PLATFORM_KNOWN_GOOD_MEMBER_POSITION,
} from '../../lib/data/__fixtures__/sourceIntegrity.fixture';
import { validateTopicPositionsBundle } from '../../lib/data/sourceIntegrity';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUNDLE = path.join(projectRoot, 'lib/data/generated/topicPositions.json');

/** Frozen worst-case examples — append-only regression fixtures for bundle guards. */
const BUNDLE_KNOWN_BAD_PLATFORM = [
  { label: 'event narration (Holder/Paul filibuster)', text: PLATFORM_KNOWN_BAD_EVENT_NARRATION },
  { label: 'bio-boilerplate (Aderholt)', text: PLATFORM_KNOWN_BAD_BIO_BOILERPLATE },
  { label: 'site furniture (Ballotpedia finance disclaimer)', text: PLATFORM_KNOWN_BAD_SITE_FURNITURE },
  { label: 'citation cruft [NNN]', text: 'Member supports rural broadband expansion [42] in underserved counties.' },
  { label: 'vote restatement as Said', text: 'Voted Yea on: "A joint resolution to direct the removal of United States Armed Forces from hostilities in the Republic of Yemen that have not been authorized by Congress." (SJ Res 54)' },
];

function miniBundle(platformTexts: string[]) {
  return {
    byBioguideId: {
      FIXTURE: {
        healthcare: {
          platformPositions: platformTexts.map((text) => ({
            text,
            source: 'Ballotpedia',
            url: 'https://ballotpedia.org/Example_Member',
            tier: 'nonpartisan',
            asOf: '2026-01-01',
          })),
        },
      },
    },
  };
}

test('topicPositions.json bundle passes validateTopicPositionsBundle', () => {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as Parameters<
    typeof validateTopicPositionsBundle
  >[0];
  const violations = validateTopicPositionsBundle(bundle);
  assert.equal(
    violations.length,
    0,
    `topicPositions bundle violations (first 10):\n${violations
      .slice(0, 10)
      .map((v) => `  ${v.path}: ${v.message}`)
      .join('\n')}`,
  );
});

test('bundle fixture: known-bad platform positions fail validateTopicPositionsBundle', () => {
  for (const { label, text } of BUNDLE_KNOWN_BAD_PLATFORM) {
    const violations = validateTopicPositionsBundle(miniBundle([text]));
    assert.ok(
      violations.length > 0,
      `expected BAD bundle fixture "${label}" to fail validation`,
    );
  }
});

test('bundle fixture: known-good member position passes validateTopicPositionsBundle', () => {
  const violations = validateTopicPositionsBundle(miniBundle([PLATFORM_KNOWN_GOOD_MEMBER_POSITION]));
  assert.equal(
    violations.length,
    0,
    `expected GOOD bundle fixture to pass; got: ${violations.map((v) => v.message).join('; ')}`,
  );
});
