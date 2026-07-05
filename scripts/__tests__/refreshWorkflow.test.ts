import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const SCRIPT = path.join(process.cwd(), 'scripts', 'exclude-fetch-failed-artifacts.sh');

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

test('refresh cleanup restores tracked failed artifacts and removes untracked failed artifacts', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'ledger-refresh-'));
  mkdirSync(path.join(repo, 'data'), { recursive: true });
  mkdirSync(path.join(repo, 'lib', 'data', 'generated'), { recursive: true });

  git(repo, ['init']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Test User']);

  const tracked = path.join(repo, 'data', 'tracked.json');
  const safeNew = path.join(repo, 'data', 'new-safe.json');
  const failedNew = path.join(repo, 'data', 'new-failed.json');
  const generatedFailed = path.join(repo, 'lib', 'data', 'generated', 'sourcesIndex.json');
  const original = '{ "status": "ok", "records": [1] }\n';

  writeFileSync(tracked, original, 'utf8');
  git(repo, ['add', 'data/tracked.json']);
  git(repo, ['commit', '-m', 'seed']);

  writeFileSync(tracked, '{ "status": "fetch-failed", "records": [] }\n', 'utf8');
  writeFileSync(safeNew, '{ "status": "ok", "records": [2] }\n', 'utf8');
  writeFileSync(failedNew, '{ "status": "fetch-blocked", "records": [] }\n', 'utf8');
  writeFileSync(generatedFailed, '{ "status": "unavailable", "sources": [] }\n', 'utf8');

  execFileSync('bash', [SCRIPT], { cwd: repo, encoding: 'utf8' });

  assert.equal(readFileSync(tracked, 'utf8'), original);
  assert.equal(existsSync(safeNew), true);
  assert.equal(existsSync(failedNew), false);
  assert.equal(existsSync(generatedFailed), false);

  git(repo, ['add', 'data/', 'lib/data/generated/']);
  const staged = git(repo, ['diff', '--cached', '--name-only']);
  assert.equal(staged.trim(), 'data/new-safe.json');
});
