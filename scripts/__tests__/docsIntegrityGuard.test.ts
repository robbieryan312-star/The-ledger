/**
 * Build-gated guard: npm scripts and repo paths cited in docs must exist.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOC_ROOTS = [
  projectRoot,
  path.join(projectRoot, 'docs'),
  path.join(projectRoot, 'lib', 'data'),
  path.join(projectRoot, '.cursor', 'rules'),
];
const SKIP_DOC = new Set([
  path.join(projectRoot, 'docs', 'archive'),
  path.join(projectRoot, 'docs', 'progress'),
]);

/** Sync/ingest outputs documented before first run in a fresh clone. */
const ALLOW_MISSING_PATHS = new Set([
  'data/florida/fec/florida-candidates.json',
  'lib/data/generated/newsNational.json',
]);

function walkMd(dir: string, acc: string[] = []): string[] {
  if (SKIP_DOC.has(dir)) return acc;
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    if (SKIP_DOC.has(full)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkMd(full, acc);
    else if (ent.endsWith('.md') || ent.endsWith('.mdc')) acc.push(full);
  }
  return acc;
}

function loadPackageScripts(): Set<string> {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  return new Set(Object.keys(pkg.scripts ?? {}));
}

function collectDocCitations(): { npmScripts: string[]; paths: string[] } {
  const npmScripts: string[] = [];
  const paths: string[] = [];
  const npmRe = /npm run ([a-zA-Z0-9:_-]+)/g;
  const pathRe = /`((?:\.cursor|docs|lib|scripts|app|components|data)\/[a-zA-Z0-9_./-]+\.(?:md|mdc|ts|tsx|json|yml))`/g;

  for (const root of DOC_ROOTS) {
    if (!existsSync(root)) continue;
    const files = root === projectRoot
      ? readdirSync(root)
          .filter((f) => f.endsWith('.md'))
          .map((f) => path.join(root, f))
      : walkMd(root);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = npmRe.exec(text)) !== null) {
        const name = m[1];
        if (name.endsWith(':') || name.endsWith('*')) continue;
        npmScripts.push(name);
      }
      while ((m = pathRe.exec(text)) !== null) paths.push(m[1]);
    }
  }
  return { npmScripts, paths };
}

test('every npm run script cited in docs exists in package.json', () => {
  const scripts = loadPackageScripts();
  const { npmScripts } = collectDocCitations();
  const missing = [...new Set(npmScripts)].filter((s) => !scripts.has(s)).sort();
  assert.equal(
    missing.length,
    0,
    `docs cite npm scripts not in package.json: ${missing.join(', ')}`,
  );
});

test('every backtick repo path cited in docs exists on disk', () => {
  const { paths } = collectDocCitations();
  const missing = [...new Set(paths)].filter(
    (p) => !existsSync(path.join(projectRoot, p)) && !ALLOW_MISSING_PATHS.has(p),
  ).sort();
  assert.equal(
    missing.length,
    0,
    `docs cite missing paths (first 15):\n${missing.slice(0, 15).map((p) => `  ${p}`).join('\n')}`,
  );
});

test('guard demo: fake npm script citation would fail', () => {
  const scripts = new Set(['build', 'sync:legislators']);
  assert.equal(scripts.has('sync:totally-fake'), false);
});

test('sync script headers cite npm run commands that exist in package.json', () => {
  const scripts = loadPackageScripts();
  const scriptsDir = path.join(projectRoot, 'scripts');
  const missing: string[] = [];
  const npmRe = /npm run ([a-zA-Z0-9:_-]+)/g;

  for (const ent of readdirSync(scriptsDir)) {
    if (!ent.endsWith('.ts') || ent.startsWith('__tests__')) continue;
    const file = path.join(scriptsDir, ent);
    const text = readFileSync(file, 'utf8');
    const header = text.slice(0, Math.min(text.length, 1200));
    let m: RegExpExecArray | null;
    while ((m = npmRe.exec(header)) !== null) {
      const name = m[1];
      if (name.endsWith(':') || name.endsWith('*')) continue;
      if (!scripts.has(name)) missing.push(`${ent}: npm run ${name}`);
    }
  }

  assert.equal(
    missing.length,
    0,
    `sync script headers cite missing npm scripts:\n${missing.slice(0, 10).join('\n')}`,
  );
});
