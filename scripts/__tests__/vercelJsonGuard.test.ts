/**
 * Build-gated: vercel.json must enable deployments only on main (stop preview flood).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const vercelPath = path.join(root, 'vercel.json');

test('vercel.json is valid JSON and enables deploys only on main', () => {
  const raw = readFileSync(vercelPath, 'utf8');
  const cfg = JSON.parse(raw) as {
    git?: { deploymentEnabled?: boolean | Record<string, boolean> };
  };
  assert.ok(cfg.git, 'git block required');
  const de = cfg.git.deploymentEnabled;
  assert.equal(typeof de, 'object');
  assert.ok(de && !Array.isArray(de));
  const map = de as Record<string, boolean>;
  assert.equal(map.main, true, 'main must deploy (production)');
  assert.equal(map['*'], false, 'wildcard must disable non-main preview builds');
  // Must not globally disable all git deploys (would block main production).
  assert.notEqual(de, false);
});
