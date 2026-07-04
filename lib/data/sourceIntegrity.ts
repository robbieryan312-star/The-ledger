/**
 * Source URL integrity checks for profile JSON — rejects fabricated placeholders,
 * bare homepages on article-type citations, and media sources missing URLs.
 */

import {
  RECORD_TOPIC_BUCKETS,
  classifyTextToRecordTopicId,
  recordKeywordMatches,
} from './profileRecordByTopic';
import { hasUndecodedHtmlEntity } from './htmlEntities';
import { normalizeTopicId } from './topicAliases';

export interface SourceIntegrityViolation {
  path: string;
  message: string;
}

/** Verbatim fabricated AP endorsement slug from the S000033 pilot (must always fail). */
export const KNOWN_BAD_AP_ENDORSEMENT_URL =
  'https://apnews.com/article/election-2020-joe-biden-bernie-sanders-endorsement-a1b2c3d4e5f6';

/** Hostnames our article fetch tooling cannot verify (CloudFront/bot blocks). Sole-source claims fail. */
export const NON_FETCH_VERIFIABLE_HOSTS = new Set([
  'apnews.com',
  'www.apnews.com',
]);

export function isFetchVerifiableUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return !NON_FETCH_VERIFIABLE_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** Said side must not restate a roll-call vote (Ballotpedia "Voted Yea/Nay on…" rows). */
export function isVoteRestatementSaid(text: string): boolean {
  const t = text.trim();
  return /^(Voted\s+(Yea|Nay)\s+on|On\s+\w+\s+\d{1,2},\s+\d{4},\s+the\b.{0,40}\b(Senate|House)\b|The\s+Senate\s+voted|The\s+House\s+voted|Did\s+not\s+vote\s+on)/i.test(t);
}

/** Third-party characterization — a journalist's or organization's assessment about the member, not the member's own stated position. */
export function isThirdPartyCharacterization(text: string): boolean {
  const t = text.trim();
  return /has\s+arguably\s+been|is\s+(widely|often|generally)\s+(considered|regarded|seen)/i.test(t)
    || /^[\u201c"]\s*[A-Z][^"]*[\u201d"]\s*[\u2013\u2014–—-]\s*(NRA|AFP|Heritage|NARAL|Planned Parenthood|Sierra Club|Chamber)/i.test(t);
}

export interface SaidDidDiffLike {
  said: { quote: string; url?: string; verbatim?: boolean };
  did: { action: string; url?: string };
}

export function isGenuineSaidDidDiff(diff: SaidDidDiffLike): boolean {
  const quote = diff.said.quote?.trim() ?? '';
  if (!quote || !diff.did.action?.trim()) return false;
  if (isVoteRestatementSaid(quote)) return false;
  if (diff.said.verbatim === false && isVoteRestatementSaid(quote)) return false;
  if (!saidDidSubjectsOverlap(quote, diff.did.action)) return false;
  return Boolean(diff.said.url?.trim() && diff.did.url?.trim());
}

/** Collect matched record-bucket keywords (word-boundary) from text. */
function matchedSubjectKeywords(text: string): Set<string> {
  const hay = text.toLowerCase();
  const hits = new Set<string>();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    for (const keyword of bucket.keywords) {
      if (recordKeywordMatches(hay, keyword)) hits.add(keyword.trim().toLowerCase());
    }
  }
  return hits;
}

/**
 * Said and Did must share real subject matter — same classified topic (non-legislation)
 * or at least one shared substantive keyword. Prevents tax-filing vs war-powers pairs.
 */
export function saidDidSubjectsOverlap(saidQuote: string, didAction: string): boolean {
  const billText = didAction.replace(/^Voted\s+\w+\s+—\s+[^:]+:\s*/i, '').trim();
  const saidTopic = classifyTextToRecordTopicId(saidQuote);
  const voteTopic = classifyTextToRecordTopicId(billText);
  if (
    saidTopic !== 'legislation' &&
    voteTopic !== 'legislation' &&
    saidTopic === voteTopic
  ) {
    return true;
  }
  const saidHits = matchedSubjectKeywords(saidQuote);
  const voteHits = matchedSubjectKeywords(billText);
  for (const k of saidHits) {
    if (voteHits.has(k)) return true;
  }
  return false;
}

export function validateSaidDidDiffs(diffs: SaidDidDiffLike[], label: string): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [idx, diff] of diffs.entries()) {
    if (isVoteRestatementSaid(diff.said.quote ?? '')) {
      violations.push({
        path: `${label}[${idx}].said`,
        message: `vote-as-Said tautology: quote begins with "Voted … on"`,
      });
    }
    if (diff.said.verbatim === false && isVoteRestatementSaid(diff.said.quote ?? '')) {
      violations.push({
        path: `${label}[${idx}].said`,
        message: 'verbatim:false vote restatement presented as stated position',
      });
    }
    if (!isGenuineSaidDidDiff(diff)) {
      violations.push({
        path: `${label}[${idx}]`,
        message: 'incomplete or non-genuine Said→Did diff',
      });
    }
    if (!saidDidSubjectsOverlap(diff.said.quote ?? '', diff.did.action ?? '')) {
      violations.push({
        path: `${label}[${idx}]`,
        message: 'Said subject and Did bill subject have no meaningful overlap',
      });
    }
  }
  return violations;
}

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /endorsement-a1b2c3d4e5f6/i,
  // Human-readable prefix + invented hex tail with at least one a–f letter (Politico numeric -00156257 IDs are OK).
  /\b[a-z]{4,}-(?=[a-f0-9]{8,}\b)(?=[a-f]*[a-f])[a-f0-9]{8,}\b/i,
  /example\.com/i,
  /\/example\//i,
  /\bxxxx\b/i,
];

const BARE_HOMEPAGE_HOSTS = new Set([
  'apnews.com',
  'www.apnews.com',
  'congress.gov',
  'www.congress.gov',
  'fec.gov',
  'www.fec.gov',
  'c-span.org',
  'www.c-span.org',
  'senate.gov',
  'www.senate.gov',
  'house.gov',
  'www.house.gov',
  'opensecrets.org',
  'www.opensecrets.org',
  'ballotpedia.org',
  'www.ballotpedia.org',
  'senatestockwatcher.com',
  'www.senatestockwatcher.com',
]);

export function isPlaceholderUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

export function isBareHomepageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (!BARE_HOMEPAGE_HOSTS.has(host)) return false;
    const path = parsed.pathname.replace(/\/+$/, '');
    return path === '' || path === '/';
  } catch {
    return true;
  }
}

export function isArticleTypeIntegrityUrl(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  if (isPlaceholderUrl(url)) return false;
  if (isBareHomepageUrl(url)) return false;
  return true;
}

/** Approved journalism outlets for news.json (AGENTS.md / ledger-data-policy.mdc). */
const APPROVED_NEWS_OUTLET_HOSTS = new Set([
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
]);

/** True when `url`'s hostname is one of the approved journalism outlets for news.json. */
export function isApprovedNewsOutlet(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    return Array.from(APPROVED_NEWS_OUTLET_HOSTS).some((a) => host === a || host.endsWith(`.${a}`));
  } catch {
    return false;
  }
}

/** Wire services corroborate independently at 'nonpartisan' tier per the data-credibility policy. */
export function isWireServiceOutlet(url: string | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, '');
    return host === 'apnews.com' || host.endsWith('.apnews.com') || host === 'reuters.com' || host.endsWith('.reuters.com');
  } catch {
    return false;
  }
}

/**
 * Normalize a URL for dedupe comparison: lowercase host, strip `www.`, drop
 * tracking/query params and fragments, and remove a trailing slash.
 */
export function normalizeUrlForDedupe(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${host}${pathname}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Lowercase, whitespace-collapsed headline text for fuzzy duplicate comparison. */
function normalizeHeadlineForCompare(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token-overlap (Dice coefficient) similarity — treated as a duplicate above 0.9. */
export function headlineSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeHeadlineForCompare(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeHeadlineForCompare(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) shared += 1;
  }
  return (2 * shared) / (tokensA.size + tokensB.size);
}

export function isNearDuplicateHeadline(a: string, b: string): boolean {
  return headlineSimilarity(a, b) > 0.9;
}

interface LooseSource {
  name?: string;
  url?: string;
  tier?: string;
  date?: string;
}

function pushIf(
  violations: SourceIntegrityViolation[],
  path: string,
  condition: boolean,
  message: string,
): void {
  if (condition) violations.push({ path, message });
}

function checkSourceObject(
  violations: SourceIntegrityViolation[],
  label: string,
  source: LooseSource | undefined,
  requireUrl: boolean,
  articleType: boolean,
): void {
  if (!source) {
    if (requireUrl) {
      violations.push({ path: label, message: 'missing source object' });
    }
    return;
  }
  const url = source.url?.trim();
  pushIf(violations, label, requireUrl && !url, 'source missing url');
  if (!url) return;
  pushIf(violations, label, isPlaceholderUrl(url), `placeholder or fabricated url: ${url}`);
  pushIf(violations, label, isBareHomepageUrl(url), `bare homepage url: ${url}`);
  if (articleType) {
    pushIf(violations, label, !isArticleTypeIntegrityUrl(url), `article-type url failed integrity: ${url}`);
  }
}

export function validateEndorsementsFile(
  data: {
    endorses?: Array<{ source?: LooseSource; corroboratingSources?: LooseSource[] }>;
    endorsedBy?: Array<{ source?: LooseSource; corroboratingSources?: LooseSource[] }>;
  },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  const checkEndorsementItem = (
    item: { source?: LooseSource; corroboratingSources?: LooseSource[] },
    label: string,
  ) => {
    checkSourceObject(violations, `${label}.source`, item.source, true, true);
    const primaryUrl = item.source?.url?.trim();
    if (primaryUrl && !isFetchVerifiableUrl(primaryUrl)) {
      const corroborates = (item.corroboratingSources ?? []).filter(
        (s) => s.url?.trim() && isFetchVerifiableUrl(s.url),
      );
      if (corroborates.length === 0) {
        violations.push({
          path: label,
          message: `sole source on non-fetch-verifiable domain (${new URL(primaryUrl).hostname}) with no corroborating fetch-verifiable source`,
        });
      }
    }
  };
  for (const [idx, item] of (data.endorses ?? []).entries()) {
    checkEndorsementItem(item, `${fileLabel}.endorses[${idx}]`);
  }
  for (const [idx, item] of (data.endorsedBy ?? []).entries()) {
    checkEndorsementItem(item, `${fileLabel}.endorsedBy[${idx}]`);
  }
  return violations;
}

export function validateControversiesFile(
  data: { items?: Array<{ id?: string; sources?: LooseSource[] }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const item of data.items ?? []) {
    const id = item.id ?? '?';
    for (const [idx, source] of (item.sources ?? []).entries()) {
      checkSourceObject(
        violations,
        `${fileLabel}.items[${id}].sources[${idx}]`,
        source,
        true,
        source.tier === 'media' || source.tier === 'alleged',
      );
      pushIf(
        violations,
        `${fileLabel}.items[${id}].sources[${idx}]`,
        (source.tier === 'media' || source.tier === 'alleged') && !source.date,
        'media/alleged source missing date',
      );
    }
  }
  return violations;
}

export function validateNewsFile(
  data: { items?: Array<{ id?: string; source?: LooseSource; url?: string; isOpinion?: unknown }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  const seenNormalizedUrls = new Map<string, string>();
  for (const item of data.items ?? []) {
    const id = item.id ?? '?';
    const label = `${fileLabel}.items[${id}]`;
    checkSourceObject(violations, `${label}.source`, item.source, true, true);
    pushIf(
      violations,
      label,
      !item.source?.date,
      'news source missing date on source object',
    );
    const articleUrl = item.url?.trim() || item.source?.url?.trim();
    pushIf(violations, label, !articleUrl, 'news item missing article url');
    if (articleUrl) {
      pushIf(violations, label, isPlaceholderUrl(articleUrl), `placeholder url: ${articleUrl}`);
      pushIf(violations, label, isBareHomepageUrl(articleUrl), `bare homepage url: ${articleUrl}`);
      pushIf(
        violations,
        label,
        !isApprovedNewsOutlet(articleUrl),
        `unapproved news outlet: ${articleUrl}`,
      );
      const normalized = normalizeUrlForDedupe(articleUrl);
      const prior = seenNormalizedUrls.get(normalized);
      pushIf(
        violations,
        label,
        prior !== undefined,
        `duplicate normalized url within file (also at ${prior ?? '?'}): ${articleUrl}`,
      );
      if (prior === undefined) seenNormalizedUrls.set(normalized, id);
    }
    pushIf(
      violations,
      label,
      typeof item.isOpinion !== 'boolean',
      'news item missing explicit boolean isOpinion flag',
    );
  }
  return violations;
}

interface LooseStatement {
  title?: string;
  url?: string;
  tier?: string;
  date?: string;
  verbatim?: boolean;
}

export function validateStatementsFile(
  data: { byTopic?: Record<string, { statements?: LooseStatement[] }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [topicId, topic] of Object.entries(data.byTopic ?? {})) {
    for (const [idx, stmt] of (topic.statements ?? []).entries()) {
      const label = `${fileLabel}.byTopic.${topicId}.statements[${idx}]`;
      if (stmt.tier === 'media' || stmt.tier === 'alleged') {
        pushIf(
          violations,
          label,
          stmt.verbatim !== true,
          `${stmt.tier} tier statement requires verbatim:true`,
        );
      }
    }
  }
  return violations;
}

interface LoosePlatformPosition {
  text?: string;
  source?: string;
  url?: string;
  tier?: string;
  asOf?: string;
}

/**
 * platformPositions.json (Said side, positions.json byTopic) must reject: vote-restatement
 * tautologies, undecoded HTML entities, and text whose classified topic doesn't match the
 * bucket it's filed under (misattributed/off-topic platform text).
 */
export function validatePlatformPositionsFile(
  data: { byTopic?: Record<string, { platformPositions?: LoosePlatformPosition[] }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [topicId, topic] of Object.entries(data.byTopic ?? {})) {
    for (const [idx, pos] of (topic.platformPositions ?? []).entries()) {
      const label = `${fileLabel}.byTopic.${topicId}.platformPositions[${idx}]`;
      const text = pos.text ?? '';
      pushIf(violations, label, isVoteRestatementSaid(text), 'vote-restatement text presented as a stated position');
      pushIf(violations, label, isThirdPartyCharacterization(text), 'third-party characterization presented as member stated position');
      pushIf(violations, label, hasUndecodedHtmlEntity(text), 'undecoded HTML entity in platform position text');
      const canonicalTopicId = normalizeTopicId(topicId);
      if (text.trim().length > 0 && canonicalTopicId !== 'legislation') {
        const classified = classifyTextToRecordTopicId(text);
        pushIf(
          violations,
          label,
          classified !== 'legislation' && classified !== canonicalTopicId,
          `classified topic "${classified}" does not match filed bucket "${topicId}" (canonical "${canonicalTopicId}")`,
        );
      }
    }
  }
  return violations;
}

export function validateProfileSources(files: {
  endorsements: unknown;
  controversies: unknown;
  news: unknown;
}): SourceIntegrityViolation[] {
  return [
    ...validateEndorsementsFile(files.endorsements as Parameters<typeof validateEndorsementsFile>[0], 'endorsements.json'),
    ...validateControversiesFile(files.controversies as Parameters<typeof validateControversiesFile>[0], 'controversies.json'),
    ...validateNewsFile(files.news as Parameters<typeof validateNewsFile>[0], 'news.json'),
  ];
}

/** @deprecated Use validateProfileSources — kept for fixture labels. */
export const validateS000033ProfileSources = validateProfileSources;
