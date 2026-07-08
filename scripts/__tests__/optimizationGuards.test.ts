/**
 * Build-gated guards: sync contract, profile manifest, read-path routing, raw fetch.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadProfileDisplayIdentityByBioguide } from '../lib/profileDisplayIdentity';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scriptsDir = path.join(projectRoot, 'scripts');

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir)) {
    if (ent === 'node_modules' || ent === '__tests__' || ent === 'archive') continue;
    const full = path.join(dir, ent);
    const st = statSync(full);
    if (st.isDirectory()) walkTs(full, acc);
    else if ((ent.endsWith('.ts') || ent.endsWith('.tsx')) && !ent.endsWith('.test.ts')) acc.push(full);
  }
  return acc;
}

test('sync-contract: national sync scripts emit syncKernel summary', () => {
  const required = [
    'sync-votes-national.ts',
    'sync-fec-national.ts',
    'sync-stock-trades.ts',
    'sync-legislation.ts',
    'sync-news-national.ts',
  ];
  const missing: string[] = [];
  for (const name of required) {
    const src = readFileSync(path.join(scriptsDir, name), 'utf8');
    if (!src.includes('emitSyncSummary') || !src.includes('syncKernel')) {
      missing.push(name);
    }
  }
  assert.equal(missing.length, 0, `missing syncKernel summary: ${missing.join(', ')}`);
});

test('profile-manifest: _manifest.json matches profile directories', () => {
  const manifestPath = path.join(projectRoot, 'lib/data/generated/profiles/_manifest.json');
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    members: Array<{ bioguideId: string; name?: string; initials?: string }>;
  };
  const dirs = readdirSync(path.join(projectRoot, 'lib/data/generated/profiles')).filter((d) =>
    /^[A-Z]\d{6}$/.test(d),
  );
  const manifestIds = new Set(manifest.members.map((m) => m.bioguideId));
  const missingInManifest = dirs.filter((d) => !manifestIds.has(d));
  const extraInManifest = [...manifestIds].filter((id) => !dirs.includes(id));
  assert.equal(missingInManifest.length, 0, `dirs missing from manifest: ${missingInManifest.join(', ')}`);
  assert.equal(extraInManifest.length, 0, `manifest entries without dir: ${extraInManifest.join(', ')}`);

  const identityByBioguide = loadProfileDisplayIdentityByBioguide(projectRoot);
  const identityViolations: string[] = [];
  for (const member of manifest.members) {
    const expected = identityByBioguide.get(member.bioguideId);
    if (!member.name?.trim() || !member.initials?.trim()) {
      identityViolations.push(`${member.bioguideId}: missing name or initials on manifest entry`);
      continue;
    }
    if (!expected) {
      identityViolations.push(`${member.bioguideId}: no roster/legislator identity join`);
      continue;
    }
    if (member.name !== expected.name) {
      identityViolations.push(
        `${member.bioguideId}: name "${member.name}" !== roster join "${expected.name}"`,
      );
    }
    if (member.initials !== expected.initials) {
      identityViolations.push(
        `${member.bioguideId}: initials "${member.initials}" !== expected "${expected.initials}"`,
      );
    }
  }
  assert.equal(
    identityViolations.length,
    0,
    `manifest identity mismatches:\n${identityViolations.join('\n')}`,
  );
});

test('read-path-routing: memberProfile uses generated index not hand imports', () => {
  const src = readFileSync(path.join(projectRoot, 'lib/data/memberProfile.ts'), 'utf8');
  assert.match(src, /from '\.\/generated\/profiles\/index'/);
  assert.doesNotMatch(src, /import sandersStatements from/);
});

test('raw-fetch: scripts use timeout or resilient fetch helpers', () => {
  const violations: string[] = [];
  const allowlist = new Set([
    path.join(scriptsDir, 'lib/resilientFetch.ts'),
    path.join(projectRoot, 'lib/data/resilientFetch.ts'),
    path.join(scriptsDir, 'lib/ingest-utils.ts'),
  ]);
  for (const file of walkTs(scriptsDir)) {
    if (allowlist.has(file)) continue;
    const rel = path.relative(projectRoot, file);
    const src = readFileSync(file, 'utf8');
    if (!/\bfetch\s*\(/.test(src)) continue;
    const hasGuard =
      /AbortSignal\.timeout/.test(src) ||
      /AbortController/.test(src) ||
      /fetchWithRetry/.test(src) ||
      /fetchJson/.test(src) ||
      /requireTimeout/.test(src);
    if (!hasGuard) violations.push(rel);
  }
  assert.equal(
    violations.length,
    0,
    `unguarded fetch() in scripts (first 10):\n${violations.slice(0, 10).join('\n')}`,
  );
});

test('orphan-components: MapClient-style dead wrappers must not exist', () => {
  assert.ok(!existsSync(path.join(projectRoot, 'components/map/MapClient.tsx')), 'MapClient.tsx was removed — do not re-add');
});
