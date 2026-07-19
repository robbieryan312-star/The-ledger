/**
 * Generate docs/workflows/FILE_INVENTORY_AUDIT.md from file-inventory.json + importer scan.
 * Run: npm run audit:inventory && npx tsx scripts/generate-file-inventory-audit.ts
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
    } else if (/\.(tsx?|ts|mdc|md)$/.test(ent)) {
      acc.push(full);
    }
  }
  return acc;
}

function basenameModule(file: string): string {
  return path.basename(file).replace(/\.(tsx?|ts)$/, '');
}

async function countImporters(targetRel: string): Promise<string[]> {
  const importers: string[] = [];
  const base = basenameModule(targetRel);
  const scanRoots = ['app', 'components', 'lib', 'scripts'];
  for (const root of scanRoots) {
    const files = await walkSourceFiles(path.join(projectRoot, root));
    for (const file of files) {
      if (file.endsWith(targetRel)) continue;
      const text = await readFile(file, 'utf8');
      const rel = path.relative(projectRoot, file).replace(/\\/g, '/');
      if (
        text.includes(`@/${targetRel.replace(/\.tsx?$/, '')}`) ||
        text.includes(targetRel.replace(/\.tsx?$/, '')) ||
        (text.includes(`/${base}`) && (text.includes("from '@") || text.includes('from "')))
      ) {
        importers.push(rel);
      }
    }
  }
  return [...new Set(importers)].slice(0, 5);
}

function purposeFromPath(file: string): string {
  if (file.startsWith('app/')) return 'App route or layout';
  if (file.startsWith('components/politicians/')) return 'Politician profile UI';
  if (file.startsWith('components/')) return 'UI component';
  if (file.startsWith('scripts/lib/')) return 'Pipeline shared library';
  if (file.startsWith('scripts/ingest/')) return 'Florida/data ingest script';
  if (file.includes('sync-')) return 'National sync script';
  if (file.startsWith('scripts/__tests__/')) return 'Build-gated guard test';
  if (file.startsWith('lib/data/generated/')) return 'Generated pipeline data';
  if (file.startsWith('lib/data/')) return 'Data accessor / transform';
  return 'Source module';
}

async function main(): Promise<void> {
  const inventory = JSON.parse(await readFile(INVENTORY, 'utf8')) as {
    totalFiles: number;
    generatedAt: string;
    layers: Record<string, string[]>;
  };
  const allFiles = Object.values(inventory.layers).flat().sort();

  const lines: string[] = [
    '# File inventory audit — utilization · quality · necessity · accuracy (W4)',
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
      const importers = await countImporters(file);
      if (file.startsWith('app/') && file.endsWith('page.tsx')) {
        usedBy = 'Next.js route entry';
      } else if (importers.length === 0) {
        const name = path.basename(file);
        if (name.startsWith('sync-') || name.startsWith('ingest-')) {
          usedBy = 'package.json npm script entrypoint';
        } else if (file.startsWith('lib/data/') && SHIM_MODULES.has(path.basename(file))) {
          usedBy = 'DEAD shim — 0 lib/data path consumers';
        } else {
          usedBy = 'scan: 0 importers (verify)';
        }
      } else {
        usedBy = importers.join(', ');
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
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
