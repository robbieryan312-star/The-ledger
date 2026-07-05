/**
 * Agent session preflight — verify session-start files and guard scripts exist.
 * Run: npm run agent:preflight
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SESSION_START_FILES = [
  '.cursor/rules/ledger-core-rules.mdc',
  'PROGRESS.md',
  'lib/data/SOURCE_LOOKUP.md',
  'KEYS.md',
  'REPO.md',
  'PILOT_PROFILE_CHECKLIST.md',
  'docs/AGENT_INDEX.md',
];

const REQUIRED_SCRIPTS = [
  'profile:build',
  'test:docs-integrity',
  'test:data-layout',
  'test:env-truth',
  'sync:legislators',
  'verify:office',
  'build',
];

function fail(message: string): never {
  console.error(JSON.stringify({ ok: false, preflight: message, at: new Date().toISOString() }));
  process.exit(1);
}

function main(): void {
  const missingFiles = SESSION_START_FILES.filter((rel) => !existsSync(path.join(projectRoot, rel)));
  if (missingFiles.length > 0) {
    fail(`missing session-start files: ${missingFiles.join(', ')}`);
  }

  const pkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const scripts = new Set(Object.keys(pkg.scripts ?? {}));
  const missingScripts = REQUIRED_SCRIPTS.filter((s) => !scripts.has(s));
  if (missingScripts.length > 0) {
    fail(`missing npm scripts: ${missingScripts.join(', ')}`);
  }

  if (!existsSync(path.join(projectRoot, 'scripts/lib/dataPaths.ts'))) {
    fail('missing scripts/lib/dataPaths.ts');
  }

  console.log(
    JSON.stringify({
      ok: true,
      preflight: 'session-start files and guard scripts present',
      sessionFiles: SESSION_START_FILES.length,
      guardScripts: REQUIRED_SCRIPTS.length,
      at: new Date().toISOString(),
    }),
  );
}

main();
