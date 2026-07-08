/**
 * Read-only credibility re-audit for locked migrated profiles.
 * Writes markdown report — changes no profile data.
 *
 * Run: npx tsx scripts/audit-profile-credibility.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSaidDidDiffsFromTopicPositions } from '../lib/data/buildSaidDidDiffs';
import { leadSummary } from '../lib/displaySummary';
import {
  isBioBoilerplate,
  isDisqualifiedPlatformPosition,
  isGenuineSaidDidDiff,
  isPlaceholderUrl,
  isThirdPartyCharacterization,
  isValidSourceTier,
  isVoteRestatementSaid,
  saidDidSubjectsOverlap,
  validateSaidDidDiffs,
} from '../lib/data/sourceIntegrity';
import type { TopicStatementEntry } from '../lib/data/topicPositions';
import { isProceduralCrecText } from './lib/crecProceduralFilter';
import { loadProfileDisplayIdentityByBioguide } from './lib/profileDisplayIdentity';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib/data/generated/profiles');
const LOCKED_PROFILES = [
  'S000033',
  'O000172',
  'M000355',
  'M001184',
  'W000817',
  'C001098',
  'P000197',
] as const;

const HONEST_STATUSES = new Set(['honest-gap', 'none-in-range', 'fetch-failed', 'fetch-blocked']);

type Severity = 'P0' | 'P1' | 'P2';

interface DefectRow {
  bioguideId: string;
  category: string;
  severity: Severity;
  check: string;
  detail: string;
  path: string;
}

function isFragmentText(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return true;
  if (/^Mr\.?\s*$/i.test(t)) return true;
  if (/^Ms\.?\s*$/i.test(t)) return true;
  return false;
}

function isFloorRemarkOrMediaQuote(stmt: TopicStatementEntry): boolean {
  const title = stmt.title.trim();
  if (stmt.tier === 'official' && /\/CREC-/i.test(stmt.url)) {
    if (isProceduralCrecText(title)) return false;
    if (/^(Mr\.|Ms\.|Mrs\.)\s+[A-Z]/i.test(title)) return true;
    if (stmt.verbatim === true && title.length > 40) return true;
    return false;
  }
  if (stmt.tier === 'media' || stmt.tier === 'alleged') {
    return stmt.verbatim === true && Boolean(stmt.url?.trim()) && Boolean(stmt.date?.trim());
  }
  return true;
}

function manifestCategoryKey(fileBase: string): string {
  if (fileBase === 'orgVoteLinks') return 'orgVoteLinks';
  if (fileBase === 'saidDid') return 'saidDid';
  return fileBase;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function auditStatements(bioguideId: string, data: {
  byTopic?: Record<string, { statements?: TopicStatementEntry[] }>;
}): DefectRow[] {
  const defects: DefectRow[] = [];
  const topics = Object.entries(data.byTopic ?? {});
  if (topics.length === 0) return defects;

  for (const [topicId, bucket] of topics) {
    for (const [idx, stmt] of (bucket.statements ?? []).entries()) {
      const rel = `profiles/${bioguideId}/statements.json#${topicId}[${idx}]`;
      const title = stmt.title?.trim() ?? '';

      if (!title) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P0',
          check: 'missing-text',
          detail: 'Statement has empty title',
          path: rel,
        });
        continue;
      }

      if (isFragmentText(title)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P0',
          check: 'fragment',
          detail: `Truncated or fragment text: "${title.slice(0, 40)}"`,
          path: rel,
        });
      }

      if (isProceduralCrecText(title)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P0',
          check: 'procedural-boilerplate',
          detail: 'CREC procedural/clerk text classified as Said statement',
          path: rel,
        });
      }

      if (isVoteRestatementSaid(title) || isBioBoilerplate(title) || isThirdPartyCharacterization(title)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'disqualified-said',
          detail: 'Vote restatement, bio boilerplate, or third-party characterization',
          path: rel,
        });
      }

      if (!isFloorRemarkOrMediaQuote(stmt)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'not-floor-or-media',
          detail: 'Does not meet floor-remark or verbatim media quote standard',
          path: rel,
        });
      }

      if (!stmt.date?.trim()) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'missing-date',
          detail: 'Statement missing date',
          path: rel,
        });
      }

      if (!stmt.url?.trim()) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'missing-url',
          detail: 'Statement missing source URL',
          path: rel,
        });
      } else if (isPlaceholderUrl(stmt.url)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P0',
          check: 'placeholder-url',
          detail: `Placeholder or fabricated URL: ${stmt.url}`,
          path: rel,
        });
      }

      if (!isValidSourceTier(stmt.tier)) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'invalid-tier',
          detail: `Invalid tier code: ${String(stmt.tier)}`,
          path: rel,
        });
      }

      if ((stmt.tier === 'media' || stmt.tier === 'alleged') && stmt.verbatim !== true) {
        defects.push({
          bioguideId,
          category: 'statements',
          severity: 'P1',
          check: 'media-not-verbatim',
          detail: 'Media/alleged statement missing verbatim:true',
          path: rel,
        });
      }
    }
  }

  return defects;
}

function auditPositions(
  bioguideId: string,
  data: { byTopic?: Record<string, { platformPositions?: Array<{ text: string; url?: string; tier?: string }> }> },
): DefectRow[] {
  const defects: DefectRow[] = [];
  for (const [topicId, bucket] of Object.entries(data.byTopic ?? {})) {
    for (const [idx, pos] of (bucket.platformPositions ?? []).entries()) {
      const rel = `profiles/${bioguideId}/positions.json#${topicId}[${idx}]`;
      const text = pos.text?.trim() ?? '';
      if (!text) {
        defects.push({
          bioguideId,
          category: 'positions',
          severity: 'P1',
          check: 'empty-position',
          detail: 'Empty platform position text',
          path: rel,
        });
        continue;
      }
      if (isDisqualifiedPlatformPosition(text)) {
        defects.push({
          bioguideId,
          category: 'positions',
          severity: 'P1',
          check: 'disqualified-position',
          detail: `Disqualified position (vote restatement/boilerplate): "${text.slice(0, 80)}…"`,
          path: rel,
        });
      }
      if (pos.tier && !isValidSourceTier(pos.tier)) {
        defects.push({
          bioguideId,
          category: 'positions',
          severity: 'P2',
          check: 'invalid-tier',
          detail: `Invalid tier: ${pos.tier}`,
          path: rel,
        });
      }
    }
  }
  return defects;
}

function auditSaidDid(bioguideId: string, displayName: string): DefectRow[] {
  const defects: DefectRow[] = [];
  const diffs = buildSaidDidDiffsFromTopicPositions(bioguideId, displayName);
  const violations = validateSaidDidDiffs(diffs, `${bioguideId}.saidDid`);
  for (const v of violations) {
    defects.push({
      bioguideId,
      category: 'saidDid',
      severity: 'P1',
      check: 'integrity-violation',
      detail: v.message,
      path: `profiles/${bioguideId}/saidDid.json (${v.path})`,
    });
  }

  for (const [idx, diff] of diffs.entries()) {
    const firstSentence = leadSummary(diff.said.quote, 120);
    if (diff.said.quote.trim().length > 0 && firstSentence.length > 120) {
      defects.push({
        bioguideId,
        category: 'saidDid',
        severity: 'P2',
        check: 'first-sentence-length',
        detail: `Said first sentence exceeds 120 chars (${firstSentence.length})`,
        path: `saidDid diff[${idx}]`,
      });
    }
    if (!isGenuineSaidDidDiff(diff)) {
      defects.push({
        bioguideId,
        category: 'saidDid',
        severity: 'P0',
        check: 'fabricated-linkage',
        detail: 'Said→Did pair fails genuineness check (missing quote/url or vote tautology)',
        path: `saidDid diff[${idx}]`,
      });
    } else if (!saidDidSubjectsOverlap(diff.said.quote, diff.did.action)) {
      defects.push({
        bioguideId,
        category: 'saidDid',
        severity: 'P1',
        check: 'subject-mismatch',
        detail: 'Said quote and Did vote lack subject overlap',
        path: `saidDid diff[${idx}]`,
      });
    }
  }

  return defects;
}

function auditNews(bioguideId: string, data: {
  items?: Array<{ headline?: string; url?: string; date?: string; source?: { tier?: string; url?: string } }>;
  status?: string;
}): DefectRow[] {
  const defects: DefectRow[] = [];
  const items = data.items ?? [];
  if (items.length === 0 && !data.status) {
    defects.push({
      bioguideId,
      category: 'news',
      severity: 'P1',
      check: 'silent-empty',
      detail: 'Empty news with no top-level status field',
      path: `profiles/${bioguideId}/news.json`,
    });
  }
  for (const [idx, item] of items.entries()) {
    const rel = `profiles/${bioguideId}/news.json[${idx}]`;
    if (!item.headline?.trim() || !item.url?.trim() || !item.date?.trim()) {
      defects.push({
        bioguideId,
        category: 'news',
        severity: 'P1',
        check: 'incomplete-item',
        detail: 'News item missing headline, url, or date',
        path: rel,
      });
    }
    const tier = item.source?.tier;
    if (tier && !isValidSourceTier(tier)) {
      defects.push({
        bioguideId,
        category: 'news',
        severity: 'P1',
        check: 'invalid-tier',
        detail: `Invalid news tier: ${tier}`,
        path: rel,
      });
    }
    if (item.url && isPlaceholderUrl(item.url)) {
      defects.push({
        bioguideId,
        category: 'news',
        severity: 'P0',
        check: 'placeholder-url',
        detail: `Placeholder news URL: ${item.url}`,
        path: rel,
      });
    }
  }
  return defects;
}

function auditControversySources(
  bioguideId: string,
  items: Array<{ sources?: Array<{ url?: string; tier?: string; date?: string }> }>,
): DefectRow[] {
  const defects: DefectRow[] = [];
  for (const [i, item] of items.entries()) {
    for (const [j, src] of (item.sources ?? []).entries()) {
      const rel = `profiles/${bioguideId}/controversies.json[${i}].sources[${j}]`;
      if (!src.url?.trim()) {
        defects.push({
          bioguideId,
          category: 'controversies',
          severity: 'P1',
          check: 'missing-url',
          detail: 'Controversy source missing URL',
          path: rel,
        });
      } else if (isPlaceholderUrl(src.url)) {
        defects.push({
          bioguideId,
          category: 'controversies',
          severity: 'P0',
          check: 'placeholder-url',
          detail: `Placeholder controversy URL: ${src.url}`,
          path: rel,
        });
      }
      if (src.tier && !isValidSourceTier(src.tier)) {
        defects.push({
          bioguideId,
          category: 'controversies',
          severity: 'P1',
          check: 'invalid-tier',
          detail: `Invalid tier: ${src.tier}`,
          path: rel,
        });
      }
    }
  }
  return defects;
}

function categoryIsEmpty(fileBase: string, data: unknown): boolean {
  if (!data || typeof data !== 'object') return true;
  const rec = data as Record<string, unknown>;
  switch (fileBase) {
    case 'statements':
    case 'positions': {
      const byTopic = rec.byTopic as Record<string, unknown> | undefined;
      if (!byTopic || Object.keys(byTopic).length === 0) return true;
      return Object.values(byTopic).every((bucket) => {
        if (!bucket || typeof bucket !== 'object') return true;
        const b = bucket as Record<string, unknown>;
        if (fileBase === 'statements') return ((b.statements as unknown[]) ?? []).length === 0;
        return ((b.platformPositions as unknown[]) ?? []).length === 0;
      });
    }
    case 'saidDid': {
      const byTopic = rec.byTopic as Record<string, unknown> | undefined;
      if (!byTopic || Object.keys(byTopic).length === 0) return true;
      return Object.values(byTopic).every((val) => {
        if (Array.isArray(val)) return val.length === 0;
        return true;
      });
    }
    case 'news':
      return ((rec.items as unknown[]) ?? []).length === 0;
    case 'votes':
      return ((rec.votes as unknown[]) ?? []).length === 0;
    case 'finance':
      return rec.entry == null;
    case 'controversies':
      return ((rec.items as unknown[]) ?? []).length === 0;
    case 'endorsements': {
      const endorses = (rec.endorses as unknown[]) ?? [];
      const endorsedBy = (rec.endorsedBy as unknown[]) ?? [];
      return endorses.length === 0 && endorsedBy.length === 0;
    }
    case 'orgVoteLinks':
      return ((rec.links as unknown[]) ?? []).length === 0;
    default:
      return false;
  }
}

function auditEmptyCategoryStatus(
  bioguideId: string,
  fileBase: string,
  data: Record<string, unknown>,
  manifestCategories: Record<string, string>,
): DefectRow[] {
  if (!categoryIsEmpty(fileBase, data)) return [];

  const manifestKey = manifestCategoryKey(fileBase);
  const manifestStatus = manifestCategories[manifestKey];
  const fileStatus = typeof data.status === 'string' ? data.status : undefined;
  const hasHonestSignal =
    (fileStatus && HONEST_STATUSES.has(fileStatus)) ||
    (manifestStatus && HONEST_STATUSES.has(manifestStatus));

  if (!hasHonestSignal) {
    return [
      {
        bioguideId,
        category: fileBase,
        severity: 'P1',
        check: 'silent-empty',
        detail: `Empty ${fileBase} without honest-gap/none-in-range/fetch-failed on file or manifest`,
        path: `profiles/${bioguideId}/${fileBase}.json (manifest.${manifestKey}=${manifestStatus ?? 'missing'})`,
      },
    ];
  }

  const lacksFileStatus = !fileStatus && ['controversies', 'endorsements', 'orgVoteLinks'].includes(fileBase);
  if (lacksFileStatus) {
    return [
      {
        bioguideId,
        category: fileBase,
        severity: 'P2',
        check: 'no-file-status-field',
        detail: `Empty ${fileBase} relies on manifest-only status (file has no status field)`,
        path: `profiles/${bioguideId}/${fileBase}.json`,
      },
    ];
  }

  return [];
}

function auditManifestContentMismatch(
  bioguideId: string,
  manifestCategories: Record<string, string>,
  fileBase: string,
  data: unknown,
): DefectRow[] {
  const key = manifestCategoryKey(fileBase);
  const status = manifestCategories[key];
  const empty = categoryIsEmpty(fileBase, data);
  const defects: DefectRow[] = [];

  if (status === 'filled' && empty) {
    defects.push({
      bioguideId,
      category: 'manifest',
      severity: 'P0',
      check: 'manifest-data-mismatch',
      detail: `manifest.categories.${key}=filled but ${fileBase}.json is empty`,
      path: `profiles/${bioguideId}/manifest.json`,
    });
  }

  if ((status === 'honest-gap' || status === 'none-in-range') && !empty) {
    defects.push({
      bioguideId,
      category: 'manifest',
      severity: 'P1',
      check: 'manifest-data-mismatch',
      detail: `manifest.categories.${key}=${status} but ${fileBase}.json has content`,
      path: `profiles/${bioguideId}/manifest.json`,
    });
  }

  return defects;
}

async function auditMember(bioguideId: string, displayName: string): Promise<DefectRow[]> {
  const dir = path.join(profilesRoot, bioguideId);
  const manifest = await readJson<{ categories?: Record<string, string> }>(path.join(dir, 'manifest.json'));
  const manifestCategories = manifest?.categories ?? {};
  const defects: DefectRow[] = [];

  const categoryFiles = [
    'statements',
    'positions',
    'saidDid',
    'news',
    'votes',
    'finance',
    'controversies',
    'endorsements',
    'orgVoteLinks',
  ] as const;

  for (const fileBase of categoryFiles) {
    const filePath = path.join(dir, `${fileBase}.json`);
    const data = (await readJson<Record<string, unknown>>(filePath)) ?? {};
    defects.push(...auditEmptyCategoryStatus(bioguideId, fileBase, data, manifestCategories));
    defects.push(...auditManifestContentMismatch(bioguideId, manifestCategories, fileBase, data));
  }

  const statements = await readJson<{ byTopic?: Record<string, { statements?: TopicStatementEntry[] }> }>(
    path.join(dir, 'statements.json'),
  );
  if (statements) defects.push(...auditStatements(bioguideId, statements));

  const positions = await readJson<{
    byTopic?: Record<string, { platformPositions?: Array<{ text: string; url?: string; tier?: string }> }>;
  }>(path.join(dir, 'positions.json'));
  if (positions) defects.push(...auditPositions(bioguideId, positions));

  defects.push(...auditSaidDid(bioguideId, displayName));

  const news = await readJson<{
    items?: Array<{ headline?: string; url?: string; date?: string; source?: { tier?: string } }>;
    status?: string;
  }>(path.join(dir, 'news.json'));
  if (news) defects.push(...auditNews(bioguideId, news));

  const controversies = await readJson<{ items?: Array<{ sources?: Array<{ url?: string; tier?: string }> }> }>(
    path.join(dir, 'controversies.json'),
  );
  if (controversies?.items?.length) {
    defects.push(...auditControversySources(bioguideId, controversies.items));
  }

  return defects;
}

function renderMarkdown(
  defects: DefectRow[],
  identityByBioguide: Map<string, { name: string; initials: string }>,
): string {
  const generatedAt = new Date().toISOString();
  const lines: string[] = [
    '# Profile credibility re-audit — 7 locked profiles',
    '',
    `**Generated:** ${generatedAt}`,
    '**Mode:** read-only (no data mutations)',
    '**Members:** S000033, O000172, M000355, M001184, W000817, C001098, P000197',
    '',
    '## Summary',
    '',
    '| bioguideId | Name | Defect rows | P0 | P1 | P2 |',
    '|------------|------|-------------|----|----|-----|',
  ];

  for (const id of LOCKED_PROFILES) {
    const memberDefects = defects.filter((d) => d.bioguideId === id);
    const identity = identityByBioguide.get(id);
    const p0 = memberDefects.filter((d) => d.severity === 'P0').length;
    const p1 = memberDefects.filter((d) => d.severity === 'P1').length;
    const p2 = memberDefects.filter((d) => d.severity === 'P2').length;
    lines.push(
      `| ${id} | ${identity?.name ?? '?'} | ${memberDefects.length} | ${p0} | ${p1} | ${p2} |`,
    );
  }

  lines.push('', `**Total defect rows:** ${defects.length}`, '');
  lines.push('## Per-member detail', '');

  for (const id of LOCKED_PROFILES) {
    const identity = identityByBioguide.get(id);
    const memberDefects = defects.filter((d) => d.bioguideId === id);
    lines.push(`### ${id} — ${identity?.name ?? 'Unknown'} (${memberDefects.length} defects)`, '');
    if (memberDefects.length === 0) {
      lines.push('_No defects flagged by automated checks._', '');
      continue;
    }
    lines.push(
      '| Category | Severity | Check | Detail | Path |',
      '|----------|----------|-------|--------|------|',
    );
    for (const d of memberDefects) {
      const detail = d.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      lines.push(`| ${d.category} | ${d.severity} | ${d.check} | ${detail} | ${d.path} |`);
    }
    lines.push('');
  }

  lines.push(
    '---',
    '',
    '_Report produced by `scripts/audit-profile-credibility.ts`. Fixes are out of scope for this pass — Claude rules on remediation._',
    '',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const identityByBioguide = loadProfileDisplayIdentityByBioguide(projectRoot);
  const allDefects: DefectRow[] = [];

  for (const bioguideId of LOCKED_PROFILES) {
    const identity = identityByBioguide.get(bioguideId);
    const displayName = identity?.name ?? bioguideId;
    const memberDefects = await auditMember(bioguideId, displayName);
    allDefects.push(...memberDefects);
    console.log(`${bioguideId}: ${memberDefects.length} defect row(s)`);
  }

  const outPath = path.join(projectRoot, 'data/reports/profile-credibility-audit-2026-07-08.md');
  await mkdir(path.dirname(outPath), { recursive: true });
  const markdown = renderMarkdown(allDefects, identityByBioguide);
  await writeFile(outPath, markdown, 'utf8');
  console.log(`Wrote ${outPath} (${allDefects.length} total defect rows)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
