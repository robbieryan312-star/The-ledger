/**
 * Build-gated: exactly one improvement backlog file; zero "## Improvement backlog" elsewhere;
 * canonical "## Backlog" appears exactly once under docs/ (only in IMPROVEMENT_BACKLOG.md).
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  IMPROVEMENT_BACKLOG_CANONICAL_PATH,
  IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG,
  IMPROVEMENT_BACKLOG_KNOWN_BAD_SECOND_HEADING,
  IMPROVEMENT_BACKLOG_KNOWN_GOOD,
} from '../../lib/data/__fixtures__/improvementBacklog.fixture';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function walkMd(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkMd(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

function countHeadingMatches(text: string, re: RegExp): number {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  return [...text.matchAll(global)].length;
}

test('canonical IMPROVEMENT_BACKLOG.md exists with required sections', () => {
  const abs = path.join(root, IMPROVEMENT_BACKLOG_KNOWN_GOOD.path);
  assert.ok(existsSync(abs), `missing ${IMPROVEMENT_BACKLOG_CANONICAL_PATH}`);
  const text = readFileSync(abs, 'utf8');
  assert.ok(text.startsWith(IMPROVEMENT_BACKLOG_KNOWN_GOOD.requiredTitle));
  assert.ok(text.includes(IMPROVEMENT_BACKLOG_KNOWN_GOOD.requiredOwnerDashboardSection));
  assert.equal(
    countHeadingMatches(text, IMPROVEMENT_BACKLOG_KNOWN_GOOD.requiredBacklogHeading),
    1,
    'canonical file must contain exactly one "## Backlog" heading',
  );
});

test('fixture: no "## Improvement backlog" heading under docs/ outside canonical', () => {
  const docsRoot = path.join(root, 'docs');
  const files = walkMd(docsRoot);
  const hits: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel === IMPROVEMENT_BACKLOG_CANONICAL_PATH) continue;
    const text = readFileSync(file, 'utf8');
    if (IMPROVEMENT_BACKLOG_KNOWN_BAD_SECOND_HEADING.bannedHeading.test(text)) {
      hits.push(rel);
    }
  }
  assert.equal(
    hits.length,
    IMPROVEMENT_BACKLOG_KNOWN_BAD_SECOND_HEADING.maxHeadingsAcrossDocs,
    `DOC-07: second backlog heading(s) in:\n${hits.join('\n')}`,
  );
});

test('fixture: "## Backlog" appears exactly once under docs/ (canonical only)', () => {
  const docsRoot = path.join(root, 'docs');
  const files = walkMd(docsRoot);
  const hits: { path: string; count: number }[] = [];
  let total = 0;
  for (const file of files) {
    const rel = path.relative(root, file);
    const text = readFileSync(file, 'utf8');
    const count = countHeadingMatches(
      text,
      IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG.backlogHeading,
    );
    if (count > 0) {
      hits.push({ path: rel, count });
      total += count;
    }
  }
  assert.equal(
    total,
    IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG.maxOccurrencesAcrossDocs,
    `DOC-07: "## Backlog" must appear exactly once; found ${total} in:\n${hits
      .map((h) => `${h.path}×${h.count}`)
      .join('\n')}`,
  );
  assert.equal(hits.length, 1, `expected one file with "## Backlog"; got ${hits.length}`);
  assert.equal(
    hits[0]?.path,
    IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG.onlyAllowedPath,
    `## Backlog only allowed in ${IMPROVEMENT_BACKLOG_KNOWN_BAD_DUPLICATE_BACKLOG.onlyAllowedPath}`,
  );
});

test('no second backlog markdown file under docs/workflows/', () => {
  const workflows = path.join(root, 'docs/workflows');
  const extras = readdirSync(workflows).filter(
    (f) =>
      /backlog/i.test(f) &&
      f.endsWith('.md') &&
      f !== path.basename(IMPROVEMENT_BACKLOG_CANONICAL_PATH),
  );
  assert.deepEqual(extras, [], `extra backlog files: ${extras.join(', ')}`);
});
