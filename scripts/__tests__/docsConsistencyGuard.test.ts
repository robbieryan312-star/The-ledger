/**
 * Build-gated guard: doc contradictions (retired scripts, guard counts, migrated count,
 * legacy Tier labels, §1.1 citations). §6 fixture append-only.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  KEYS_REGISTRY_CROSSREF_KNOWN_GOOD,
  MIGRATED_COUNT_KNOWN_GOOD,
  POSTBUILD_RENDER_INTEGRITY_KNOWN_GOOD,
  PREBUILD_COUNT_KNOWN_GOOD,
  RETIRED_SCRIPT_KNOWN_BAD,
  SECTION_CITE_KNOWN_GOOD,
  TIER_LABEL_KNOWN_BAD,
} from '../../lib/data/__fixtures__/docsConsistencyGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARCHIVE = path.join(projectRoot, 'docs', 'archive');
const SKIP_DIRS = new Set([ARCHIVE]);

function walkDocs(dir: string, acc: string[] = []): string[] {
  if (SKIP_DIRS.has(dir)) return acc;
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    if (SKIP_DIRS.has(full)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkDocs(full, acc);
    else if (ent.endsWith('.md') || ent.endsWith('.mdc')) acc.push(full);
  }
  return acc;
}

function activeDocFiles(): string[] {
  const roots = [
    projectRoot,
    path.join(projectRoot, 'docs'),
    path.join(projectRoot, 'lib', 'data'),
    path.join(projectRoot, '.cursor', 'rules'),
  ];
  const files: string[] = [];
  for (const root of roots) {
    if (!statSync(root).isDirectory()) continue;
    if (root === projectRoot) {
      for (const f of readdirSync(root)) {
        if (f.endsWith('.md')) files.push(path.join(root, f));
      }
    } else {
      files.push(...walkDocs(root));
    }
  }
  return files.filter((f) => !f.includes(`${path.sep}docs${path.sep}archive${path.sep}`));
}

function countPrebuildCommands(): number {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: { prebuild?: string };
  };
  const prebuild = pkg.scripts?.prebuild ?? '';
  return prebuild.split('&&').map((s) => s.trim()).filter((s) => s.startsWith('npm run ')).length;
}

function loadManifestCount(): number {
  const raw = JSON.parse(
    readFileSync(path.join(projectRoot, MIGRATED_COUNT_KNOWN_GOOD.manifestPath), 'utf8'),
  ) as { count?: number };
  return raw.count ?? 0;
}

test('fixture: legacy Tier label is banned pattern', () => {
  assert.match(TIER_LABEL_KNOWN_BAD, /Tier [1-4]/);
});

test('(a) active docs must not claim a script is retired/removed while it exists in package.json', () => {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const retiredRe =
    /(?:retired|removed from package\.json|no longer exists)[^.]*\b(ingest:[a-z0-9-]+|sync:[a-z0-9-]+)/gi;
  const violations: string[] = [];
  for (const file of activeDocFiles()) {
    const text = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = retiredRe.exec(text)) !== null) {
      const script = m[1];
      if (pkg.scripts?.[script]) {
        violations.push(`${path.relative(projectRoot, file)}: claims ${script} retired but script exists`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `retired-script doc violations:\n${violations.join('\n')}`,
  );
});

test('(b) AGENT_INDEX prebuild command count matches package.json', () => {
  const actual = countPrebuildCommands();
  const index = readFileSync(path.join(projectRoot, 'docs/AGENT_INDEX.md'), 'utf8');
  const match = index.match(/(\d+) commands in prebuild/);
  assert.ok(match, 'AGENT_INDEX must state prebuild command count');
  assert.equal(
    Number(match[1]),
    actual,
    `AGENT_INDEX says ${match[1]} prebuild commands; package.json has ${actual}`,
  );
  assert.equal(actual, PREBUILD_COUNT_KNOWN_GOOD.expectedPrebuildCommands);
});

test('(b2) default postbuild includes render-integrity guard', () => {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: { postbuild?: string };
  };
  const postbuild = pkg.scripts?.postbuild ?? '';
  assert.match(
    postbuild,
    new RegExp(`npm run ${POSTBUILD_RENDER_INTEGRITY_KNOWN_GOOD.requiredScript}`),
    'npm run build must enforce render-integrity by default',
  );
});

test('(c) migrated count in PROGRESS points to manifest count 7', () => {
  const manifestCount = loadManifestCount();
  assert.equal(manifestCount, MIGRATED_COUNT_KNOWN_GOOD.expectedCount);
  const progress = readFileSync(path.join(projectRoot, 'PROGRESS.md'), 'utf8');
  assert.match(
    progress,
    new RegExp(`\\*\\*${PREBUILD_COUNT_KNOWN_GOOD.expectedPrebuildCommands}\\*\\* prebuild commands`),
  );
  assert.match(progress, /7\/537/);
});

test('(d) no legacy "Tier N" labels outside docs/archive', () => {
  const tierRe = /\bTier [1-4]\b/;
  const violations: string[] = [];
  for (const file of activeDocFiles()) {
    const text = readFileSync(file, 'utf8');
    if (
      text.includes('never "Tier 1/2/3/4"') ||
      text.includes('not "Tier 1/2/3/4"') ||
      text.includes('never write "Tier 1/2/3/4"')
    ) {
      continue;
    }
    if (tierRe.test(text)) {
      violations.push(path.relative(projectRoot, file));
    }
  }
  assert.equal(violations.length, 0, `Tier N labels in active docs:\n${violations.join('\n')}`);
});

test('(e) §1.1 letter citations in core-rules resolve to real headings', () => {
  const core = readFileSync(path.join(projectRoot, '.cursor/rules/ledger-core-rules.mdc'), 'utf8');
  const cites = [...core.matchAll(/§1\.1 ([A-K])\b/g)].map((m) => m[1]);
  const headings = new Set(
    [...core.matchAll(/^#### ([A-K])\./gm)].map((m) => m[1]),
  );
  const missing = [...new Set(cites)].filter((letter) => !headings.has(letter));
  assert.equal(missing.length, 0, `Unresolved §1.1 letters: ${missing.join(', ')}`);
  assert.match(core, SECTION_CITE_KNOWN_GOOD.headingPattern);
});

test('(f) source constitution exists and KEYS.md points routing at it', () => {
  const registry = path.join(projectRoot, KEYS_REGISTRY_CROSSREF_KNOWN_GOOD.registryFile);
  assert.ok(existsSync(registry), 'docs/OBJECTIVE_SOURCES.md (source constitution) must exist');
  const keys = readFileSync(path.join(projectRoot, KEYS_REGISTRY_CROSSREF_KNOWN_GOOD.keysFile), 'utf8');
  assert.ok(
    keys.includes(KEYS_REGISTRY_CROSSREF_KNOWN_GOOD.keysMustCite),
    'KEYS.md must cite docs/OBJECTIVE_SOURCES.md as the routing owner (one fact, one owner)',
  );
});

test('(g) source constitution declares the corroboration floor + living-registry rule', () => {
  const registry = readFileSync(
    path.join(projectRoot, KEYS_REGISTRY_CROSSREF_KNOWN_GOOD.registryFile),
    'utf8',
  );
  assert.match(registry, /CORROBORATION FLOOR/i);
  assert.match(registry, /LIVING REGISTRY/i);
});

test('fixture contract: RETIRED_SCRIPT_KNOWN_BAD script exists when scriptMustExist', () => {
  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  if (RETIRED_SCRIPT_KNOWN_BAD.scriptMustExist) {
    assert.ok(pkg.scripts?.[RETIRED_SCRIPT_KNOWN_BAD.scriptName]);
  }
});
