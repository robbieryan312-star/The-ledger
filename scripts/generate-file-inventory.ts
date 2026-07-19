/**
 * Generate file inventory for audit ledger.
 * Output: data/reports/file-inventory.json
 * Run: npm run audit:inventory
 */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = path.join(projectRoot, 'data', 'reports', 'file-inventory.json');

type ScanMode = 'walk' | 'walk-data-ts' | 'top-level-ts' | 'test-guards';

const SCAN_ROOTS: { layer: string; dir: string; mode: ScanMode }[] = [
  { layer: 'L1', dir: 'scripts/lib', mode: 'walk' },
  { layer: 'L2', dir: 'lib/data', mode: 'walk-data-ts' },
  { layer: 'L3', dir: 'scripts', mode: 'top-level-ts' },
  { layer: 'L3a', dir: 'scripts/archive', mode: 'walk' },
  { layer: 'L4', dir: 'scripts/ingest/florida', mode: 'walk' },
  { layer: 'L5', dir: 'components/politicians', mode: 'walk' },
  { layer: 'L6', dir: 'app', mode: 'walk' },
  { layer: 'L7', dir: 'components', mode: 'walk' },
  { layer: 'L8', dir: 'scripts/__tests__', mode: 'test-guards' },
];

async function walkTs(
  dir: string,
  base: string,
  acc: string[] = [],
  opts: { includeTests?: boolean; excludeFixtures?: boolean } = {},
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return acc;
  }
  for (const ent of entries) {
    if (ent.startsWith('.') || ent === 'node_modules') continue;
    const full = path.join(dir, ent);
    const st = await stat(full);
    if (st.isDirectory()) {
      if (opts.excludeFixtures && ent === '__fixtures__') continue;
      await walkTs(full, base, acc, opts);
    } else if (/\.tsx?$/.test(ent)) {
      if (!opts.includeTests && ent.endsWith('.test.ts')) continue;
      acc.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return acc;
}

async function listTopLevelScripts(): Promise<string[]> {
  const abs = path.join(projectRoot, 'scripts');
  const all = await readdir(abs);
  return all
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => `scripts/${f}`.replace(/\\/g, '/'))
    .sort();
}

async function listTestGuards(): Promise<string[]> {
  const abs = path.join(projectRoot, 'scripts/__tests__');
  const all = await readdir(abs);
  return all
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => `scripts/__tests__/${f}`.replace(/\\/g, '/'))
    .sort();
}

async function listLayer(layer: string, relDir: string, mode: ScanMode): Promise<string[]> {
  const abs = path.join(projectRoot, relDir);
  if (mode === 'top-level-ts') return listTopLevelScripts();
  if (mode === 'test-guards') return listTestGuards();
  if (mode === 'walk-data-ts') {
    const files = await walkTs(abs, projectRoot, [], { excludeFixtures: true });
    return files.filter(
      (f) =>
        f.startsWith('lib/data/') &&
        !f.includes('/__fixtures__/') &&
        !f.endsWith('.json'),
    );
  }
  const files = await walkTs(abs, projectRoot);
  return files.filter((f) => f.startsWith(relDir));
}

async function main(): Promise<void> {
  const layers: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const { layer, dir, mode } of SCAN_ROOTS) {
    const files = await listLayer(layer, dir, mode);
    if (!layers[layer]) layers[layer] = [];
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      layers[layer].push(f);
    }
    layers[layer].sort();
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalFiles: seen.size,
    layers,
    allFiles: [...seen].sort(),
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${payload.totalFiles} files → ${path.relative(projectRoot, OUT_FILE)}`);
  for (const [layer, files] of Object.entries(layers).sort()) {
    console.log(`  ${layer}: ${files.length}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
