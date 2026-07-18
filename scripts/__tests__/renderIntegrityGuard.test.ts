/**
 * Build-gated guard: rendered pages pass visual integrity (Playwright).
 * Requires prior `npm run build` — runs via postbuild chain.
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  RENDER_INTEGRITY_KNOWN_BAD,
  RENDER_INTEGRITY_SCREENSHOT_DIR,
} from '../../lib/data/__fixtures__/renderIntegrityGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('fixture: education overflow case is documented regression', () => {
  assert.equal(RENDER_INTEGRITY_KNOWN_BAD.defect, 'education-table-column-overflow');
  assert.match(RENDER_INTEGRITY_KNOWN_BAD.description, /overflow|past card edge/);
});

test('render integrity check passes after production build', { timeout: 480_000 }, () => {
  if (!existsSync(path.join(projectRoot, '.next'))) {
    assert.fail('missing .next — run npm run build before render-integrity guard');
  }
  const out = execSync('npx tsx scripts/render-integrity-check.ts', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 420_000,
    env: { ...process.env, CI: '1' },
  });
  const lastLine = out.trim().split('\n').pop() ?? '';
  const parsed = JSON.parse(lastLine) as { ok: boolean; screenshots?: number };
  assert.equal(parsed.ok, true);
  assert.ok((parsed.screenshots ?? 0) >= 2, 'expected contact-sheet screenshots for FL page');
  const sheet = path.join(projectRoot, RENDER_INTEGRITY_SCREENSHOT_DIR, 'contact-sheet.json');
  assert.ok(existsSync(sheet), 'contact-sheet.json must be emitted');
});
