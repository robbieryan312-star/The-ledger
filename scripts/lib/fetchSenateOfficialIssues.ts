/**
 * Official Senate/House member issues-page scrape → platform stances.
 * Primary channel for platform text when the member's officialWebsite hosts /issues/.
 *
 * Proven path (S000033): https://www.sanders.senate.gov/issues/ Elementor accordion.
 */
import { fetchWithRetry } from './resilientFetch';
import { classifyTextToRecordTopicId, RECORD_TOPIC_BUCKETS } from '../../lib/recordTopicBuckets';
import { isDisqualifiedPlatformPosition } from '../../lib/data/sourceIntegrity';
import type { SourceTier } from '../../lib/types';

const FETCH_UA =
  'Mozilla/5.0 (compatible; TheLedgerBot/1.0; +https://github.com/robbieryan312-star/The-ledger)';

export interface OfficialPlatformPosition {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

export interface OfficialIssuesResult {
  byTopic: Map<string, OfficialPlatformPosition[]>;
  pageUrl: string;
  connected: boolean;
  reached: boolean;
  rawSectionCount: number;
  qualifiedCount: number;
}

/** Accordion / section title → preferred record topic (when classifier returns legislation). */
const TITLE_TOPIC_HINTS: Array<{ re: RegExp; topicId: string }> = [
  { re: /^medicare|^prescription|^health/i, topicId: 'healthcare' },
  { re: /^education/i, topicId: 'education' },
  { re: /^energy|^environment|^climate/i, topicId: 'climate' },
  { re: /^veterans/i, topicId: 'defense-veterans' },
  { re: /^foreign|^national security/i, topicId: 'defense-veterans' },
  { re: /^racial|^civil rights|^voting/i, topicId: 'civil-liberties' },
  { re: /^labor|^taxes|^trade|^economy|^wall street|^retirement|^food|^agriculture/i, topicId: 'economy-taxes' },
  { re: /^media|^technology|^privacy/i, topicId: 'technology' },
];

const CANONICAL_TOPIC_IDS = new Set(
  RECORD_TOPIC_BUCKETS.map((b) => b.id).filter((id) => id !== 'legislation'),
);

const MAX_PLATFORM_PER_TOPIC = 3;
const MIN_TEXT = 80;
const MAX_TEXT = 900;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function truncateAtSentence(text: string, max = MAX_TEXT): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const stop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '));
  if (stop >= MIN_TEXT) return slice.slice(0, stop + 1).trim();
  return slice.trim();
}

function hintTopicFromTitle(title: string): string | null {
  for (const { re, topicId } of TITLE_TOPIC_HINTS) {
    if (re.test(title.trim())) return topicId;
  }
  return null;
}

function resolveTopicId(title: string, text: string): string | null {
  const classified = classifyTextToRecordTopicId(text);
  const hint = hintTopicFromTitle(title);
  // Prefer classifier when it lands on a canonical topic — but drop title/classifier
  // conflicts (e.g. Economy accordion text that scores as healthcare).
  if (CANONICAL_TOPIC_IDS.has(classified)) {
    if (hint && hint !== classified) return null;
    return classified;
  }
  if (classified === 'legislation' && hint) return hint;
  return null;
}

/** Parse Elementor accordion pairs (sanders.senate.gov/issues/ shape). */
export function extractAccordionIssueSections(html: string): Array<{ title: string; text: string }> {
  const out: Array<{ title: string; text: string }> = [];
  const re =
    /<div id="elementor-tab-title-(\d+)"[\s\S]*?class="elementor-accordion-title"[^>]*>(.*?)<\/a>[\s\S]*?<div id="elementor-tab-content-\1"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = stripTags(m[2] ?? '').trim();
    const text = truncateAtSentence(stripTags(m[3] ?? ''));
    if (title && text.length >= MIN_TEXT) out.push({ title, text });
  }
  return out;
}

export function issuesPageUrl(officialWebsite: string): string {
  const base = officialWebsite.replace(/\/+$/, '');
  return `${base}/issues/`;
}

export async function fetchSenateOfficialIssuesPositions(options: {
  officialWebsite: string;
  sourceName: string;
  asOf: string;
}): Promise<OfficialIssuesResult> {
  const pageUrl = issuesPageUrl(options.officialWebsite);
  let connected = false;
  let html: string | null = null;

  try {
    const { response } = await fetchWithRetry(pageUrl, {
      headers: { 'User-Agent': FETCH_UA, Accept: 'text/html' },
      timeoutMs: 25_000,
    });
    connected = true;
    if (response.ok) html = await response.text();
  } catch {
    return {
      byTopic: new Map(),
      pageUrl,
      connected: false,
      reached: false,
      rawSectionCount: 0,
      qualifiedCount: 0,
    };
  }

  if (!html) {
    return {
      byTopic: new Map(),
      pageUrl,
      connected,
      reached: false,
      rawSectionCount: 0,
      qualifiedCount: 0,
    };
  }

  const sections = extractAccordionIssueSections(html);
  const byTopic = new Map<string, OfficialPlatformPosition[]>();
  let qualifiedCount = 0;

  for (const section of sections) {
    if (isDisqualifiedPlatformPosition(section.text)) continue;
    const topicId = resolveTopicId(section.title, section.text);
    if (!topicId) continue;
    const list = byTopic.get(topicId) ?? [];
    if (list.length >= MAX_PLATFORM_PER_TOPIC) continue;
    // Integrity: classifier must match bucket OR be legislation (title-hint path).
    const classified = classifyTextToRecordTopicId(section.text);
    if (classified !== 'legislation' && classified !== topicId) continue;
    list.push({
      text: section.text,
      source: options.sourceName,
      url: pageUrl,
      tier: 'official',
      asOf: options.asOf,
    });
    byTopic.set(topicId, list);
    qualifiedCount += 1;
  }

  return {
    byTopic,
    pageUrl,
    connected: true,
    reached: true,
    rawSectionCount: sections.length,
    qualifiedCount,
  };
}
