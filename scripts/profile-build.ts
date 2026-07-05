/**
 * profile-build.ts — one-command hardened pipeline for profile certification.
 *
 * Chains: collect → apply → reprocess → validate → depth report
 * Run: npm run profile:build -- --members P000197[,ID...]
 * Log: tee /tmp/ledger-profile-build.log
 */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateMembers } from './lib/profileMigrate';
import { reprocessMember } from './lib/profileReprocess';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const rosterPath = path.join(projectRoot, 'lib', 'data', 'generated', 'roster.json');
const legislatorsPath = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');

const GUARD_SCRIPTS = [
  'test:crec',
  'test:org-join',
  'test:source-integrity',
  'test:copy-compliance',
  'test:topic-positions-bundle',
  'test:news-registry',
  'test:profile-snapshots',
  'test:client-bundle',
] as const;

function parseMembersArg(argv: string[]): string[] {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) {
    console.error('Usage: npm run profile:build -- --members BIoguideId[,ID...]');
    process.exit(1);
  }
  return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureRosterEntries(bioguides: string[]): Promise<void> {
  const roster = JSON.parse(await readFile(rosterPath, 'utf8')) as {
    generatedAt: string;
    count: number;
    entries: Array<Record<string, unknown>>;
    states: unknown[];
  };
  const legislators = JSON.parse(await readFile(legislatorsPath, 'utf8')) as {
    legislators: Array<{
      bioguideId: string;
      name: string;
      firstName: string;
      lastName: string;
      party: string;
      state: string;
      stateCode: string;
      chamber: string;
      district?: string;
      termStart?: string;
      termEnd?: string;
    }>;
  };

  let added = 0;
  for (const bioguideId of bioguides) {
    if (roster.entries.some((e) => e.bioguideId === bioguideId)) continue;
    const leg = legislators.legislators.find((l) => l.bioguideId === bioguideId);
    if (!leg) {
      console.warn(`  roster: ${bioguideId} not in currentLegislators — skipping roster add`);
      continue;
    }
    const id = slugify(leg.name);
    if (roster.entries.some((e) => e.id === id)) {
      console.log(`  roster: ${bioguideId} slug ${id} already taken — using bioguideId as id`);
    }
    roster.entries.push({
      id: roster.entries.some((e) => e.id === id) ? bioguideId.toLowerCase() : id,
      bioguideId,
      name: leg.name,
      firstName: leg.firstName,
      lastName: leg.lastName,
      party: leg.party,
      state: leg.state,
      stateCode: leg.stateCode,
      chamber: leg.chamber,
      level: 'federal',
      ...(leg.district ? { district: leg.district } : {}),
      recordType: 'featured',
      inOffice: true,
      termStart: leg.termStart,
      termEnd: leg.termEnd,
    });
    added += 1;
    console.log(`  roster: added ${leg.name} (${bioguideId})`);
  }

  if (added > 0) {
    roster.count = roster.entries.length;
    roster.generatedAt = new Date().toISOString();
    await writeFile(rosterPath, `${JSON.stringify(roster, null, 2)}\n`, 'utf8');
  }
}

function runNpmScript(script: string, args: string[] = []): boolean {
  console.log(`\n▶ npm run ${script}${args.length ? ` -- ${args.join(' ')}` : ''}`);
  const result = spawnSync('npm', ['run', script, '--', ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`✗ ${script} failed (exit ${result.status})`);
    return false;
  }
  return true;
}

interface DepthRow {
  category: string;
  status: string;
  count: number;
  reason: string;
}

async function buildDepthReport(bioguideId: string): Promise<DepthRow[]> {
  const dir = path.join(profilesRoot, bioguideId);
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) as {
    categories: Record<string, string>;
  };

  const statements = JSON.parse(await readFile(path.join(dir, 'statements.json'), 'utf8')) as {
    byTopic: Record<string, { statements: unknown[] }>;
    status?: string;
    note?: string;
  };
  const positions = JSON.parse(await readFile(path.join(dir, 'positions.json'), 'utf8')) as {
    byTopic: Record<string, { platformPositions?: unknown[] }>;
  };
  const votes = JSON.parse(await readFile(path.join(dir, 'votes.json'), 'utf8')) as {
    votes: unknown[];
    status?: string;
  };
  const saidDid = JSON.parse(await readFile(path.join(dir, 'saidDid.json'), 'utf8')) as {
    byTopic: Record<string, unknown[]>;
  };
  const news = JSON.parse(await readFile(path.join(dir, 'news.json'), 'utf8')) as {
    items: unknown[];
    status?: string;
    note?: string;
  };
  const controversies = JSON.parse(await readFile(path.join(dir, 'controversies.json'), 'utf8')) as {
    items: unknown[];
  };
  const endorsements = JSON.parse(await readFile(path.join(dir, 'endorsements.json'), 'utf8')) as {
    endorses: unknown[];
    endorsedBy: unknown[];
  };

  const stmtCount = Object.values(statements.byTopic).reduce((n, t) => n + t.statements.length, 0);
  const posCount = Object.values(positions.byTopic).reduce(
    (n, t) => n + (t.platformPositions?.length ?? 0),
    0,
  );
  const voteCount = votes.votes.length;
  const linkCount = Object.values(saidDid.byTopic).reduce((n, arr) => n + arr.length, 0);
  const newsCount = news.items.length;
  const contCount = controversies.items.length;
  const endCount = endorsements.endorses.length + endorsements.endorsedBy.length;

  function reasonFor(category: string, status: string, count: number): string {
    if (status === 'fetch-failed') return 'timeout';
    if (status === 'none-in-range') return 'empty-range';
    if (status === 'filled') return count > 0 ? 'verified' : 'scaffold';
    if (status === 'honest-gap') {
      if (category === 'trades') return 'unintegrated';
      if (category === 'endorsements' || category === 'controversies') return 'absent';
      if (count === 0 && statements.status === 'none-in-range') return 'empty-range';
      if (news.status === 'fetch-failed') return 'timeout';
      return 'absent';
    }
    return status;
  }

  const rows: DepthRow[] = [
    { category: 'statements', status: manifest.categories.statements, count: stmtCount, reason: reasonFor('statements', manifest.categories.statements, stmtCount) },
    { category: 'positions', status: manifest.categories.positions, count: posCount, reason: reasonFor('positions', manifest.categories.positions, posCount) },
    { category: 'votes', status: manifest.categories.votes, count: voteCount, reason: reasonFor('votes', manifest.categories.votes, voteCount) },
    { category: 'saidDid', status: manifest.categories.saidDid, count: linkCount, reason: reasonFor('saidDid', manifest.categories.saidDid, linkCount) },
    { category: 'news', status: manifest.categories.news, count: newsCount, reason: reasonFor('news', manifest.categories.news, newsCount) },
    { category: 'controversies', status: manifest.categories.controversies, count: contCount, reason: reasonFor('controversies', manifest.categories.controversies, contCount) },
    { category: 'endorsements', status: manifest.categories.endorsements, count: endCount, reason: reasonFor('endorsements', manifest.categories.endorsements, endCount) },
  ];

  return rows;
}

async function printCertificationReport(bioguideId: string): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`CERTIFICATION REPORT — ${bioguideId}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const depth = await buildDepthReport(bioguideId);
  console.log('Depth table:');
  console.log('Category       | Status       | Count | Reason');
  console.log('---------------|--------------|-------|--------');
  for (const row of depth) {
    console.log(
      `${row.category.padEnd(14)} | ${row.status.padEnd(12)} | ${String(row.count).padStart(5)} | ${row.reason}`,
    );
  }

  const positions = JSON.parse(
    await readFile(path.join(profilesRoot, bioguideId, 'positions.json'), 'utf8'),
  ) as { byTopic: Record<string, { platformPositions?: Array<{ text: string; topicId?: string }> }> };

  console.log('\nKey Issue position lines:');
  for (const [topicId, topic] of Object.entries(positions.byTopic)) {
    for (const p of topic.platformPositions ?? []) {
      console.log(`  [${topicId}] ${p.text.slice(0, 200)}${p.text.length > 200 ? '…' : ''}`);
    }
  }

  const saidDid = JSON.parse(
    await readFile(path.join(profilesRoot, bioguideId, 'saidDid.json'), 'utf8'),
  ) as {
    byTopic: Record<
      string,
      Array<{ billTitle: string; billNumber: string; voteDate: string; voteChoice: string }>
    >;
  };
  const statements = JSON.parse(
    await readFile(path.join(profilesRoot, bioguideId, 'statements.json'), 'utf8'),
  ) as { byTopic: Record<string, { statements: Array<{ title: string; topicId: string }> }> };

  console.log('\nSaid→Did pairs:');
  for (const [topicId, links] of Object.entries(saidDid.byTopic)) {
    const stmts = statements.byTopic[topicId]?.statements ?? [];
    const saidPreview = stmts[0]?.title.slice(0, 120) ?? '(position-only pairing)';
    for (const link of links) {
      console.log(`  Said: ${saidPreview}…`);
      console.log(`  Did:  ${link.voteChoice} on ${link.billNumber} — ${link.billTitle} (${link.voteDate})`);
    }
  }

  const news = JSON.parse(
    await readFile(path.join(profilesRoot, bioguideId, 'news.json'), 'utf8'),
  ) as {
    items: Array<{ headline: string; date: string; url?: string; source: { name: string; url: string } }>;
  };
  console.log('\nFirst 5 news items:');
  for (const item of news.items.slice(0, 5)) {
    console.log(`  ${item.date} | ${item.source.name} | ${item.url ?? item.source.url}`);
    console.log(`    ${item.headline.slice(0, 100)}`);
  }
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });

  const members = parseMembersArg(process.argv);
  const membersArg = members.join(',');

  console.log('profile-build: Phase E pipeline certification');
  console.log(`Members: ${members.join(', ')}\n`);

  // 0. Ensure roster identity scaffolding
  console.log('Step 0: roster identity');
  await ensureRosterEntries(members);

  // 1. COLLECT — topic positions (CREC + Ballotpedia)
  console.log('\nStep 1: COLLECT topic positions');
  if (!runNpmScript('sync:topic-positions', ['--members', membersArg])) {
    process.exit(1);
  }

  // 2. COLLECT — RSS news (votes/FEC from national snapshots — no per-member sync)
  console.log('\nStep 2: COLLECT news (RSS)');
  if (!runNpmScript('sync:news-rss', ['--members', membersArg])) {
    process.exit(1);
  }

  // 3. APPLY — migrate to per-destination profile files
  console.log('\nStep 3: APPLY migrate to profile files');
  const migrationResults = await migrateMembers(members);
  for (const r of migrationResults) {
    console.log(
      `  ${r.bioguideId} (${r.displayName}): statements=${r.stmtCount} positions=${r.posCount} saidDid=${r.linkCount} news=${r.newsCount} | gaps: ${r.honestGaps.join(', ') || 'none'}`,
    );
  }

  // 4. REPROCESS — parsers/validators over committed JSON
  console.log('\nStep 4: REPROCESS profile files');
  for (const bioguideId of members) {
    const stats = await reprocessMember(bioguideId);
    console.log(
      `  ${stats.bioguideId}: reclassified=${stats.reclassified} purged=${stats.purged}/${stats.positionsBefore} saidDid=${stats.saidDidBefore}->${stats.saidDidAfter}`,
    );
  }

  // 5. VALIDATE — all guard suites
  console.log('\nStep 5: VALIDATE guard suites');
  let allGuardsPass = true;
  for (const script of GUARD_SCRIPTS) {
    if (!runNpmScript(script)) {
      allGuardsPass = false;
    }
  }

  // 6. DEPTH REPORT
  for (const bioguideId of members) {
    await printCertificationReport(bioguideId);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Guards: ${allGuardsPass ? 'ALL PASS' : 'FAIL — see above'}`);
  console.log('Next: wire memberProfile.ts imports + MIGRATED_PROFILE_BIOGUIDES, then npm run build');
  console.log('STOP — await Claude review + owner visual review before push.');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!allGuardsPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
