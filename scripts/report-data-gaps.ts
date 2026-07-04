/**
 * report-data-gaps.ts — Data coverage gap report for all politicians.
 *
 * Iterates allPoliticians and checks which profile data categories exist
 * under lib/data/generated/profiles/{bioguideId}/.
 *
 * Run: npm run report:gaps
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROFILES_DIR = path.join(ROOT, 'lib/data/generated/profiles');
const REPORT_DIR = path.join(ROOT, 'data/reports');

const CATEGORIES = [
  'votes',
  'positions',
  'statements',
  'saidDid',
  'news',
  'endorsements',
  'controversies',
  'finance',
  'trades',
] as const;

type Category = (typeof CATEGORIES)[number];
type Status = 'filled' | 'honest-gap' | 'none-in-range' | 'fetch-failed' | 'EMPTY-no-pipeline-yet';

interface GapEntry {
  id: string;
  bioguideId: string;
  name: string;
  recordType: string;
  statuses: Record<Category, Status>;
  filledCount: number;
  missingCount: number;
}

function checkCategory(profileDir: string, category: Category): Status {
  const filePath = path.join(profileDir, `${category}.json`);
  if (!existsSync(filePath)) return 'EMPTY-no-pipeline-yet';

  try {
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (data.status === 'fetch-blocked' || data.status === 'fetch-failed') return 'fetch-failed';
    if (data.status === 'unavailable') return 'honest-gap';

    const itemsKey =
      category === 'votes' ? 'votes' :
      category === 'positions' ? 'byTopic' :
      category === 'statements' ? 'byTopic' :
      category === 'saidDid' ? 'byTopic' :
      category === 'news' ? 'items' :
      category === 'endorsements' ? 'endorses' :
      category === 'controversies' ? 'items' :
      category === 'finance' ? 'entry' :
      category === 'trades' ? 'trades' :
      null;

    if (!itemsKey) return 'EMPTY-no-pipeline-yet';

    const value = data[itemsKey];
    if (value === null || value === undefined) return 'honest-gap';
    if (Array.isArray(value) && value.length === 0) return 'honest-gap';
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return 'honest-gap';

    return 'filled';
  } catch {
    return 'fetch-failed';
  }
}

async function main() {
  // Dynamic import to avoid circular/resolution issues
  const { allPoliticians } = await import('../lib/data/allPoliticians');

  const entries: GapEntry[] = [];

  for (const pol of allPoliticians) {
    const bioguideId = pol.bioguideId || '';
    const profileDir = bioguideId ? path.join(PROFILES_DIR, bioguideId) : '';
    const dirExists = profileDir && existsSync(profileDir);

    const statuses: Record<Category, Status> = {} as Record<Category, Status>;
    for (const cat of CATEGORIES) {
      statuses[cat] = dirExists ? checkCategory(profileDir, cat) : 'EMPTY-no-pipeline-yet';
    }

    const filledCount = Object.values(statuses).filter((s) => s === 'filled').length;
    const missingCount = CATEGORIES.length - filledCount;

    entries.push({
      id: pol.id,
      bioguideId,
      name: pol.name,
      recordType: pol.recordType || 'unknown',
      statuses,
      filledCount,
      missingCount,
    });
  }

  entries.sort((a, b) => b.missingCount - a.missingCount || a.name.localeCompare(b.name));

  const lines: string[] = [
    '# Data Gaps Report',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    `Total politicians: ${entries.length}`,
    `Fully covered: ${entries.filter((e) => e.missingCount === 0).length}`,
    `Partially covered: ${entries.filter((e) => e.filledCount > 0 && e.missingCount > 0).length}`,
    `No pipeline data: ${entries.filter((e) => e.filledCount === 0).length}`,
    '',
    '## Categories checked',
    CATEGORIES.map((c) => `- ${c}`).join('\n'),
    '',
    '## Coverage by politician',
    '',
    `| Name | bioguideId | Type | Filled | ${CATEGORIES.join(' | ')} |`,
    `| --- | --- | --- | --- | ${CATEGORIES.map(() => '---').join(' | ')} |`,
  ];

  const statusEmoji: Record<Status, string> = {
    'filled': 'OK',
    'honest-gap': 'gap',
    'none-in-range': 'oor',
    'fetch-failed': 'FAIL',
    'EMPTY-no-pipeline-yet': '-',
  };

  for (const entry of entries) {
    const cells = CATEGORIES.map((c) => statusEmoji[entry.statuses[c]]);
    lines.push(
      `| ${entry.name} | ${entry.bioguideId || 'n/a'} | ${entry.recordType} | ${entry.filledCount}/${CATEGORIES.length} | ${cells.join(' | ')} |`,
    );
  }

  lines.push('', '## Legend', '- OK = data file exists with content', '- gap = file exists but empty/unavailable', '- FAIL = fetch failed', '- oor = none in range', '- \\- = no pipeline yet');

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, 'data-gaps.md');
  writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');

  console.log(`Report written to ${path.relative(ROOT, reportPath)}`);
  console.log(`Total: ${entries.length} politicians`);
  console.log(`Fully covered: ${entries.filter((e) => e.missingCount === 0).length}`);
  console.log(`No pipeline data: ${entries.filter((e) => e.filledCount === 0).length}`);

  console.log('\nTop 10 most-missing:');
  for (const e of entries.slice(0, 10)) {
    console.log(`  ${e.name} (${e.bioguideId || 'n/a'}): ${e.filledCount}/${CATEGORIES.length} filled`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
