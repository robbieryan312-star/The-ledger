/**
 * Build-gated guard: process.env.* in code ↔ .env.example vars stay in sync.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENV_EXAMPLE = path.join(projectRoot, '.env.example');

/** Optional override URLs documented in .env.example; code uses hardcoded defaults until wired. */
const GROUND_TRUTH_ENV_VARS = new Set([
  'CENSUS_ENDPOINT',
  'FARA_ENDPOINT',
  'GDELT_ENDPOINT',
  'GOVTRACK_ENDPOINT',
  'HOUSE_DISCLOSURES_URL',
  'MIT_ELECTIONS_URL',
  'OPENCORPORATES_ENDPOINT',
  'SENATE_DISCLOSURES_URL',
  'SENATE_LDA_ENDPOINT',
  'USASPENDING_ENDPOINT',
]);

const CODE_ROOTS = [
  path.join(projectRoot, 'scripts'),
  path.join(projectRoot, 'lib'),
  path.join(projectRoot, 'app'),
  path.join(projectRoot, 'components'),
];

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    if (ent === 'node_modules') continue;
    const st = statSync(full);
    if (st.isDirectory()) walkTs(full, acc);
    else if (/\.(ts|tsx|mjs)$/.test(ent)) acc.push(full);
  }
  return acc;
}

function parseEnvExample(): Set<string> {
  const vars = new Set<string>();
  const text = readFileSync(ENV_EXAMPLE, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars.add(trimmed.slice(0, eq).trim());
  }
  return vars;
}

function collectProcessEnvRefs(): Set<string> {
  const vars = new Set<string>();
  const re = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const bracketRe = /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g;
  for (const root of CODE_ROOTS) {
    if (!existsSync(root)) continue;
    for (const file of walkTs(root)) {
      const text = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) vars.add(m[1]);
      while ((m = bracketRe.exec(text)) !== null) vars.add(m[1]);
    }
  }
  return vars;
}

test('.env.example exists', () => {
  assert.ok(existsSync(ENV_EXAMPLE));
});

test('every process.env.* in app/scripts/lib is declared in .env.example', () => {
  const declared = parseEnvExample();
  const used = collectProcessEnvRefs();
  const missing = [...used].filter((v) => !declared.has(v)).sort();
  assert.equal(
    missing.length,
    0,
    `code references env vars missing from .env.example: ${missing.join(', ')}`,
  );
});

test('every .env.example var is referenced in code (no stale entries)', () => {
  const declared = parseEnvExample();
  const used = collectProcessEnvRefs();
  const stale = [...declared].filter((v) => !used.has(v)).sort();
  assert.equal(
    stale.length,
    0,
    `stale .env.example vars not referenced in code: ${stale.join(', ')}`,
  );
});

test('guard demo: undeclared FAKE_TEST_VAR would fail sync check', () => {
  const declared = new Set(['FEC_API_KEY']);
  const used = new Set(['FEC_API_KEY', 'FAKE_TEST_VAR']);
  const missing = [...used].filter((v) => !declared.has(v));
  assert.deepEqual(missing, ['FAKE_TEST_VAR']);
});
