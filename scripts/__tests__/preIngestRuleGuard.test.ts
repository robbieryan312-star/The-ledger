/**
 * Build-gated: pre-ingest hygiene rule must exist, alwaysApply, and stay wired
 * into core-rules HARD RULES + session start (VoteSmart-class confusion ban).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRE_INGEST = path.join(projectRoot, '.cursor/rules/ledger-pre-ingest.mdc');
const CORE = path.join(projectRoot, '.cursor/rules/ledger-core-rules.mdc');

test('ledger-pre-ingest.mdc exists with alwaysApply and binding triggers', () => {
  assert.ok(existsSync(PRE_INGEST), 'missing .cursor/rules/ledger-pre-ingest.mdc');
  const text = readFileSync(PRE_INGEST, 'utf8');
  assert.match(text, /alwaysApply:\s*true/);
  assert.match(text, /before EVERY instruction/i);
  assert.match(text, /EMPTY ≠ owner debt|EMPTY is session inventory|not an owner debt/i);
  assert.match(text, /RETIRED\s*\/\s*DEFUNCT|RETIRED \/ DEFUNCT/i);
  assert.match(text, /VOTESMART_API_KEY|VoteSmart/);
  assert.match(text, /Never imply|never imply/i);
});

test('core-rules HARD RULES point at ledger-pre-ingest.mdc', () => {
  const core = readFileSync(CORE, 'utf8');
  assert.match(core, /Pre-ingest hygiene/);
  assert.match(core, /ledger-pre-ingest\.mdc/);
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
