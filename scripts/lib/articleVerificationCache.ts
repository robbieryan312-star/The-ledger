/**
 * Shared article cache — avoids re-fetching verified journalism text across pilot profiles.
 * See lib/data/SOURCE_LOOKUP.md "Shared article cache".
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { STANDARD_POLICY_TOPICS } from '../../lib/data/topicCoverage';

export const ARTICLE_CACHE_PATH = join(
  process.cwd(),
  'lib/data/generated/articleCache.json',
);

export const PILOT_BIOGUIDES = ['S000033', 'M000355', 'O000172', 'M001184'] as const;

const PILOT_NAME_PATTERNS: Record<string, string[]> = {
  S000033: ['bernie sanders', 'senator sanders'],
  M000355: ['mitch mcconnell', 'senator mcconnell', 'minority leader mcconnell'],
  O000172: ['alexandria ocasio-cortez', 'ocasio-cortez', 'representative ocasio'],
  M001184: ['thomas massie', 'representative massie', 'rep. massie'],
};

const ENDORSEMENT_KEYWORDS = [
  'endorse',
  'endorsed',
  'endorsement',
  'backing',
  'backed',
  'supports his candidacy',
  'supports her candidacy',
  'threw his support',
  'threw her support',
];

export interface CachedQuoteHit {
  quote: string;
  bioguideId: string;
  topicId: string;
}

export interface ArticleCacheEntry {
  url: string;
  outlet: string;
  date?: string;
  plainText: string;
  fetchedAt: string;
  mentionedBioguideIds: string[];
  topicIds: string[];
  endorsementMentions: string[];
  corroboratedQuotes: CachedQuoteHit[];
}

export interface ArticleCacheFile {
  version: 1;
  updatedAt: string;
  articles: Record<string, ArticleCacheEntry>;
}

function normalizePlain(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function outletFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function detectMentionedBioguideIds(plainText: string): string[] {
  const hay = normalizePlain(plainText);
  const hits: string[] = [];
  for (const id of PILOT_BIOGUIDES) {
    const patterns = PILOT_NAME_PATTERNS[id] ?? [];
    if (patterns.some((p) => hay.includes(p))) hits.push(id);
  }
  return hits;
}

function detectTopicIds(plainText: string): string[] {
  const hay = normalizePlain(plainText);
  const hits: string[] = [];
  for (const topic of STANDARD_POLICY_TOPICS) {
    if (topic.keywords.some((k) => hay.includes(k.toLowerCase()))) {
      hits.push(topic.id);
    }
  }
  return hits;
}

function detectEndorsementMentions(plainText: string, bioguideIds: string[]): string[] {
  const hay = normalizePlain(plainText);
  if (!ENDORSEMENT_KEYWORDS.some((k) => hay.includes(k))) return [];
  return bioguideIds.filter((id) =>
    (PILOT_NAME_PATTERNS[id] ?? []).some((p) => hay.includes(p)),
  );
}

export function loadArticleCache(): ArticleCacheFile {
  if (!existsSync(ARTICLE_CACHE_PATH)) {
    return { version: 1, updatedAt: new Date().toISOString(), articles: {} };
  }
  try {
    const raw = readFileSync(ARTICLE_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as ArticleCacheFile;
    if (parsed.version === 1 && parsed.articles) return parsed;
  } catch {
    /* fresh cache on parse failure */
  }
  return { version: 1, updatedAt: new Date().toISOString(), articles: {} };
}

export function saveArticleCache(cache: ArticleCacheFile): void {
  mkdirSync(dirname(ARTICLE_CACHE_PATH), { recursive: true });
  cache.updatedAt = new Date().toISOString();
  writeFileSync(ARTICLE_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

export function getCachedArticle(url: string): ArticleCacheEntry | null {
  return loadArticleCache().articles[url] ?? null;
}

export function upsertArticleCache(
  partial: {
    url: string;
    outlet?: string;
    date?: string;
    plainText: string;
    fetchedAt: string;
    mentionedBioguideIds?: string[];
    topicIds?: string[];
    endorsementMentions?: string[];
    corroboratedQuotes?: CachedQuoteHit[];
  },
): ArticleCacheEntry {
  const cache = loadArticleCache();
  const existing = cache.articles[partial.url];
  const mentioned =
    partial.mentionedBioguideIds ?? detectMentionedBioguideIds(partial.plainText);
  const topics = partial.topicIds ?? detectTopicIds(partial.plainText);
  const endorsements =
    partial.endorsementMentions ?? detectEndorsementMentions(partial.plainText, mentioned);

  const entry: ArticleCacheEntry = {
    url: partial.url,
    outlet: partial.outlet || outletFromUrl(partial.url),
    date: partial.date ?? existing?.date,
    plainText: partial.plainText,
    fetchedAt: partial.fetchedAt,
    mentionedBioguideIds: [...new Set([...(existing?.mentionedBioguideIds ?? []), ...mentioned])],
    topicIds: [...new Set([...(existing?.topicIds ?? []), ...topics])],
    endorsementMentions: [
      ...new Set([...(existing?.endorsementMentions ?? []), ...endorsements]),
    ],
    corroboratedQuotes: [
      ...(existing?.corroboratedQuotes ?? []),
      ...(partial.corroboratedQuotes ?? []),
    ],
  };

  cache.articles[partial.url] = entry;
  saveArticleCache(cache);
  return entry;
}

export function recordCorroboratedQuote(
  url: string,
  hit: CachedQuoteHit,
): void {
  const cached = getCachedArticle(url);
  if (!cached) return;
  const cache = loadArticleCache();
  const entry = cache.articles[url];
  if (!entry) return;
  const dup = entry.corroboratedQuotes.some(
    (q) => q.quote === hit.quote && q.bioguideId === hit.bioguideId,
  );
  if (!dup) entry.corroboratedQuotes.push(hit);
  saveArticleCache(cache);
}

export function cacheStats(): { entryCount: number; pilotMentions: Record<string, number> } {
  const cache = loadArticleCache();
  const pilotMentions: Record<string, number> = {};
  for (const id of PILOT_BIOGUIDES) pilotMentions[id] = 0;
  for (const entry of Object.values(cache.articles)) {
    for (const id of entry.mentionedBioguideIds) {
      if (id in pilotMentions) pilotMentions[id]++;
    }
  }
  return { entryCount: Object.keys(cache.articles).length, pilotMentions };
}
