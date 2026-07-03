/** Fetch GDELT news for W000817 + C001098 profile news.json. Run: npx tsx scripts/fetch-batch1-news.ts */
import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeProfileNews } from '../lib/data/sanitizeProfileUiData';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');
const legislatorsFile = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const NEWS_MEMBERS = ['W000817', 'C001098'] as const;

const APPROVED_NEWS_DOMAINS = [
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'politico.com', 'thehill.com',
  'apnews.com', 'reuters.com', 'npr.org', 'pbs.org', 'rollcall.com',
  'theatlantic.com', 'bloomberg.com', 'propublica.org', 'theguardian.com',
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isApprovedOutlet(domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, '');
  return APPROVED_NEWS_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
}

function formatGdeltDate(seendate: string): string {
  if (/^\d{8}T\d{6}Z$/.test(seendate)) {
    return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
  }
  return seendate.slice(0, 10);
}

async function fetchGdelt(bioguideId: string, name: string, state: string, chamber: string) {
  const query = `"${name}" ${state} ${chamber} sourcelang:english`;
  const params = new URLSearchParams({
    query, mode: 'artlist', maxrecords: '8', format: 'json', sort: 'datedesc', timespan: '90d',
  });
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(6000 * attempt);
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    const text = await res.text();
    if (text.includes('Please limit requests')) continue;
    if (!res.ok || text.startsWith('Your search')) continue;
    const data = JSON.parse(text) as { articles?: Array<{ url?: string; title?: string; seendate?: string; domain?: string }> };
    const items = [];
    for (const a of data.articles ?? []) {
      if (!a.url || !a.title || !a.domain || !a.seendate) continue;
      if (!isApprovedOutlet(a.domain)) continue;
      const date = formatGdeltDate(a.seendate);
      items.push({
        id: `n${items.length + 1}`,
        headline: a.title,
        summary: a.title,
        date,
        category: 'Congress',
        isOpinion: false,
        isVerified: false,
        url: a.url,
        source: { name: a.domain.replace(/^www\./, ''), url: a.url, tier: 'media' as const, date },
      });
      if (items.length >= 3) break;
    }
    return sanitizeProfileNews(items);
  }
  return [];
}

async function main(): Promise<void> {
  config({ path: path.join(projectRoot, '.env.local') });
  const legs = JSON.parse(await readFile(legislatorsFile, 'utf8')).legislators as Array<{
    bioguideId: string; name: string; state: string; chamber: string;
  }>;
  for (const id of NEWS_MEMBERS) {
    const leg = legs.find((l) => l.bioguideId === id);
    if (!leg) continue;
    const items = await fetchGdelt(id, leg.name, leg.state, leg.chamber === 'senate' ? 'senate' : 'house');
    console.log(`${id}: ${items.length} article(s)`);
    const profileDir = path.join(profilesRoot, id);
    await writeFile(path.join(profileDir, 'news.json'), JSON.stringify({ bioguideId: id, items }, null, 2) + '\n');
    const manifest = JSON.parse(await readFile(path.join(profileDir, 'manifest.json'), 'utf8')) as {
      categories: Record<string, string>;
    };
    manifest.categories.news = items.length > 0 ? 'filled' : 'fetch-blocked';
    await writeFile(path.join(profileDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await sleep(8000);
  }
}

main();
