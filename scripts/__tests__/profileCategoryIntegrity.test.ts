/**
 * Build-gated guards — manifest↔file parity and required category status fields.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  PROFILE_CATEGORY_KNOWN_BAD_MANIFEST_MISMATCH,
  PROFILE_CATEGORY_KNOWN_BAD_MISSING_STATUS,
  PROFILE_CATEGORY_KNOWN_GOOD_EMPTY_WITH_STATUS,
} from '../../lib/data/__fixtures__/profileCategoryIntegrity.fixture';
import {
  CATEGORY_FILES_WITH_REQUIRED_STATUS,
  MIGRATED_PROFILE_IDS,
  categoryIsEmpty,
  resolveManifestCategoryStatus,
  validateManifestMatchesCategoryFiles,
  validateRequiredCategoryFileStatuses,
} from '../../lib/data/profileCategoryIntegrity';

const profilesRoot = path.join(process.cwd(), 'lib/data/generated/profiles');

function loadCategoryData(bioguideId: string): Record<string, Record<string, unknown>> {
  const dir = path.join(profilesRoot, bioguideId);
  const out: Record<string, Record<string, unknown>> = {};
  for (const fileBase of [
    'statements',
    'positions',
    'saidDid',
    'news',
    'votes',
    'finance',
    'controversies',
    'endorsements',
    'orgVoteLinks',
  ]) {
    out[fileBase] = JSON.parse(readFileSync(path.join(dir, `${fileBase}.json`), 'utf8')) as Record<
      string,
      unknown
    >;
  }
  return out;
}

test('fixture: manifest mismatch detected when honest-gap but file has content', () => {
  const { bioguideId, manifestCategories, controversies, expectedManifestStatus } =
    PROFILE_CATEGORY_KNOWN_BAD_MANIFEST_MISMATCH;
  const expected = resolveManifestCategoryStatus('controversies', controversies);
  assert.equal(expected, expectedManifestStatus);
  const violations = validateManifestMatchesCategoryFiles(bioguideId, manifestCategories, {
    controversies,
  });
  const controversyViolation = violations.find((v) => v.category === 'controversies');
  assert.ok(controversyViolation);
  assert.equal(controversyViolation.manifestStatus, 'honest-gap');
  assert.equal(controversyViolation.expectedStatus, expectedManifestStatus);
});

test('fixture: missing status on empty orgVoteLinks is a violation', () => {
  const { bioguideId, orgVoteLinks } = PROFILE_CATEGORY_KNOWN_BAD_MISSING_STATUS;
  assert.ok(categoryIsEmpty('orgVoteLinks', orgVoteLinks));
  const violations = validateRequiredCategoryFileStatuses(bioguideId, {
    controversies: { bioguideId, items: [] },
    endorsements: { bioguideId, endorses: [], endorsedBy: [] },
    orgVoteLinks,
  });
  assert.ok(violations.some((v) => v.category === 'orgVoteLinks'));
});

test('fixture: empty orgVoteLinks with honest-gap status passes validation', () => {
  const { bioguideId, orgVoteLinks } = PROFILE_CATEGORY_KNOWN_GOOD_EMPTY_WITH_STATUS;
  const violations = validateRequiredCategoryFileStatuses(bioguideId, {
    controversies: { bioguideId, items: [], status: 'honest-gap' },
    endorsements: { bioguideId, endorses: [], endorsedBy: [], status: 'honest-gap' },
    orgVoteLinks,
  });
  assert.equal(violations.length, 0);
});

test('migrated profiles: manifest categories match on-disk content', () => {
  const violations: string[] = [];
  for (const bioguideId of MIGRATED_PROFILE_IDS) {
    const manifest = JSON.parse(
      readFileSync(path.join(profilesRoot, bioguideId, 'manifest.json'), 'utf8'),
    ) as { categories?: Record<string, string> };
    const categoryData = loadCategoryData(bioguideId);
    for (const row of validateManifestMatchesCategoryFiles(
      bioguideId,
      manifest.categories ?? {},
      categoryData,
    )) {
      violations.push(
        `${row.bioguideId} ${row.category}: manifest=${row.manifestStatus} expected=${row.expectedStatus}`,
      );
    }
  }
  assert.equal(
    violations.length,
    0,
    `manifest↔file mismatches:\n${violations.join('\n')}`,
  );
});

test('migrated profiles: controversies/endorsements/orgVoteLinks have top-level status', () => {
  const violations: string[] = [];
  for (const bioguideId of MIGRATED_PROFILE_IDS) {
    const categoryData = loadCategoryData(bioguideId);
    for (const fileBase of CATEGORY_FILES_WITH_REQUIRED_STATUS) {
      const data = categoryData[fileBase] ?? {};
      if (!data.status || typeof data.status !== 'string') {
        violations.push(`${bioguideId}/${fileBase}.json missing status`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `missing category status fields:\n${violations.join('\n')}`,
  );
});
