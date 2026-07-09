/**
 * Build-gated guard — credibility audit report is deterministic (no wall-clock fields)
 * and prebuild/CI gate blocks on P0/P1 defects.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  runProfileCredibilityAudit,
  summarizeDefectSeverities,
} from '../audit-profile-credibility';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportPath = path.join(
  projectRoot,
  'data/reports/profile-credibility-audit-2026-07-08.md',
);

test('profile-credibility audit: locked profiles have no P0/P1 defects', async () => {
  const { defects } = await runProfileCredibilityAudit();
  const { p0, p1 } = summarizeDefectSeverities(defects);
  const blocking = defects.filter((d) => d.severity === 'P0' || d.severity === 'P1');
  assert.equal(
    blocking.length,
    0,
    `P0/P1 credibility defects:\n${blocking
      .slice(0, 10)
      .map((d) => `  [${d.severity}] ${d.bioguideId} ${d.check}: ${d.detail}`)
      .join('\n')}`,
  );
  assert.equal(p0, 0);
  assert.equal(p1, 0);
});

test('profile-credibility audit --gate exits 0 when no P0/P1 defects', () => {
  execSync('npm run audit:profile-credibility', {
    cwd: projectRoot,
    stdio: 'pipe',
  });
});

test('profile-credibility audit report has no wall-clock Generated timestamp', () => {
  const text = readFileSync(reportPath, 'utf8');
  assert.match(text, /^\*\*Report date:\*\* 2026-07-08/m);
  assert.doesNotMatch(text, /^\*\*Generated:\*\*/m);
});

test('profile-credibility audit: repeat run produces byte-identical report', () => {
  const before = readFileSync(reportPath, 'utf8');
  const backup = `${reportPath}.test-backup`;
  writeFileSync(backup, before, 'utf8');
  try {
    execSync('npx tsx scripts/audit-profile-credibility.ts', {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    const after = readFileSync(reportPath, 'utf8');
    assert.equal(after, before, 'repeat audit run must not mutate committed report bytes');
  } finally {
    writeFileSync(reportPath, before, 'utf8');
    unlinkSync(backup);
  }
});
