/**
 * Build-gated: pre-ingest = Cursor compliance gate.
 * Must alwaysApply, ban EMPTY≠owner-debt confusion, and incorporate the full
 * Cursor-directed corpus (paths exist + are listed in ledger-pre-ingest.mdc).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRE_INGEST = path.join(projectRoot, '.cursor/rules/ledger-pre-ingest.mdc');
const CORE = path.join(projectRoot, '.cursor/rules/ledger-core-rules.mdc');

/** Cursor-directed corpus that pre-ingest must incorporate by path (absolute compliance). */
const CURSOR_BINDING_CORPUS = [
  '.cursor/rules/ledger-pre-ingest.mdc',
  '.cursor/rules/ledger-core-rules.mdc',
  'docs/CURSOR_IMPLEMENTATION_MANUAL.md',
  'docs/AGENT_INDEX.md',
  'AGENTS.md',
  '.cursor/rules/ledger-data-policy.mdc',
  '.cursor/rules/ledger-editorial-voice.mdc',
  '.cursor/rules/ledger-build-workflow.mdc',
  'docs/workflows/AGENT_HANDOFF_LOG.md',
  'docs/workflows/IMPROVEMENT_BACKLOG.md',
  'KEYS.md',
  'docs/OBJECTIVE_SOURCES.md',
  'lib/data/SOURCE_LOOKUP.md',
  'REPO.md',
  'PILOT_PROFILE_CHECKLIST.md',
  'PROGRESS.md',
] as const;

test('ledger-pre-ingest.mdc exists with alwaysApply and binding triggers', () => {
  assert.ok(existsSync(PRE_INGEST), 'missing .cursor/rules/ledger-pre-ingest.mdc');
  const text = readFileSync(PRE_INGEST, 'utf8');
  assert.match(text, /alwaysApply:\s*true/);
  assert.match(text, /before EVERY instruction/i);
  assert.match(text, /Absolute compliance|absolute compliance/);
  assert.match(text, /Cursor agent compliance gate|Cursor compliance gate/);
  assert.match(text, /EMPTY ≠ owner debt|EMPTY is session inventory|not an owner debt/i);
  assert.match(text, /RETIRED\s*\/\s*DEFUNCT|RETIRED \/ DEFUNCT/i);
  assert.match(text, /VOTESMART_API_KEY|VoteSmart/);
  assert.match(text, /Never imply|never imply/i);
  assert.match(text, /Confront Claude/);
  assert.match(text, /CURSOR_IMPLEMENTATION_MANUAL/);
});

test('pre-ingest incorporates every Cursor-directed corpus path (exists + listed)', () => {
  const text = readFileSync(PRE_INGEST, 'utf8');
  const missingOnDisk: string[] = [];
  const missingInGate: string[] = [];
  for (const rel of CURSOR_BINDING_CORPUS) {
    const abs = path.join(projectRoot, rel);
    if (!existsSync(abs)) missingOnDisk.push(rel);
    // Listed as a path token in the corpus table / checklist
    if (!text.includes(rel) && !text.includes(`\`${rel}\``)) {
      missingInGate.push(rel);
    }
  }
  assert.equal(
    missingOnDisk.length,
    0,
    `Cursor corpus files missing on disk:\n${missingOnDisk.join('\n')}`,
  );
  assert.equal(
    missingInGate.length,
    0,
    `Cursor corpus paths not listed in ledger-pre-ingest.mdc:\n${missingInGate.join('\n')}`,
  );
});

test('core-rules HARD RULES point at ledger-pre-ingest as Cursor compliance gate', () => {
  const core = readFileSync(CORE, 'utf8');
  assert.match(core, /Pre-ingest \+ Cursor compliance gate|Pre-ingest hygiene|Cursor compliance gate/);
  assert.match(core, /ledger-pre-ingest\.mdc/);
  assert.match(core, /absolute compliance/);
  assert.match(
    core,
    /Session start[\s\S]*?ledger-pre-ingest\.mdc/,
  );
});

test('KEYS.md documents EMPTY ≠ owner debt', () => {
  const keys = readFileSync(path.join(projectRoot, 'KEYS.md'), 'utf8');
  assert.match(keys, /EMPTY ≠ owner debt|EMPTY != owner debt/i);
  assert.match(keys, /ledger-pre-ingest\.mdc/);
});

test('Cursor implementation manual is mandatory every turn', () => {
  const manual = readFileSync(
    path.join(projectRoot, 'docs/CURSOR_IMPLEMENTATION_MANUAL.md'),
    'utf8',
  );
  assert.match(manual, /MANDATORY|read EVERY turn/i);
  assert.match(manual, /ledger-pre-ingest\.mdc/);
});
