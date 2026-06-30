/**
 * Approved journalism quote pipeline — featured Congress pilot (4 profiles).
 * Verbatim quotes in quotation marks only; 2+ independent approved outlets → tier 'media'.
 */
import type { SourceTier } from '../../lib/types';
import {
  getCachedArticle,
  recordCorroboratedQuote,
  upsertArticleCache,
} from './articleVerificationCache';

export const APPROVED_MEDIA_OUTLETS = [
  'nytimes.com',
  'washingtonpost.com',
  'wsj.com',
  'politico.com',
  'thehill.com',
  'apnews.com',
  'reuters.com',
  'npr.org',
  'pbs.org',
  'rollcall.com',
  'cq.com',
  'theatlantic.com',
  'bloomberg.com',
  'propublica.org',
  'theguardian.com',
  'miamiherald.com',
  'tampabay.com',
  'sun-sentinel.com',
  'orlandosentinel.com',
  'floridaphoenix.com',
  'wusf.org',
  'wlrn.org',
] as const;

export interface MediaQuoteSource {
  outlet: string;
  url: string;
  date: string;
  /** Optional Wayback timestamps (YYYYMMDD or YYYYMMDDhhmmss). CDX lookup fills gaps when omitted. */
  waybackStamps?: string[];
}

export interface CuratedMediaQuote {
  quote: string;
  topicId: string;
  sources: MediaQuoteSource[];
}

/** Pilot profiles with curated journalism quotes (verified at sync time). */
export const VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE: Record<string, CuratedMediaQuote[]> = {
  S000033: [
    {
      quote:
        'Together we are going to end the international embarrassment of the United States of America, our great country, being the only major nation on earth not to guarantee health care to all as a right.',
      topicId: 'healthcare',
      sources: [
        {
          outlet: 'Washington Post',
          url: 'https://www.washingtonpost.com/politics/bernie-sanders-set-to-unveil-new-medicare-for-all-legislation-a-key-component-of-his-2020-presidential-bid/2019/04/10/dc625de8-5b7a-11e9-842d-7d3ed7eb3957_story.html',
          date: '2019-04-10',
          waybackStamps: ['20190415', '20190412', '20190410120000', '20190701'],
        },
        {
          outlet: 'New York Times',
          url: 'https://www.nytimes.com/2019/04/10/us/politics/bernie-sanders-medicare-for-all.html',
          date: '2019-04-10',
          waybackStamps: ['20190415', '20190412', '20190410120000', '20190701'],
        },
      ],
    },
  ],
  M000355: [
    {
      quote:
        'It is not an act of charity for the United States and our NATO allies to help supply the Ukrainian people’s self-defense. It is a direct investment in our own core national interests.',
      topicId: 'defense-veterans',
      sources: [
        {
          outlet: 'The Hill',
          url: 'https://thehill.com/homenews/senate/3873707-mcconnell-calls-ukraine-aid-a-direct-investment-for-us-against-putins-war-machine/',
          date: '2023-02-24',
        },
      ],
    },
    {
      quote:
        'Continuing our support for Ukraine is morally right, but it is not only that. It is also a direct investment in cold, hard, American interests.',
      topicId: 'defense-veterans',
      sources: [
        {
          outlet: 'Associated Press',
          url: 'https://apnews.com/article/putin-zelenskyy-washington-4d5fc23be5518e689fbbcac334769d59',
          date: '2022-12-21',
        },
      ],
    },
    {
      quote:
        'Let me be clear: this assistance means more jobs for American workers and newer weapons for American service members.',
      topicId: 'defense-veterans',
      sources: [
        {
          outlet: 'Politico',
          url: 'https://www.politico.com/minutes/congress/06-16-2023/mcconnell-talks-ukraine/',
          date: '2023-06-16',
        },
      ],
    },
  ],
  O000172: [
    {
      quote:
        'In order for us to combat that threat, we must be as ambitious and innovative as possible.',
      topicId: 'climate',
      sources: [
        {
          outlet: 'The Atlantic',
          url: 'https://www.theatlantic.com/science/archive/2019/02/aocgreen-new-deal-new-era-millennial-climate-politics/582295/',
          date: '2019-02-07',
        },
        {
          outlet: 'PBS NewsHour',
          url: 'https://www.pbs.org/newshour/show/why-democrats-say-the-u-s-needs-a-green-new-deal-to-combat-climate-change',
          date: '2019-02-07',
        },
      ],
    },
  ],
  M001184: [
    {
      quote:
        'Congress has voted for ten bills now that will put US citizens at risk, prolong the conflict in Ukraine, waste tax-payer money, increase domestic food and energy prices, and draw us further into this conflict. I have voted against all of them.',
      topicId: 'defense-veterans',
      sources: [
        {
          outlet: 'The Hill',
          url: 'https://thehill.com/homenews/house/3485384-here-are-the-two-republicans-who-voted-against-four-bills-related-to-the-russia-ukraine-conflict/',
          date: '2022-05-11',
        },
      ],
    },
    {
      quote:
        'I knew all along they would trade the cow for magic beans. These beans are like the rest. They don\'t sprout.',
      topicId: 'economy-taxes',
      sources: [
        {
          outlet: 'Politico',
          url: 'https://www.politico.com/news/2025/04/10/house-gop-adopts-budget-framework-paving-the-way-for-trumps-big-beautiful-bill-00283511',
          date: '2025-04-10',
        },
      ],
    },
  ],
};

/** @deprecated Use VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE.S000033 */
export const S000033_VERIFIED_MEDIA_QUOTES = VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE.S000033;

export function isApprovedMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return APPROVED_MEDIA_OUTLETS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function normalizeQuoteForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/^and\s+/, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2014\u2013—–-]/g, ' ')
    .replace(/[^\w\s'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function waybackStampsFromDate(date: string): string[] {
  const compact = date.replace(/-/g, '');
  if (compact.length !== 8) return [];
  const y = compact.slice(0, 4);
  const m = compact.slice(4, 6);
  const d = Number(compact.slice(6, 8));
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    compact,
    `${y}${m}${pad(Math.min(d + 1, 28))}`,
    `${y}${m}${pad(Math.max(d - 1, 1))}`,
    `${y}${m}15`,
    `${y}${m}01`,
  ];
}

const cdxStampCache = new Map<string, string[]>();

async function fetchWaybackStamps(url: string): Promise<string[]> {
  if (cdxStampCache.has(url)) return cdxStampCache.get(url)!;
  try {
    const hostPath = url.replace(/^https?:\/\//, '');
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostPath)}&output=json&limit=6&filter=statuscode:200`;
    const res = await fetch(cdxUrl, {
      headers: { 'User-Agent': 'TheLedger/1.0 (civic research; quote verification)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as string[][];
    const stamps = rows.slice(1).map((row) => row[1]).filter(Boolean);
    cdxStampCache.set(url, stamps);
    return stamps;
  } catch {
    return [];
  }
}

async function fetchPlainFromUrl(url: string, stamp?: string): Promise<string | null> {
  if (!stamp) {
    const cached = getCachedArticle(url);
    if (cached?.plainText) return cached.plainText;
  }

  const headers = { 'User-Agent': 'TheLedger/1.0 (civic research; quote verification)' };
  const fetchUrl = stamp ? `https://web.archive.org/web/${stamp}/${url}` : url;
  try {
    const res = await fetch(fetchUrl, { headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const html = await res.text();
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (!stamp) {
      upsertArticleCache({
        url,
        outlet: new URL(url).hostname.replace(/^www\./, ''),
        plainText: plain,
        fetchedAt: new Date().toISOString(),
      });
    }
    return plain;
  } catch {
    return null;
  }
}

export async function articleContainsQuote(
  url: string,
  quote: string,
  options?: { waybackStamps?: string[]; sourceDate?: string },
): Promise<boolean> {
  if (!isApprovedMediaUrl(url)) return false;
  const needle = normalizeQuoteForMatch(quote);
  const core = needle.slice(0, Math.min(60, needle.length));
  const matchesQuote = (plain: string): boolean => {
    const hay = normalizeQuoteForMatch(plain);
    if (hay.includes(needle)) return true;
    return core.length >= 40 && hay.includes(core.slice(0, 40));
  };

  const live = await fetchPlainFromUrl(url);
  if (live && matchesQuote(live)) return true;

  const explicit = options?.waybackStamps ?? [];
  const fromDate = options?.sourceDate ? waybackStampsFromDate(options.sourceDate) : [];
  const fromCdx = await fetchWaybackStamps(url);
  const stamps = [...new Set([...explicit, ...fromDate, ...fromCdx])];

  for (const stamp of stamps) {
    const plain = await fetchPlainFromUrl(url, stamp);
    if (plain && matchesQuote(plain)) return true;
  }

  return false;
}

export function mediaQuoteTier(sourceCount: number): SourceTier {
  return sourceCount >= 2 ? 'media' : 'alleged';
}

export async function verifyCuratedQuote(
  entry: CuratedMediaQuote,
  bioguideId?: string,
): Promise<{
  verifiedSources: MediaQuoteSource[];
  tier: SourceTier;
} | null> {
  const verifiedSources: MediaQuoteSource[] = [];
  for (const src of entry.sources) {
    const ok = await articleContainsQuote(src.url, entry.quote, {
      waybackStamps: src.waybackStamps,
      sourceDate: src.date,
    });
    if (!ok) continue;
    verifiedSources.push(src);
  }
  if (verifiedSources.length === 0) return null;
  if (bioguideId) {
    for (const src of verifiedSources) {
      recordCorroboratedQuote(src.url, {
        quote: entry.quote,
        bioguideId,
        topicId: entry.topicId,
      });
    }
  }
  return {
    verifiedSources,
    tier: mediaQuoteTier(verifiedSources.length),
  };
}

export async function fetchApprovedMediaStatementsForMember(
  bioguideId: string,
): Promise<
  Array<{
    title: string;
    date: string;
    url: string;
    tier: SourceTier;
    topicId: string;
  }>
> {
  const entries = VERIFIED_MEDIA_QUOTES_BY_BIOGUIDE[bioguideId];
  if (!entries?.length) return [];

  const out: Array<{
    title: string;
    date: string;
    url: string;
    tier: SourceTier;
    topicId: string;
  }> = [];

  for (const entry of entries) {
    const verified = await verifyCuratedQuote(entry, bioguideId);
    if (!verified) continue;
    const primary = verified.verifiedSources[0];
    out.push({
      title: entry.quote,
      date: primary.date,
      url: primary.url,
      tier: verified.tier,
      topicId: entry.topicId,
    });
  }

  return out;
}
