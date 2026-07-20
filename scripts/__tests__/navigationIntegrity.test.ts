/**
 * Build-gated guard (P4): every nav-relevant file must be reachable from docs/AGENT_INDEX.md
 * (including files it links), package.json / CI script wiring, import closure from those
 * seeds, OR listed as archive/redirect in the regenerated inventory.
 *
 * Scan scope: `.ts` / `.tsx` / `.md` / `.mdc` under app/, components/, lib/, scripts/, docs/,
 * `.cursor/`, `.claude/`, plus root `*.md` — excluding `lib/data/generated/` and `data/`
 * (categorical exempt). Root bootstrap `.ts` files listed in BOOTSTRAP_EXEMPT below.
 *
 * Shell scripts (2, included): `scripts/setup-github-secrets.sh` (AGENT_INDEX → SETUP.md →
 * KEYS.md chain) and `scripts/exclude-fetch-failed-artifacts.sh` (`.github/workflows/refresh-data.yml`).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  NAVIGABLE_FILE_KNOWN_GOOD,
  ORPHAN_PATH_KNOWN_BAD,
} from '../../lib/data/__fixtures__/navigationIntegrity.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AGENT_INDEX = path.join(projectRoot, 'docs', 'AGENT_INDEX.md');
const INVENTORY_JSON = path.join(projectRoot, 'data', 'reports', 'file-inventory.json');

const SCAN_ROOTS = ['app', 'components', 'lib', 'scripts', 'docs', '.cursor', '.claude'] as const;

const CATEGORICAL_PREFIX_EXEMPT = [
  'lib/data/generated/',
  'data/',
  'docs/archive/',
  'scripts/archive/',
];

/** Framework / ambient files outside agent navigation map — documented exclusion. */
const BOOTSTRAP_EXEMPT = new Set([
  'next.config.ts',
  'next-env.d.ts',
  'react-simple-maps.d.ts',
]);

const TS_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const IMPORT_SPEC_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const BACKTICK_PATH_RE =
  /`((?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:md|mdc|ts|tsx|json|yml|sh))`/g;
const MARKDOWN_LINK_RE = /\]\(([^)#]+\.(?:md|mdc|ts|tsx|sh))\)/g;
const TABLE_STUB_RE = /^\| `([^`]+)` \| redirect stub \|/gm;
const NPM_TSX_RE = /tsx\s+([^\s&;|]+)/g;
const CI_SCRIPT_RE = /(?:bash|sh)\s+([^\s&;|]+\.sh)/g;

function norm(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function isCategoricallyExempt(rel: string): boolean {
  return CATEGORICAL_PREFIX_EXEMPT.some((prefix) => rel.startsWith(prefix));
}

function loadInventoryArchivePaths(): Set<string> {
  const raw = JSON.parse(readFileSync(INVENTORY_JSON, 'utf8')) as { layers?: Record<string, string[]> };
  const archive = new Set<string>();
  for (const file of raw.layers?.L3a ?? []) archive.add(norm(file));
  return archive;
}

function loadRedirectStubs(): Set<string> {
  const text = readFileSync(AGENT_INDEX, 'utf8');
  const stubs = new Set<string>();
  let m: RegExpExecArray | null;
  TABLE_STUB_RE.lastIndex = 0;
  while ((m = TABLE_STUB_RE.exec(text)) !== null) stubs.add(norm(m[1]));
  return stubs;
}

function parseAgentIndexSeeds(indexText: string): string[] {
  const seeds: string[] = [];
  const numberedRe = /^\d+\.\s+`([^`]+)`/gm;
  let m: RegExpExecArray | null;
  while ((m = numberedRe.exec(indexText)) !== null) seeds.push(norm(m[1]));
  const alsoRead = indexText.match(/Also read when relevant:([^#\n]+)/);
  if (alsoRead) {
    BACKTICK_PATH_RE.lastIndex = 0;
    while ((m = BACKTICK_PATH_RE.exec(alsoRead[1])) !== null) seeds.push(norm(m[1]));
  }
  for (const section of ['## 2.', '## 6.', '## 7.']) {
    const start = indexText.indexOf(section);
    if (start < 0) continue;
    const end = indexText.indexOf('\n## ', start + section.length);
    const chunk = end === -1 ? indexText.slice(start) : indexText.slice(start, end);
    BACKTICK_PATH_RE.lastIndex = 0;
    while ((m = BACKTICK_PATH_RE.exec(chunk)) !== null) seeds.push(norm(m[1]));
  }
  return [...new Set(seeds)];
}

function collectNextJsEntryFiles(allFiles: Set<string>): string[] {
  const entries: string[] = [];
  for (const file of allFiles) {
    if (!file.startsWith('app/')) continue;
    const base = path.basename(file);
    if (
      base === 'page.tsx' ||
      base === 'layout.tsx' ||
      base === 'route.ts' ||
      base === 'sitemap.ts' ||
      base === 'loading.tsx' ||
      base === 'error.tsx' ||
      base === 'not-found.tsx'
    ) {
      entries.push(file);
    }
  }
  return entries;
}

function collectPathsFromMarkdown(text: string): string[] {
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  BACKTICK_PATH_RE.lastIndex = 0;
  while ((m = BACKTICK_PATH_RE.exec(text)) !== null) paths.push(norm(m[1]));
  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((m = MARKDOWN_LINK_RE.exec(text)) !== null) {
    const target = norm(m[1]);
    if (!target.startsWith('http')) paths.push(target);
  }
  return paths;
}

function resolveImportSpec(fromRel: string, spec: string, known: Set<string>): string | null {
  if (spec.startsWith('@/')) {
    const base = norm(spec.slice(2));
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ]) {
      if (known.has(candidate)) return candidate;
    }
    return null;
  }
  if (!spec.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(path.join(projectRoot, fromRel)), spec);
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = norm(path.relative(projectRoot, resolved + ext));
    if (known.has(candidate)) return candidate;
  }
  return null;
}

function collectNavRelevantFiles(): Set<string> {
  const files = new Set<string>();

  function walk(dirRel: string): void {
    const abs = path.join(projectRoot, dirRel);
    if (!existsSync(abs)) return;
    for (const ent of readdirSync(abs)) {
      if (ent.startsWith('.') || ent === 'node_modules') continue;
      const rel = norm(path.join(dirRel, ent));
      if (isCategoricallyExempt(rel)) continue;
      const full = path.join(projectRoot, rel);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(rel);
      } else if (/\.(tsx?|mdc?|md)$/.test(ent) || (dirRel === 'scripts' && ent.endsWith('.sh'))) {
        files.add(rel);
      }
    }
  }

  for (const root of SCAN_ROOTS) walk(root);

  for (const ent of readdirSync(projectRoot)) {
    if (/\.(md|mdc)$/.test(ent)) files.add(norm(ent));
    if (/\.tsx?$/.test(ent) && !BOOTSTRAP_EXEMPT.has(ent)) files.add(norm(ent));
  }

  return files;
}

function loadPackageScriptTargets(): Set<string> {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const targets = new Set<string>();
  const testFileRe = /scripts\/__tests__\/[^\s&;|]+\.test\.ts/g;
  for (const cmd of Object.values(pkg.scripts ?? {})) {
    let m: RegExpExecArray | null;
    NPM_TSX_RE.lastIndex = 0;
    while ((m = NPM_TSX_RE.exec(cmd)) !== null) targets.add(norm(m[1]));
    testFileRe.lastIndex = 0;
    while ((m = testFileRe.exec(cmd)) !== null) targets.add(norm(m[0]));
  }
  return targets;
}

function loadCiScriptTargets(): Set<string> {
  const targets = new Set<string>();
  const workflowsDir = path.join(projectRoot, '.github', 'workflows');
  if (!existsSync(workflowsDir)) return targets;
  for (const ent of readdirSync(workflowsDir)) {
    if (!ent.endsWith('.yml') && !ent.endsWith('.yaml')) continue;
    const text = readFileSync(path.join(workflowsDir, ent), 'utf8');
    let m: RegExpExecArray | null;
    CI_SCRIPT_RE.lastIndex = 0;
    while ((m = CI_SCRIPT_RE.exec(text)) !== null) targets.add(norm(m[1]));
  }
  return targets;
}

export function buildReachableSet(allFiles: Set<string>): Set<string> {
  const reachable = new Set<string>();
  const indexText = readFileSync(AGENT_INDEX, 'utf8');
  const queue: string[] = [];

  const enqueue = (p: string): void => {
    const n = norm(p);
    if (reachable.has(n)) return;
    reachable.add(n);
    queue.push(n);
  };

  enqueue('docs/AGENT_INDEX.md');
  for (const seed of parseAgentIndexSeeds(indexText)) enqueue(seed);
  for (const t of loadPackageScriptTargets()) enqueue(t);
  for (const t of loadCiScriptTargets()) enqueue(t);
  for (const t of loadInventoryArchivePaths()) {
    reachable.add(t);
    if (/\.tsx?$/.test(t)) enqueue(t);
  }
  for (const t of loadRedirectStubs()) reachable.add(t);
  for (const t of collectNextJsEntryFiles(allFiles)) enqueue(t);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const abs = path.join(projectRoot, current);
    if (!existsSync(abs)) continue;
    if (/\.(md|mdc)$/.test(current)) {
      const text = readFileSync(abs, 'utf8');
      for (const cited of collectPathsFromMarkdown(text)) enqueue(cited);
    }
    if (/\.tsx?$/.test(current)) {
      const text = readFileSync(abs, 'utf8');
      let m: RegExpExecArray | null;
      IMPORT_SPEC_RE.lastIndex = 0;
      while ((m = IMPORT_SPEC_RE.exec(text)) !== null) {
        const spec = m[1] ?? m[2];
        if (!spec) continue;
        const resolved = resolveImportSpec(current, spec, allFiles);
        if (resolved) enqueue(resolved);
      }
    }
  }

  return reachable;
}

export function findNavigationOrphans(allFiles: Set<string>, reachable: Set<string>): string[] {
  const orphans: string[] = [];
  for (const file of allFiles) {
    if (isCategoricallyExempt(file)) continue;
    if (BOOTSTRAP_EXEMPT.has(path.basename(file))) continue;
    if (loadInventoryArchivePaths().has(file)) continue;
    if (loadRedirectStubs().has(file)) continue;
    if (reachable.has(file)) continue;
    orphans.push(file);
  }
  return orphans.sort();
}

test('fixture: known-GOOD navigable file is reachable from AGENT_INDEX', () => {
  const all = collectNavRelevantFiles();
  const reachable = buildReachableSet(all);
  assert.ok(all.has(NAVIGABLE_FILE_KNOWN_GOOD.path));
  assert.ok(
    reachable.has(NAVIGABLE_FILE_KNOWN_GOOD.path),
    `${NAVIGABLE_FILE_KNOWN_GOOD.path} must be reachable (${NAVIGABLE_FILE_KNOWN_GOOD.reason})`,
  );
});

test('fixture: known-BAD orphan pattern is not reachable', () => {
  const all = collectNavRelevantFiles();
  const reachable = buildReachableSet(all);
  assert.equal(reachable.has(ORPHAN_PATH_KNOWN_BAD.path), false);
  assert.match(ORPHAN_PATH_KNOWN_BAD.description, /unwired|orphan/i);
});

test('shell scripts are reachable via AGENT_INDEX docs chain or CI', () => {
  const all = collectNavRelevantFiles();
  const reachable = buildReachableSet(all);
  assert.ok(all.has('scripts/setup-github-secrets.sh'));
  assert.ok(all.has('scripts/exclude-fetch-failed-artifacts.sh'));
  assert.ok(reachable.has('scripts/setup-github-secrets.sh'), 'SETUP.md/KEYS.md chain from AGENT_INDEX');
  assert.ok(reachable.has('scripts/exclude-fetch-failed-artifacts.sh'), 'refresh-data.yml CI reference');
});

test('every nav-relevant file is reachable from AGENT_INDEX, npm/CI, or archive inventory', () => {
  const all = collectNavRelevantFiles();
  const reachable = buildReachableSet(all);
  const orphans = findNavigationOrphans(all, reachable);
  assert.equal(
    orphans.length,
    0,
    `navigation orphans (first 20):\n${orphans.slice(0, 20).join('\n')}`,
  );
});
