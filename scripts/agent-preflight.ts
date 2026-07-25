/**
 * Agent session preflight — verify session-start files, guard scripts, and audit inventory.
 * Run: npm run agent:preflight
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY_FILE = path.join(projectRoot, 'data', 'reports', 'file-inventory.json');
const INVENTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_START_FILES = [
  '.cursor/rules/ledger-pre-ingest.mdc',
  '.cursor/rules/ledger-core-rules.mdc',
  'docs/CURSOR_IMPLEMENTATION_MANUAL.md',
  'AGENTS.md',
  'docs/workflows/AGENT_HANDOFF_LOG.md',
  'PROGRESS.md',
  'lib/data/SOURCE_LOOKUP.md',
  'KEYS.md',
  'REPO.md',
  'PILOT_PROFILE_CHECKLIST.md',
  'docs/AGENT_INDEX.md',
  'docs/workflows/FILE_AUDIT_LEDGER.md',
];

const REQUIRED_SCRIPTS = [
  'profile:build',
  'audit:inventory',
  'test:docs-integrity',
  'test:data-layout',
  'test:env-truth',
  'sync:legislators',
  'verify:office',
  'build',
];

/** Top-level sync scripts must document output in header (Output: line). */
function syncScriptsMissingOutputHeader(): string[] {
  const scriptsDir = path.join(projectRoot, 'scripts');
  const missing: string[] = [];
  for (const ent of readdirSync(scriptsDir)) {
    if (!ent.startsWith('sync-') || !ent.endsWith('.ts')) continue;
    const full = path.join(scriptsDir, ent);
    if (!statSync(full).isFile()) continue;
    const head = readFileSync(full, 'utf8').slice(0, 1200);
    const hasOutputDoc =
      /Output:/i.test(head) ||
      /writes[\s\S]{0,120}\.(json|md)/i.test(head);
    if (!hasOutputDoc) {
      missing.push(`scripts/${ent}`);
    }
  }
  return missing;
}

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

  if (!existsSync(INVENTORY_FILE)) {
    fail('missing data/reports/file-inventory.json — run npm run audit:inventory');
  }
  const inv = JSON.parse(readFileSync(INVENTORY_FILE, 'utf8')) as { generatedAt?: string };
  if (inv.generatedAt) {
    const age = Date.now() - new Date(inv.generatedAt).getTime();
    if (age > INVENTORY_MAX_AGE_MS) {
      fail(`file inventory stale (${Math.floor(age / 86400000)}d) — run npm run audit:inventory`);
    }
  }

  const missingHeaders = syncScriptsMissingOutputHeader();
  if (missingHeaders.length > 0) {
    fail(`sync scripts missing Output: header: ${missingHeaders.slice(0, 5).join(', ')}${missingHeaders.length > 5 ? '…' : ''}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      preflight: 'session-start files, guard scripts, and audit inventory present',
      sessionFiles: SESSION_START_FILES.length,
      guardScripts: REQUIRED_SCRIPTS.length,
      at: new Date().toISOString(),
    }),
  );
}

main();
