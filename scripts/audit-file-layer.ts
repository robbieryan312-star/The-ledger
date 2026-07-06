/**
 * audit-file-layer.ts — automated layer audit for Wave 3 file review.
 *
 * Reads data/reports/file-inventory.json and checks each file for common issues.
 * Output: data/reports/layer-audit.json
 *
 * Run: npm run audit:layer
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = path.join(projectRoot, 'data/reports/file-inventory.json');
const outPath = path.join(projectRoot, 'data/reports/layer-audit.json');

interface AuditResult {
  file: string;
  layer: string;
  status: 'reviewed' | 'fixed' | 'issue';
  issues: string[];
}

function readSrc(relPath: string): string {
  return readFileSync(path.join(projectRoot, relPath), 'utf8');
}

function auditFile(relPath: string, layer: string): AuditResult {
  const issues: string[] = [];
  let src: string;
  try {
    src = readSrc(relPath);
  } catch {
    return { file: relPath, layer, status: 'issue', issues: ['file not readable'] };
  }

  if (layer.startsWith('L1') || layer.startsWith('L3') || layer.startsWith('L4')) {
    if (/\bfetch\s*\(/.test(src)) {
      const hasGuard =
        /AbortSignal\.timeout/.test(src) ||
        /fetchWithRetry/.test(src) ||
        /fetchJson/.test(src) ||
        /requireTimeout/.test(src) ||
        /resilientFetch/.test(src);
      if (!hasGuard && !relPath.includes('resilientFetch') && !relPath.includes('ingest-utils')) {
        issues.push('unguarded fetch()');
      }
    }
  }

  if (layer === 'L6' && relPath.startsWith('app/') && relPath.endsWith('/page.tsx')) {
    if (/^['"]use client['"]/.test(src.trim())) {
      issues.push('route page must not use client');
    }
  }

  if (layer === 'L7' && relPath.startsWith('components/')) {
    if (/from ['"].*generated\/.*\.json['"]/.test(src)) {
      issues.push('component imports generated JSON directly');
    }
  }

  if (layer === 'L2' && relPath.includes('lib/data/')) {
    if (/^['"]use client['"]/.test(src.trim())) {
      issues.push('data accessor must not be client component');
    }
  }

  return {
    file: relPath,
    layer,
    status: issues.length ? 'issue' : 'reviewed',
    issues,
  };
}

function main(): void {
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as {
    layers: Record<string, string[]>;
  };
  const results: AuditResult[] = [];
  for (const [layer, files] of Object.entries(inventory.layers)) {
    for (const file of files) {
      results.push(auditFile(file, layer));
    }
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    reviewed: results.filter((r) => r.status === 'reviewed').length,
    issues: results.filter((r) => r.status === 'issue').length,
    results,
  };
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`Layer audit: ${summary.reviewed}/${summary.total} reviewed, ${summary.issues} issues`);
  console.log(`Output: ${outPath}`);
  if (summary.issues > 0) {
    for (const r of results.filter((x) => x.status === 'issue').slice(0, 10)) {
      console.log(`  ISSUE ${r.file}: ${r.issues.join(', ')}`);
    }
    process.exit(1);
  }
}

main();
