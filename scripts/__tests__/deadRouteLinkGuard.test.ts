/**
 * Build-gated guard (W3a): no internal <Link>/href may target a route whose page.tsx body
 * only calls notFound() (a guaranteed-404 user path). Freezes the OfficialCard → /officials/[id]
 * defect. Also detects notFound()-only routes and validates the detector against a frozen fixture.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DEAD_ROUTE_LINK_KNOWN_BAD } from '../../lib/data/__fixtures__/deadRouteLinkGuard.fixture';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_DIR = path.join(projectRoot, 'app');
const SCAN_DIRS = [APP_DIR, path.join(projectRoot, 'components')];

/** A page whose executable body only calls notFound() (no JSX render path). */
export function isNotFoundOnlyPage(src: string): boolean {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (!/\bnotFound\s*\(\s*\)/.test(stripped)) return false;
  // A real page renders JSX; a dead stub does not.
  if (/return\s*\(/.test(stripped) || /return\s*</.test(stripped)) return false;
  return true;
}

/** Map an app/.../page.tsx path to its dead link target (dynamic prefix or static exact route). */
export function deadRouteTarget(pageRelToApp: string): { prefix?: string; exact?: string } {
  const segs = pageRelToApp.split('/').slice(0, -1); // drop page.tsx
  const dynIdx = segs.findIndex((s) => s.startsWith('['));
  if (dynIdx === -1) return { exact: '/' + segs.join('/') };
  if (dynIdx === 0) return {}; // fully dynamic at root — skip
  return { prefix: '/' + segs.slice(0, dynIdx).join('/') + '/' };
}

function walk(dir: string, filter: (f: string) => boolean, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir)) {
    const full = path.join(dir, ent);
    if (statSync(full).isDirectory()) walk(full, filter, acc);
    else if (filter(full)) acc.push(full);
  }
  return acc;
}

/** Collect the static leading portion of every href in .tsx sources under SCAN_DIRS. */
export function collectHrefLeadingPaths(): { file: string; leading: string }[] {
  const found: { file: string; leading: string }[] = [];
  const hrefRe = /href=\{?[`"']([^"'`$]*)/g;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir, (f) => f.endsWith('.tsx'))) {
      const text = readFileSync(file, 'utf8');
      let m: RegExpExecArray | null;
      while ((m = hrefRe.exec(text)) !== null) {
        const leading = m[1];
        if (leading.startsWith('/')) found.push({ file: path.relative(projectRoot, file), leading });
      }
    }
  }
  return found;
}

/** All notFound()-only route targets in the app router. */
function deadRouteTargets(): Array<{ prefix?: string; exact?: string; page: string }> {
  const pages = walk(APP_DIR, (f) => f.endsWith('page.tsx'));
  const targets: Array<{ prefix?: string; exact?: string; page: string }> = [];
  for (const page of pages) {
    if (!isNotFoundOnlyPage(readFileSync(page, 'utf8'))) continue;
    const rel = path.relative(APP_DIR, page);
    const t = deadRouteTarget(rel);
    if (t.prefix || t.exact) targets.push({ ...t, page: path.relative(projectRoot, page) });
  }
  return targets;
}

function linkHitsDeadTarget(leading: string, t: { prefix?: string; exact?: string }): boolean {
  if (t.exact) return leading === t.exact;
  if (t.prefix) return leading.startsWith(t.prefix);
  return false;
}

test('fixture: detector flags a notFound()-only page and clears a rendering page', () => {
  assert.equal(isNotFoundOnlyPage(DEAD_ROUTE_LINK_KNOWN_BAD.notFoundOnlyPageSource), true);
  assert.equal(isNotFoundOnlyPage(DEAD_ROUTE_LINK_KNOWN_BAD.renderingPageSource), false);
  // The known-bad link would be caught against the known-bad dead prefix.
  assert.equal(
    linkHitsDeadTarget('/officials/', { prefix: DEAD_ROUTE_LINK_KNOWN_BAD.deadPrefix }),
    true,
  );
  // The fix target (/politicians/) must NOT collide with the dead officials prefix.
  assert.equal(
    linkHitsDeadTarget('/politicians/', { prefix: DEAD_ROUTE_LINK_KNOWN_BAD.deadPrefix }),
    false,
  );
});

test('the dead /officials/[id] route was removed', () => {
  assert.equal(
    existsSync(path.join(projectRoot, 'app', 'officials', '[id]', 'page.tsx')),
    false,
    'app/officials/[id]/page.tsx (notFound-only) must be deleted',
  );
});

test('no internal <Link>/href targets a notFound()-only route', () => {
  const targets = deadRouteTargets();
  const hrefs = collectHrefLeadingPaths();
  const violations: string[] = [];
  for (const { file, leading } of hrefs) {
    for (const t of targets) {
      if (linkHitsDeadTarget(leading, t)) {
        violations.push(`${file}: href "${leading}…" → dead route ${t.page}`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `internal links point at notFound()-only routes:\n${violations.join('\n')}`,
  );
});
