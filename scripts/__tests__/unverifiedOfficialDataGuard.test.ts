/**
 * Build-gated guard: official/nonpartisan Florida dashboard data must carry
 * provenance fetched-live or computed-from-published-tables when numeric payload is present.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FL_DASHBOARD_CREDIBILITY_FILES,
  UNVERIFIED_OFFICIAL_KNOWN_BAD,
  UNVERIFIED_OFFICIAL_KNOWN_BAD_MISSING_PROVENANCE,
  UNVERIFIED_OFFICIAL_KNOWN_BAD_ZERO_ATTAINMENT,
  UNVERIFIED_OFFICIAL_KNOWN_GAP,
  UNVERIFIED_OFFICIAL_KNOWN_GOOD,
  UNVERIFIED_OFFICIAL_KNOWN_GOOD_COMPUTED,
  floridaDashboardDataPath,
} from '../../lib/data/__fixtures__/unverifiedOfficialDataGuard.fixture';
import {
  auditFloridaDashboardFile,
  auditFloridaDashboardJson,
} from '../lib/florida-dashboard-credibility';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
void projectRoot;

test('fixture: honest-gap provenance with numeric payload is a known-bad case', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-bad',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_BAD),
  );
  assert.ok(violations.length > 0, 'expected violation for placeholder official data');
});

test('fixture: missing provenance on official numeric is a known-bad case', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-bad-missing-prov',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_BAD_MISSING_PROVENANCE),
  );
  assert.ok(violations.length > 0, 'expected violation for missing provenance');
});

test('fixture: zero attainment with fetched-live is a known-bad case', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-bad-zero-att',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_BAD_ZERO_ATTAINMENT),
  );
  assert.ok(violations.length > 0, 'expected violation for all-zero attainment');
});

test('fixture: fetched-live with numeric payload passes', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-good',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_GOOD),
  );
  assert.equal(violations.length, 0);
});

test('fixture: computed-from-published-tables with citation+computedAt passes', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-good-computed',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_GOOD_COMPUTED),
  );
  assert.equal(violations.length, 0);
});

test('fixture: honest-gap with null state passes', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-gap',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_GAP),
  );
  assert.equal(violations.length, 0);
});

test('Florida dashboard committed data: no unverified official/nonpartisan numbers', () => {
  for (const rel of FL_DASHBOARD_CREDIBILITY_FILES) {
    const abs = floridaDashboardDataPath(rel);
    assert.ok(existsSync(abs), `${rel} must exist`);
    const violations = auditFloridaDashboardFile(abs, rel);
    assert.equal(
      violations.length,
      0,
      violations.map((v) => `${v.path}: ${v.reason}`).join('\n'),
    );
  }
});
