/**
 * Generate docs/workflows/FILE_INVENTORY_AUDIT.md from file-inventory.json + importer scan.
 * Run: npm run audit:inventory-md  (or audit:inventory && audit:inventory-md)
 */
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = path.join(projectRoot, 'data', 'reports', 'file-inventory.json');
const OUT = path.join(projectRoot, 'docs', 'workflows', 'FILE_INVENTORY_AUDIT.md');

/** Curated overrides from importer scan + accuracy review (append-only growth). */
const OVERRIDES: Record<
  string,
  Partial<{
    usedBy: string;
    claimedVsReality: string;
    verdict: 'KEEP' | 'FIX' | 'DELETE' | 'MERGE';
    evidence: string;
  }>
> = {
  'components/search/SearchBar.tsx': {
    usedBy: 'DEAD — no importers; home uses HomeSearchBar',
    verdict: 'DELETE',
    evidence: 'rg import SearchBar → 0',
  },
  'components/politicians/CredibilityConsistency.tsx': {
    usedBy: 'DEAD — no importers',
    verdict: 'DELETE',
    evidence: 'Wave 2 schedules Consistency Score removal',
  },
  'components/politicians/ConsistencyScore.tsx': {
    usedBy: 'DEAD — only CredibilityConsistency',
    verdict: 'DELETE',
    evidence: 'core-rules §4 removes Consistency Score',
  },
  'components/elections/CandidateTopicAccordion.tsx': {
    usedBy: 'DEAD — no importers',
    verdict: 'DELETE',
    evidence: 'elections page is static empty-state',
  },
  'components/records/FloridaCountyEconomicContext.tsx': {
    usedBy: 'DEAD — no importers',
    verdict: 'DELETE',
    evidence: 'rg → definition only',
  },
  'components/counties/OfficialCard.tsx': {
    usedBy: 'USAMap.tsx (import only — runtime DEAD)',
    claimedVsReality: 'Linked to /officials/[id] 404 on main; fixed in PR #43',
    verdict: 'FIX',
    evidence: 'countyByFips never populated; W3a repoints links',
  },
  'app/officials/[id]/page.tsx': {
    usedBy: 'DEAD — notFound()-only stub',
    verdict: 'DELETE',
    evidence: 'PR #43 deletes route',
  },
  'app/lobbying/[id]/page.tsx': {
    usedBy: 'DEAD — notFound()-only; no inbound links',
    verdict: 'DELETE',
    evidence: 'rg /lobbying/ dynamic links → 0',
  },
  'app/counties/[fips]/page.tsx': {
    usedBy: 'DEAD-PATH — no in-app links reach it',
    claimedVsReality: 'Honest-gap shell only; county data never wired',
    verdict: 'FIX',
    evidence: 'USAMap county literals empty',
  },
  'app/sitemap.ts': {
    usedBy: 'Next.js /sitemap.xml',
    claimedVsReality: 'Was 1-URL stub on main; full rebuild in PR #43',
    verdict: 'FIX',
    evidence: '613 entries after W3b',
  },
  'app/layout.tsx': {
    usedBy: 'Next.js root layout (framework entry)',
    verdict: 'KEEP',
    evidence: 'Next.js app shell — no code importers',
  },
  'lib/data/electionCompare.ts': {
    usedBy: 'DEAD — CompareContent uses @/lib/electionCompare',
    verdict: 'DELETE',
    evidence: 'duplicate of root module',
  },
  'lib/data/reference-sources.ts': {
    usedBy: 'DEAD — docs only',
    verdict: 'DELETE',
    evidence: '0 code importers',
  },
  'lib/data/buildTopicConsistencyTimeline.ts': {
    usedBy: 'DEAD',
    verdict: 'DELETE',
    evidence: '0 external importers',
  },
  'lib/data/profileLatestRecord.ts': {
    usedBy: 'DEAD',
    verdict: 'DELETE',
    evidence: '0 importers',
  },
};

const SHIM_MODULES = new Set([
  'branches.ts',
  'billCitizenImpact.ts',
  'candidateIssues.ts',
  'sourceTiers.ts',
  'voteDisplay.ts',
  'voteDonorConnections.ts',
  'zipLookup.ts',
]);

const IMPORT_SPEC_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const TS_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function normalizeRel(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function resolveImportSpec(fromRel: string, spec: string): string | null {
  if (spec.startsWith('@/')) {
    const base = spec.slice(2);
    for (const ext of TS_EXTENSIONS) {
      const candidate = normalizeRel(path.join(projectRoot, base + ext));
      if (candidate.startsWith(projectRoot)) {
        return normalizeRel(path.relative(projectRoot, candidate));
      }
    }
    return normalizeRel(path.relative(projectRoot, path.join(projectRoot, base)));
  }
  if (!spec.startsWith('.')) return null;
  const fromAbs = path.join(projectRoot, fromRel);
  const resolved = path.resolve(path.dirname(fromAbs), spec);
  for (const ext of TS_EXTENSIONS) {
    const candidate = resolved + (ext.startsWith('/') ? ext : ext);
    if (candidate.startsWith(projectRoot)) {
      return normalizeRel(path.relative(projectRoot, candidate));
    }
  }
  return normalizeRel(path.relative(projectRoot, resolved));
}

function canonicalTarget(targetRel: string, knownFiles: Set<string>): string | null {
  const norm = normalizeRel(targetRel);
  if (knownFiles.has(norm)) return norm;
  for (const ext of ['.ts', '.tsx']) {
    if (knownFiles.has(norm + ext)) return norm + ext;
  }
  const base = path.basename(norm);
  const dir = path.dirname(norm);
  for (const ext of ['.ts', '.tsx']) {
    const idx = normalizeRel(path.join(dir, base, 'index' + ext));
    if (knownFiles.has(idx)) return idx;
  }
  return knownFiles.has(norm) ? norm : null;
}

async function walkSourceFiles(dir: string, acc: string[] = []): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return acc;
  }
  for (const ent of entries) {
    if (ent === 'node_modules' || ent.startsWith('.')) continue;
    const full = path.join(dir, ent);
    const st = await stat(full);
    if (st.isDirectory()) {
      await walkSourceFiles(full, acc);
    } else if (/\.(tsx?|ts|json|mdc|md)$/.test(ent)) {
      acc.push(full);
    }
  }
  return acc;
}

async function buildImporterIndex(knownFiles: Set<string>): Promise<Map<string, Set<string>>> {
  const index = new Map<string, Set<string>>();
  const scanRoots = ['app', 'components', 'lib', 'scripts'];
  for (const root of scanRoots) {
    const files = await walkSourceFiles(path.join(projectRoot, root));
    for (const file of files) {
      if (!/\.(tsx?|ts)$/.test(file)) continue;
      const fromRel = normalizeRel(path.relative(projectRoot, file));
      const text = await readFile(file, 'utf8');
      let match: RegExpExecArray | null;
      IMPORT_SPEC_RE.lastIndex = 0;
      while ((match = IMPORT_SPEC_RE.exec(text)) !== null) {
        const spec = match[1] ?? match[2];
        if (!spec) continue;
        const resolved = resolveImportSpec(fromRel, spec);
        if (!resolved) continue;
        const target = canonicalTarget(resolved, knownFiles);
        if (!target || target === fromRel) continue;
        if (!index.has(target)) index.set(target, new Set());
        index.get(target)!.add(fromRel);
      }
    }
  }
  return index;
}

async function buildNpmScriptIndex(): Promise<Map<string, string[]>> {
  const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const index = new Map<string, string[]>();
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    const matches = cmd.matchAll(/tsx\s+([^\s&;|]+)/g);
    for (const m of matches) {
      const scriptPath = m[1]!.replace(/^\.\//, '');
      if (!index.has(scriptPath)) index.set(scriptPath, []);
      index.get(scriptPath)!.push(name);
    }
  }
  return index;
}

function purposeFromPath(file: string): string {
  if (file.startsWith('app/')) return 'App route or layout';
  if (file.startsWith('components/politicians/')) return 'Politician profile UI';
  if (file.startsWith('components/')) return 'UI component';
  if (file.startsWith('scripts/lib/')) return 'Pipeline shared library';
  if (file.startsWith('scripts/archive/')) return 'Archived one-off script';
  if (file.startsWith('scripts/ingest/')) return 'Florida/data ingest script';
  if (file.startsWith('scripts/__tests__/')) return 'Build-gated guard test';
  if (file.includes('sync-')) return 'National sync script';
  if (file.startsWith('lib/data/generated/')) return 'Generated pipeline data';
  if (file.startsWith('lib/data/')) return 'Data accessor / transform';
  return 'Source module';
}

function formatImporters(importers: Set<string> | undefined, max = 5): string {
  if (!importers || importers.size === 0) return '';
  return [...importers].sort().slice(0, max).join(', ');
}

async function main(): Promise<void> {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8')) as {
    totalFiles: number;
    generatedAt: string;
    layers: Record<string, string[]>;
  };
  const allFiles = Object.values(inventory.layers).flat().sort();
  const knownFiles = new Set(allFiles);
  const importerIndex = await buildImporterIndex(knownFiles);
  const npmIndex = await buildNpmScriptIndex();

  const lines: string[] = [
    '# File inventory audit — utilization · quality · necessity · accuracy',
    '',
    '**GENERATED** — do not edit by hand. Regenerate:',
    '`npm run audit:inventory && npm run audit:inventory-md`',
    '',
    `**Generated:** ${new Date().toISOString().slice(0, 19)}Z · **Baseline:** data/reports/file-inventory.json (${inventory.totalFiles} files)`,
    '**Type:** FINDINGS ONLY — no deletions until Claude briefs.',
    '',
    '## W3c accuracy finding',
    '',
    'PILOT_PROFILE_CHECKLIST rows 5–6 claimed **done**; S000033 manifest has honest-gap for both. Checklist corrected; guard freezes status.',
    '',
    '## Full file table',
    '',
    '| Path | Purpose | Used-by | Claimed vs reality | Verdict | Evidence |',
    '|------|---------|---------|-------------------|---------|----------|',
  ];

  for (const file of allFiles) {
    const ov = OVERRIDES[file];
    let usedBy = ov?.usedBy ?? '';
    if (!usedBy) {
      const importers = importerIndex.get(file);
      const npmScripts = npmIndex.get(file);
      if (file.startsWith('app/') && file.endsWith('page.tsx')) {
        usedBy = 'Next.js route entry';
      } else if (importers && importers.size > 0) {
        usedBy = formatImporters(importers);
      } else if (npmScripts && npmScripts.length > 0) {
        usedBy = `package.json: ${npmScripts.join(', ')}`;
      } else if (file.startsWith('scripts/archive/')) {
        usedBy = 'archived — no npm script';
      } else if (file.startsWith('scripts/__tests__/')) {
        usedBy = 'prebuild test: guard wired in package.json';
      } else if (file.startsWith('scripts/lib/')) {
        usedBy = 'scan: 0 importers (verify)';
      } else {
        const name = path.basename(file);
        if (name.startsWith('sync-') || name.startsWith('ingest-')) {
          usedBy = 'package.json npm script entrypoint (unverified)';
        } else if (file.startsWith('lib/data/') && SHIM_MODULES.has(path.basename(file))) {
          usedBy = 'DEAD shim — 0 lib/data path consumers';
        } else {
          usedBy = 'scan: 0 importers (verify)';
        }
      }
    }
    const verdict =
      ov?.verdict ??
      (usedBy.includes('DEAD') ? 'DELETE' : usedBy.includes('0 importers') ? 'MERGE' : 'KEEP');
    const claimed = ov?.claimedVsReality ?? '—';
    const evidence = ov?.evidence ?? (verdict === 'KEEP' ? 'importer scan' : 'override');
    lines.push(
      `| ${file} | ${purposeFromPath(file)} | ${usedBy.replace(/\|/g, '/')} | ${claimed} | ${verdict} | ${evidence} |`,
    );
  }

  lines.push('', `Total rows: ${allFiles.length}`, '');
  await writeFile(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${OUT} (${allFiles.length} rows)`);

  const scriptsLibMerge = allFiles.filter(
    (f) =>
      f.startsWith('scripts/lib/') &&
      !OVERRIDES[f] &&
      (importerIndex.get(f)?.size ?? 0) === 0,
  );
  if (scriptsLibMerge.length > 0) {
    console.warn(`WARN: scripts/lib with 0 importers: ${scriptsLibMerge.join(', ')}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
