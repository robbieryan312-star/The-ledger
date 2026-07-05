/**
 * Build-gated guard: data/ layout — allowed top-level dirs only; every file referenced or allowlisted.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA_ROOT = path.join(projectRoot, 'data');
const ALLOWED_TOP = new Set(['national', 'florida', 'cache', 'reports']);
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md']);

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    if (ent === 'node_modules' || ent === '.next' || ent === '.git') continue;
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function normalizeDataRef(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^data\//, '');
}

function collectDataReferences(): Set<string> {
  const refs = new Set<string>();
  const re = /data\/([a-zA-Z0-9_./-]+)/g;
  const roots = [
    path.join(projectRoot, 'scripts'),
    path.join(projectRoot, 'lib'),
    path.join(projectRoot, 'docs'),
    path.join(projectRoot, '.github'),
  ];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of walkFiles(root)) {
      if (!SCAN_EXT.has(path.extname(file))) continue;
      const text = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        let ref = m[1].replace(/[#?].*$/, '').replace(/['")\]]+$/, '');
        if (ref.endsWith('/')) ref = ref.slice(0, -1);
        if (ref) refs.add(ref);
      }
    }
  }
  return refs;
}

function loadDeletionAllowlist(): Set<string> {
  const allow = new Set<string>();
  const file = path.join(DATA_ROOT, 'DELETION_CANDIDATES.md');
  if (!existsSync(file)) return allow;
  const text = readFileSync(file, 'utf8');
  const re = /`data\/([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    allow.add(m[1]);
  }
  return allow;
}

function listDataFiles(): string[] {
  const files: string[] = [];
  function walk(rel: string) {
    const full = path.join(DATA_ROOT, rel);
    for (const ent of readdirSync(full)) {
      const child = rel ? `${rel}/${ent}` : ent;
      const childFull = path.join(DATA_ROOT, child);
      if (statSync(childFull).isDirectory()) walk(child);
      else if (!ent.endsWith('.md')) files.push(child);
    }
  }
  walk('');
  return files;
}

test('data/ top-level dirs are only national, florida, cache, reports (+ README)', () => {
  const top = readdirSync(DATA_ROOT).filter((e) => e !== 'README.md' && !e.startsWith('.'));
  const bad = top.filter((e) => !ALLOWED_TOP.has(e) && statSync(path.join(DATA_ROOT, e)).isDirectory());
  assert.equal(bad.length, 0, `unexpected data/ top-level dirs: ${bad.join(', ')}`);
});

test('every data/ file is referenced in code or listed in DELETION_CANDIDATES.md', () => {
  const refs = collectDataReferences();
  const allowlist = loadDeletionAllowlist();
  const orphans: string[] = [];

  for (const rel of listDataFiles()) {
    if (rel.startsWith('cache/')) continue;
    const norm = normalizeDataRef(rel);
    const referenced = [...refs].some(
      (r) => norm === r || norm.endsWith(r) || r.endsWith(norm) || norm.includes(r) || r.includes(norm),
    );
    const allowlisted = allowlist.has(norm) || [...allowlist].some((a) => norm === a || norm.endsWith(a));
    if (!referenced && !allowlisted) orphans.push(rel);
  }

  assert.equal(
    orphans.length,
    0,
    `unreferenced data files (first 15):\n${orphans.slice(0, 15).map((o) => `  data/${o}`).join('\n')}`,
  );
});

test('guard demo: stray top-level data/ dir would fail allowlist', () => {
  assert.equal(ALLOWED_TOP.has('fec'), false);
  assert.equal(ALLOWED_TOP.has('florida'), true);
});
