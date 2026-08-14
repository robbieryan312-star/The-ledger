/**
 * Source URL integrity checks for profile JSON — rejects fabricated placeholders,
 * bare homepages on article-type citations, and media sources missing URLs.
 */

import {
  classifyTextToRecordTopicId,
  recordKeywordMatches,
  RECORD_TOPIC_BUCKETS,
} from '../recordTopicBuckets';
import { hasUndecodedHtmlEntity } from './htmlEntities';
import { isAllowedNewsArticleUrl, isRegistryNewsHost } from './newsFeedRegistry';
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
  if (/^(Voted\s+(Yea|Nay)\s+on|On\s+\w+\s+\d{1,2},\s+\d{4},\s+the\b.{0,40}\b(Senate|House)\b|The\s+Senate\s+voted|The\s+House\s+voted|Did\s+not\s+vote\s+on)/i.test(t)) {
    return true;
  }
  if (/\b(voted for|voted against)\s+HR\b/i.test(t)) return true;
  if (/\b(voted for|voted against)\s+S\.?\s*\d/i.test(t)) return true;
  if (/\bThe resolution passed the (House|Senate) on\b/i.test(t)) return true;
  if (/On \w+ \d{1,2}, \d{4}, the (Senate|House) (passed|voted|took a vote)/i.test(t)) return true;
  if (/On \w+ \d{1,2}, the (Senate|House)\b/i.test(t)) return true;
  if (/\bthe (Senate|House) (voted|held a vote|passed)\b/i.test(t)) return true;
  if (/\bwon re-election to the U\.S\. (Senate|House)/i.test(t)) return true;
  if (/\bwon re-election in the \d{4} election for the U\.S\. (Senate|House)/i.test(t)) return true;
  /** Jan 6 electoral-certification vote narration duplicated across hundreds of profiles. */
  if (/^Congress convened a joint session on/i.test(t) && /\bvoted against certifying the electoral votes/i.test(t)) {
    return true;
  }
  /** Dated third-person roll-call narration — recounts chamber action, not member stance. */
  if (/^On \w+ \d{1,2}, \d{4}, the (Senate|House)\s+(voted|passed|rejected|failed|adopted|defeated|invoked)/i.test(t)) {
    return true;
  }
  return false;
}

/** Third-party characterization — a journalist's or organization's assessment about the member, not the member's own stated position. */
export function isThirdPartyCharacterization(text: string): boolean {
  const t = text.trim();
  return /has\s+arguably\s+been|is\s+(widely|often|generally)\s+(considered|regarded|seen)/i.test(t)
    || /^[\u201c"]\s*[A-Z][^"]*[\u201d"]\s*[\u2013\u2014–—-]\s*(NRA|AFP|Heritage|NARAL|Planned Parenthood|Sierra Club|Chamber)/i.test(t);
}

/** Ballotpedia bio boilerplate — not a member's stated policy position. */
export function isBioBoilerplate(text: string): boolean {
  const t = text.trim();
  if (/is a member of the U\.S\. (Senate|House)/i.test(t)) return true;
  if (/ assumed office on /i.test(t) && /current term ends on/i.test(t)) return true;
  if (/\bassumed office in \d{4}\b/i.test(t)) return true;
  if (/\bwas born in\b/i.test(t) && /\b(graduated|attended|earned|degree)\b/i.test(t)) return true;
  if (/\bgraduated from\b/i.test(t)) return true;
  if (/\bbecame the first\b/i.test(t)) return true;
  if (/\bwas first elected to the U\.S\. (Senate|House)/i.test(t)) return true;
  if (/\bPrior to (her|his|their) election to the U\.S\. House/i.test(t)) return true;
  if (/\bShe also served in the (Wisconsin|Tennessee|state)/i.test(t)) return true;
  if (/Candidate Survey/i.test(t) && /Ballotpedia/i.test(t)) return true;
  if (/Completing the survey will update the candidate's Ballotpedia profile/i.test(t)) return true;
  return false;
}

/** Site furniture / disclaimers / nav text scraped from Ballotpedia — not member positions. */
export function isSiteFurniture(text: string): boolean {
  const t = text.trim();
  if (/^Note: The finance data shown here/i.test(t)) return true;
  if (/Click here for more on (federal|state) campaign finance law/i.test(t)) return true;
  if (/Learn more about the survey here/i.test(t)) return true;
  if (/FEC website\s*\./i.test(t) && /Satellite spending groups/i.test(t)) return true;
  return false;
}

/** Member speaks a policy stance (first-person or attributed quote) — keep even when date-led. */
function hasMemberPolicyStance(text: string): boolean {
  const t = text.trim();
  if (/\b(I|we|my|our)\b/i.test(t)) return true;
  if (/\bIn Congress, I\b/i.test(t)) return true;
  if (/\b(introduced|cosponsored|authored|sponsored)\s+(the\s+)?[A-Z]/i.test(t)) return true;
  if (/\b(criticized|opposed|supported|called for|defended|advocated for)\b/i.test(t)) return true;
  if (/\bissued a statement\b/i.test(t) && /\b(said|stated),?\s*[\u201c"]/i.test(t)) return true;
  if (/\b(said|stated|announced|declared|argued),?\s*[\u201c"]/i.test(t)) {
    if (/\b(I am deeply sorry|I made a mistake|I apologize|I accept total responsibility)\b/i.test(t)) {
      return false;
    }
    if (/\b(I am pleased|I believe|I support|we must|we need|I want to)\b/i.test(t)) return true;
  }
  return false;
}

/** Incident / biography narration — member is the subject of news, not the stance-holder. */
function isIncidentOrBiographyNarration(text: string): boolean {
  const t = text.trim();
  if (/^On \w+ \d{1,2}, \d{4}, .{0,160}\bwas (arrested|charged|indicted|convicted|sentenced)\b/i.test(t)) {
    return true;
  }
  return false;
}

/** Event narration — chronicles another official's actions with no first-person stance from the member. */
export function isEventNarration(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  if (isIncidentOrBiographyNarration(t)) return true;

  if (hasMemberPolicyStance(t)) return false;

  const hasFirstPersonStance = /\b(I|we|my|our)\b/i.test(t);
  if (hasFirstPersonStance) return false;

  if (/^(The day after|On the day after|The following day|In response to|Following the)\b/i.test(t)) {
    return true;
  }
  if (/\bAttorney General\b.{0,60}\b(sent|wrote|responded|issued|announced)\b/i.test(t)) {
    return true;
  }
  if (/\b(sent a letter to|sent .{0,40} letter to|wrote to)\b/i.test(t)) {
    if (/^(I|We)\b/i.test(t)) return false;
    if (/^\s*[\u201c"]\s*(I|We)\b/i.test(t)) return false;
    return true;
  }
  if (/^On \w+ \d{1,2}, \d{4}, \w+ sent\b/i.test(t)) return true;
  if (/\bresponding to the filibuster\b/i.test(t)) return true;
  if (/\bto\s+Paul\b/i.test(t) && /\b(sent|wrote|letter|filibuster)\b/i.test(t)) return true;
  if (/\bHolder wrote\b/i.test(t)) return true;
  if (/\bfirst announced\b.{0,80}\b(inquiry|investigation|impeachment)\b/i.test(t)) return true;
  if (/^(House Speaker|Senator|Rep\.|Representative)\s+\w+.{0,40}\bfirst announced\b/i.test(t)) return true;

  return false;
}

/** Ballotpedia [NNN] footnote markers — not member-stated position text. */
export function hasCitationCruft(text: string): boolean {
  return /\[\d+\]/.test(text);
}

/** Platform position text that is not a member's own stated position. */
export function isDisqualifiedPlatformPosition(text: string): boolean {
  return isVoteRestatementSaid(text)
    || isThirdPartyCharacterization(text)
    || isEventNarration(text)
    || isBioBoilerplate(text)
    || isSiteFurniture(text)
    || hasCitationCruft(text);
}

const VALID_TIERS = new Set(['official', 'nonpartisan', 'media', 'alleged', 'unverified']);

export function isValidSourceTier(tier: string | undefined): boolean {
  return typeof tier === 'string' && VALID_TIERS.has(tier);
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
 * Nominee / confirmation subjects (person names) from Said or Did text.
 * Used so topic-bucket equality alone cannot pair Moshe Marvit ↔ Kara Westercamp.
 */
export function extractNominationSubjects(text: string): string[] {
  const subjects: string[] = [];
  const patterns = [
    /\bnomination of ([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4})\s+to be\b/gi,
    /\bConfirmation:\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4})\s*(?:,|\s+to be\b)/gi,
    /\bConfirm(?:ation of|ing)?\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4})\s+to be\b/gi,
    /\bInvoke Cloture:\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4})\s+to be\b/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = (m[1] ?? '').replace(/\s+/g, ' ').trim();
      if (name.length >= 3) subjects.push(name);
    }
  }
  return subjects;
}

function nominationLastNames(names: string[]): Set<string> {
  const out = new Set<string>();
  for (const name of names) {
    const parts = name.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1]?.toLowerCase().replace(/[^a-z'-]/g, '');
    if (last && last.length >= 2) out.add(last);
  }
  return out;
}

function textMentionsAnyNominationLastName(text: string, names: Set<string>): boolean {
  const normalized = text.toLowerCase();
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(normalized)) return true;
  }
  return false;
}

/**
 * Said and Did must share real subject matter — same classified topic (non-legislation)
 * or at least one shared substantive keyword. Prevents tax-filing vs war-powers pairs.
 * Nomination/confirmation rows additionally require matching nominee last names so two
 * civil-liberties confirmations about different people never pair.
 */
export function saidDidSubjectsOverlap(saidQuote: string, didAction: string): boolean {
  const billText = didAction.replace(/^Voted\s+\w+\s+—\s+[^:]+:\s*/i, '').trim();
  const saidNominees = extractNominationSubjects(saidQuote);
  const didNominees = extractNominationSubjects(billText);
  if (saidNominees.length > 0 || didNominees.length > 0) {
    const saidLast = nominationLastNames(saidNominees);
    const didLast = nominationLastNames(didNominees);
    if (saidLast.size > 0 && didLast.size > 0) {
      let shared = false;
      for (const n of saidLast) {
        if (didLast.has(n)) {
          shared = true;
          break;
        }
      }
      if (!shared) return false;
    } else if (saidLast.size > 0) {
      if (!textMentionsAnyNominationLastName(billText, saidLast)) return false;
    } else if (didLast.size > 0) {
      if (!textMentionsAnyNominationLastName(saidQuote, didLast)) return false;
    }
  }
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

/** AP News canonical article URLs: slug + 32-char lowercase hex id (real wire format, not fabricated tails). */
const AP_NEWS_ARTICLE_URL =
  /^https?:\/\/(?:www\.)?apnews\.com\/article\/[a-z0-9][a-z0-9-]*-[a-f0-9]{32}\/?$/i;

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
  if (AP_NEWS_ARTICLE_URL.test(trimmed)) return false;
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

/** True when `url`'s hostname is on the approved RSS news registry. */
export function isApprovedNewsOutlet(url: string | undefined): boolean {
  return isRegistryNewsHost(url);
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
  data: {
    status?: string;
    items?: Array<{ id?: string; source?: LooseSource; url?: string; isOpinion?: unknown }>;
  },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  const status = data.status;
  pushIf(violations, fileLabel, !status, 'news.json missing required status');
  pushIf(
    violations,
    fileLabel,
    status != null && !['filled', 'honest-gap', 'fetch-failed'].includes(status),
    `invalid news status: ${status ?? '(missing)'}`,
  );
  const itemCount = data.items?.length ?? 0;
  pushIf(
    violations,
    fileLabel,
    status === 'honest-gap' && itemCount > 0,
    'honest-gap status requires zero items',
  );
  pushIf(
    violations,
    fileLabel,
    status === 'filled' && itemCount === 0,
    'filled status requires at least one news item',
  );
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
        !isAllowedNewsArticleUrl(articleUrl),
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
      pushIf(violations, label, isDisqualifiedPlatformPosition(text), 'disqualified text presented as a stated position');
      pushIf(violations, label, hasUndecodedHtmlEntity(text), 'undecoded HTML entity in platform position text');
      pushIf(violations, label, pos.tier !== undefined && !isValidSourceTier(pos.tier), `invalid tier: ${pos.tier}`);
      pushIf(violations, label, Boolean(pos.url?.trim()) && !pos.asOf?.trim(), 'platform position missing asOf date');
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

/** Scan topicPositions.json mega-bundle for disqualified platform position text. */
export function validateTopicPositionsBundle(
  data: { byBioguideId?: Record<string, Record<string, { platformPositions?: LoosePlatformPosition[] }>> },
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [bioguideId, topics] of Object.entries(data.byBioguideId ?? {})) {
    for (const [topicId, topic] of Object.entries(topics)) {
      for (const [idx, pos] of (topic.platformPositions ?? []).entries()) {
        const label = `topicPositions.json.${bioguideId}.${topicId}.platformPositions[${idx}]`;
        const text = pos.text ?? '';
        pushIf(violations, label, isDisqualifiedPlatformPosition(text), 'disqualified text in topicPositions bundle');
        pushIf(violations, label, hasUndecodedHtmlEntity(text), 'undecoded HTML entity in bundle platform position');
        pushIf(violations, label, hasCitationCruft(text), 'citation cruft [NNN] in bundle platform position');
      }
    }
  }
  return violations;
}

export function validateFinanceFile(
  data: { bioguideId?: string; entry?: { source?: LooseSource; asOf?: string; fecProfileUrl?: string } | null; status?: string },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  if (!data.entry) return violations;
  checkSourceObject(violations, `${fileLabel}.entry.source`, data.entry.source, true, false);
  pushIf(violations, fileLabel, !data.entry.asOf?.trim(), 'finance entry missing asOf');
  if (data.entry.fecProfileUrl?.trim()) {
    pushIf(violations, `${fileLabel}.entry`, isPlaceholderUrl(data.entry.fecProfileUrl), 'placeholder fecProfileUrl');
  }
  return violations;
}

export function validateTradesFile(
  data: { bioguideId?: string; trades?: Array<{ date?: string; source?: LooseSource; url?: string }>; status?: string },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [idx, trade] of (data.trades ?? []).entries()) {
    const label = `${fileLabel}.trades[${idx}]`;
    pushIf(violations, label, !trade.date?.trim(), 'trade missing date');
    if (trade.source) {
      checkSourceObject(violations, `${label}.source`, trade.source, true, false);
    }
    if (trade.url?.trim()) {
      pushIf(violations, label, isPlaceholderUrl(trade.url), `placeholder trade url: ${trade.url}`);
    }
  }
  return violations;
}

export function validateLegislationFile(
  data: { bioguideId?: string; meta?: { source?: string; asOf?: string }; status?: string },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  pushIf(violations, fileLabel, !data.bioguideId?.trim(), 'legislation missing bioguideId');
  pushIf(violations, `${fileLabel}.meta`, !data.meta?.asOf?.trim(), 'legislation meta missing asOf');
  return violations;
}

export function validateOrgVoteLinksFile(
  data: { bioguideId?: string; links?: Array<{ orgName?: string; voteUrl?: string; source?: LooseSource }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [idx, link] of (data.links ?? []).entries()) {
    const label = `${fileLabel}.links[${idx}]`;
    pushIf(violations, label, !link.orgName?.trim(), 'org vote link missing orgName');
    if (link.voteUrl?.trim()) {
      pushIf(violations, label, isPlaceholderUrl(link.voteUrl), `placeholder voteUrl: ${link.voteUrl}`);
      pushIf(violations, label, isBareHomepageUrl(link.voteUrl), `bare homepage voteUrl: ${link.voteUrl}`);
    }
    if (link.source) {
      checkSourceObject(violations, `${label}.source`, link.source, Boolean(link.voteUrl?.trim()), false);
    }
  }
  return violations;
}

export function validateSaidDidFile(
  data: {
    bioguideId?: string;
    byTopic?: Record<
      string,
      Array<{
        voteDate?: string;
        congressGovUrl?: string;
        billNumber?: string;
        billTitle?: string;
        tier?: string;
        saidQuote?: string;
        saidUrl?: string;
      }>
    >;
  },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
  for (const [topicId, links] of Object.entries(data.byTopic ?? {})) {
    for (const [idx, link] of links.entries()) {
      const label = `${fileLabel}.byTopic.${topicId}[${idx}]`;
      pushIf(violations, label, !link.voteDate?.trim(), 'saidDid link missing voteDate');
      pushIf(violations, label, !link.congressGovUrl?.trim(), 'saidDid link missing congressGovUrl');
      pushIf(violations, label, !link.billNumber?.trim(), 'saidDid link missing billNumber');
      pushIf(violations, label, link.tier !== undefined && !isValidSourceTier(link.tier), `invalid tier: ${link.tier}`);
      if (link.congressGovUrl?.trim()) {
        pushIf(violations, label, isPlaceholderUrl(link.congressGovUrl), `placeholder congressGovUrl`);
      }
      // Embedded Said (quote + CREC URL): required when present; mandatory for S000033 official pairs.
      const row = link;
      const hasEmbedded = Boolean(row.saidQuote?.trim() || row.saidUrl?.trim());
      const requireEmbedded =
        data.bioguideId === 'S000033' && row.tier === 'official';
      if (requireEmbedded || hasEmbedded) {
        pushIf(violations, label, !row.saidQuote?.trim(), 'saidDid link missing saidQuote');
        pushIf(violations, label, !row.saidUrl?.trim(), 'saidDid link missing saidUrl');
        if (row.saidUrl?.trim()) {
          pushIf(violations, label, !/\/CREC-/i.test(row.saidUrl), 'saidUrl must be a CREC/GovInfo URL');
          pushIf(violations, label, isPlaceholderUrl(row.saidUrl), 'placeholder saidUrl');
        }
      }
      const saidQuote = row.saidQuote?.trim() ?? '';
      const didAction = `${row.billNumber ?? ''}: ${row.billTitle ?? ''}`.trim();
      if (saidQuote && didAction.length > 2) {
        pushIf(
          violations,
          label,
          !saidDidSubjectsOverlap(saidQuote, didAction),
          'Said subject and Did bill subject have no meaningful overlap',
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
  finance?: unknown;
  trades?: unknown;
  legislation?: unknown;
  orgVoteLinks?: unknown;
  saidDid?: unknown;
}): SourceIntegrityViolation[] {
  return [
    ...validateEndorsementsFile(files.endorsements as Parameters<typeof validateEndorsementsFile>[0], 'endorsements.json'),
    ...validateControversiesFile(files.controversies as Parameters<typeof validateControversiesFile>[0], 'controversies.json'),
    ...validateNewsFile(files.news as Parameters<typeof validateNewsFile>[0], 'news.json'),
    ...(files.finance != null
      ? validateFinanceFile(files.finance as Parameters<typeof validateFinanceFile>[0], 'finance.json')
      : []),
    ...(files.trades != null
      ? validateTradesFile(files.trades as Parameters<typeof validateTradesFile>[0], 'trades.json')
      : []),
    ...(files.legislation != null
      ? validateLegislationFile(files.legislation as Parameters<typeof validateLegislationFile>[0], 'legislation.json')
      : []),
    ...(files.orgVoteLinks != null
      ? validateOrgVoteLinksFile(files.orgVoteLinks as Parameters<typeof validateOrgVoteLinksFile>[0], 'orgVoteLinks.json')
      : []),
    ...(files.saidDid != null
      ? validateSaidDidFile(files.saidDid as Parameters<typeof validateSaidDidFile>[0], 'saidDid.json')
      : []),
  ];
}

/** @deprecated Use validateProfileSources — kept for fixture labels. */
export const validateS000033ProfileSources = validateProfileSources;
