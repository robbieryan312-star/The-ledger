/**
 * Build-gated guard: official/nonpartisan Florida dashboard data must be fetchedLive:true
 * when numeric payload is present — prevents placeholder-as-sourced regressions.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FL_DASHBOARD_CREDIBILITY_FILES,
  UNVERIFIED_OFFICIAL_KNOWN_BAD,
  UNVERIFIED_OFFICIAL_KNOWN_GAP,
  UNVERIFIED_OFFICIAL_KNOWN_GOOD,
  floridaDashboardDataPath,
} from '../../lib/data/__fixtures__/unverifiedOfficialDataGuard.fixture';
import {
  auditFloridaDashboardFile,
  auditFloridaDashboardJson,
} from '../lib/florida-dashboard-credibility';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('fixture: official numeric payload with fetchedLive:false is a known-bad case', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-bad',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_BAD),
  );
  assert.ok(violations.length > 0, 'expected violation for placeholder official data');
});

test('fixture: fetchedLive:true with numeric payload passes', () => {
  const violations = auditFloridaDashboardJson(
    'fixture-good',
    JSON.stringify(UNVERIFIED_OFFICIAL_KNOWN_GOOD),
  );
  assert.equal(violations.length, 0);
});

test('fixture: unfetched BEA with null state (honest gap) passes', () => {
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
