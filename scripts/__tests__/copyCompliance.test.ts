/**
 * UI copy compliance — no Tier N labels or Wikipedia references in user-facing surfaces.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOTS = ['app', 'components'].map((d) => path.join(process.cwd(), d));
const TIER_PATTERN = /Tier\s+[0-9]/i;
const WIKI_PATTERN = /wikipedia/i;

function collectTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectTsxFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

test('app/ and components/ contain no Tier N copy or Wikipedia references', () => {
  const violations: string[] = [];
  for (const root of ROOTS) {
    for (const file of collectTsxFiles(root)) {
      const content = readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        if (TIER_PATTERN.test(line)) {
          violations.push(`${file}:${idx + 1}: Tier N phrasing — ${line.trim().slice(0, 80)}`);
        }
        if (WIKI_PATTERN.test(line)) {
          violations.push(`${file}:${idx + 1}: Wikipedia reference — ${line.trim().slice(0, 80)}`);
        }
      });
    }
  }
  assert.equal(
    violations.length,
    0,
    `copy compliance violations:\n${violations.join('\n')}`,
  );
});
