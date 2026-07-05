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

const SCAN_ROOTS: { layer: string; dir: string; glob?: string }[] = [
  { layer: 'L1', dir: 'scripts/lib' },
  { layer: 'L2', dir: 'lib/data', glob: '*.ts' },
  { layer: 'L3', dir: 'scripts', glob: 'sync-*.ts' },
  { layer: 'L3', dir: 'scripts', glob: 'profile-*.ts' },
  { layer: 'L3', dir: 'scripts', glob: 'reprocess-*.ts' },
  { layer: 'L4', dir: 'scripts/ingest/florida' },
  { layer: 'L5', dir: 'components/politicians' },
  { layer: 'L6', dir: 'app' },
  { layer: 'L7', dir: 'components' },
  { layer: 'L8', dir: 'scripts/__tests__' },
];

async function walkTs(dir: string, base: string, acc: string[] = []): Promise<string[]> {
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
      await walkTs(full, base, acc);
    } else if (/\.(tsx?|ts)$/.test(ent) && !ent.endsWith('.test.ts')) {
      acc.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return acc;
}

async function listLayer(layer: string, relDir: string, nameGlob?: string): Promise<string[]> {
  const abs = path.join(projectRoot, relDir);
  if (nameGlob && relDir === 'scripts') {
    const all = await readdir(abs);
    return all
      .filter((f) => {
        const prefix = nameGlob.replace('*', '');
        return f.startsWith(prefix.replace('.ts', '')) && f.endsWith('.ts') && !f.endsWith('.test.ts');
      })
      .map((f) => `${relDir}/${f}`.replace(/\\/g, '/'));
  }
  if (nameGlob === '*.ts' && relDir === 'lib/data') {
    const files = await walkTs(abs, projectRoot);
    return files.filter((f) => f.startsWith('lib/data/') && !f.includes('__fixtures__'));
  }
  const files = await walkTs(abs, projectRoot);
  return files.filter((f) => f.startsWith(relDir));
}

async function main(): Promise<void> {
  const layers: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const { layer, dir, glob } of SCAN_ROOTS) {
    const files = await listLayer(layer, dir, glob);
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
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
