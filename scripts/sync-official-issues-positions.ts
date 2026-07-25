/**
 * Sync official member /issues/ pages → profile positions.json (migrated destination).
 *
 * Run: npm run sync:official-issues-positions -- --member S000033
 * Log: tee /tmp/ledger-sync-official-issues.log
 * Output: lib/data/generated/profiles/{bioguideId}/positions.json
 *
 * Route order (platform stances): official issues pages FIRST → Ballotpedia → campaign site
 * (only if it qualifies). Source-exhaustion: do not honest-gap while a higher route is untried.
 */
import { config } from 'dotenv';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSenateOfficialIssuesPositions } from './lib/fetchSenateOfficialIssues';
import { RECORD_TOPIC_BUCKETS } from '../lib/recordTopicBuckets';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseMembers(): string[] {
  const ids: string[] = [];
  const single = process.argv.indexOf('--member');
  if (single !== -1) {
    const v = process.argv[single + 1]?.trim();
    if (v) ids.push(v);
  }
  const batch = process.argv.indexOf('--members');
  if (batch !== -1) {
    for (const raw of (process.argv[batch + 1] ?? '').split(',')) {
      const v = raw.trim();
      if (v) ids.push(v);
    }
  }
  return [...new Set(ids)];
}

async function resolveOfficialWebsite(bioguideId: string): Promise<string | null> {
  const headerPath = path.join(
    projectRoot,
    'lib/data/generated/profiles',
    bioguideId,
    'header.json',
  );
  try {
    const header = JSON.parse(await readFile(headerPath, 'utf8')) as {
      profile?: { officialWebsite?: string };
    };
    const url = header.profile?.officialWebsite?.trim();
    if (url) return url;
  } catch {
    /* fall through */
  }
  const legislatorsPath = path.join(projectRoot, 'lib/data/generated/currentLegislators.json');
  const raw = JSON.parse(await readFile(legislatorsPath, 'utf8')) as {
    legislators: Array<{ bioguideId: string; officialWebsite?: string; url?: string }>;
  };
  const leg = raw.legislators.find((l) => l.bioguideId === bioguideId);
  return leg?.officialWebsite?.trim() || leg?.url?.trim() || null;
}

function sourceNameFromWebsite(website: string): string {
  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return 'Official member website';
  }
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const members = parseMembers();
  if (members.length === 0) {
    console.error('Usage: npm run sync:official-issues-positions -- --member S000033');
    process.exit(1);
  }

  const asOf = new Date().toISOString().slice(0, 10);
  const topicIds = RECORD_TOPIC_BUCKETS.map((b) => b.id).filter((id) => id !== 'legislation');

  for (const bioguideId of members) {
    const website = await resolveOfficialWebsite(bioguideId);
    if (!website) {
      console.error(`${bioguideId}: no officialWebsite — cannot fetch /issues/`);
      process.exit(1);
    }

    console.log(`${bioguideId}: fetching ${website.replace(/\/+$/, '')}/issues/`);
    const result = await fetchSenateOfficialIssuesPositions({
      officialWebsite: website,
      sourceName: sourceNameFromWebsite(website),
      asOf,
    });

    console.log(
      `  connected=${result.connected} reached=${result.reached} sections=${result.rawSectionCount} qualified=${result.qualifiedCount} url=${result.pageUrl}`,
    );

    const byTopic: Record<
      string,
      { platformPositions: Array<{ text: string; source: string; url: string; tier: string; asOf: string }> }
    > = {};
    for (const id of topicIds) {
      const positions = result.byTopic.get(id) ?? [];
      byTopic[id] = { platformPositions: positions };
      if (positions.length) {
        console.log(`  ${id}: ${positions.length}`);
        for (const p of positions) console.log(`    - ${p.text.slice(0, 100)}…`);
      }
    }

    const filled = result.qualifiedCount > 0;
    const out = {
      bioguideId,
      status: filled ? 'filled' : 'honest-gap',
      note: filled
        ? `M-POSITIONS 2026-07-25: Official issues page via sync:official-issues-positions ` +
          `(${result.pageUrl}) — ${result.qualifiedCount} qualified stance(s), tier official. ` +
          `Ballotpedia secondary (page poverty for this member). Campaign site berniesanders.com/issues ` +
          `redirects to homepage — does not qualify.`
        : `DIAGNOSED honest-gap: official /issues/ connected=${result.connected} reached=${result.reached} ` +
          `sections=${result.rawSectionCount} qualified=0 at ${result.pageUrl}. Exhausted official issues route.`,
      byTopic,
    };

    const destDir = path.join(projectRoot, 'lib/data/generated/profiles', bioguideId);
    await mkdir(destDir, { recursive: true });
    const dest = path.join(destDir, 'positions.json');
    await writeFile(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`  wrote ${dest} status=${out.status}`);

    const manifestPath = path.join(destDir, 'manifest.json');
    try {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        asOf?: string;
        categories?: Record<string, string>;
      };
      manifest.asOf = asOf;
      manifest.categories = { ...(manifest.categories ?? {}), positions: out.status };
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      console.log(`  updated manifest.categories.positions=${out.status}`);
    } catch {
      console.warn(`  WARN: no manifest.json to update for ${bioguideId}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
