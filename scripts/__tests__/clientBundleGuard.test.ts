/**
 * Guard: client components must not runtime-import from @/lib/data/* (type-only OK).
 * Chunk budget runs after `npm run build` (see test:client-chunks).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]@\/lib\/data\/generated/,
  /from\s+['"]@\/data\//,
  /import\s+[^'"]*from\s+['"][^'"]*lib\/data\/generated/,
  /import\s+[^'"]*from\s+['"][^'"]*\/data\//,
  /import\s+[^'"]*\.json['"]/,
];

function collectClientFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectClientFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith('.test.ts')) {
      const head = readFileSync(full, 'utf8').slice(0, 300);
      if (/^['"]use client['"]/.test(head.trim())) out.push(full);
    }
  }
  return out;
}

/** Strip type-only import lines so runtime-import scan ignores them. */
function stripTypeOnlyImports(content: string): string {
  return content.replace(
    /^\s*import\s+type\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm,
    '',
  );
}

function findRuntimeLibDataImports(content: string): string[] {
  const stripped = stripTypeOnlyImports(content);
  const violations: string[] = [];
  const re = /import\s+(?!type\b)(?:[\s\S]*?)from\s+['"](@\/lib\/data\/[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    violations.push(m[1]);
  }
  return violations;
}

test('use client files do not runtime-import @/lib/data/* or JSON bundles', () => {
  const roots = ['components', 'app'].map((d) => path.join(projectRoot, d));
  const violations: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const file of collectClientFiles(root)) {
      const content = readFileSync(file, 'utf8');
      const stripped = stripTypeOnlyImports(content);
      for (const re of FORBIDDEN_IMPORT_PATTERNS) {
        if (re.test(stripped)) {
          violations.push(`${path.relative(projectRoot, file)}: matches ${re}`);
        }
      }
      for (const mod of findRuntimeLibDataImports(content)) {
        violations.push(`${path.relative(projectRoot, file)}: runtime import ${mod}`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `client bundle guard violations:\n${violations.join('\n')}`,
  );
});

test('client JS chunk total stays under 3MB budget', () => {
  const chunksDir = path.join(projectRoot, '.next', 'static', 'chunks');
  if (!existsSync(chunksDir)) {
    console.warn('skip chunk budget — run npm run build first');
    return;
  }
  let total = 0;
  for (const name of readdirSync(chunksDir)) {
    const full = path.join(chunksDir, name);
    if (statSync(full).isFile()) total += statSync(full).size;
  }
  const mb = (total / (1024 * 1024)).toFixed(2);
  assert.ok(
    total <= 3 * 1024 * 1024,
    `client chunks total ${mb}MB exceeds 3MB budget — pass profile data as server props instead of bundling generated JSON`,
  );
});
