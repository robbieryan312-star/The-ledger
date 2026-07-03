/**
 * Source URL integrity checks for profile JSON — rejects fabricated placeholders,
 * bare homepages on article-type citations, and media sources missing URLs.
 */

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
  return /^Voted\s+(Yea|Nay)\s+on\b/i.test(text.trim());
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
  return Boolean(diff.said.url?.trim() && diff.did.url?.trim());
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
  }
  return violations;
}

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /endorsement-a1b2c3d4e5f6/i,
  // Human-readable prefix + invented hex tail (e.g. endorsement-a1b2c3d4e5f6) — not AP-style pure-hex slugs.
  /\b[a-z]{4,}-[a-f0-9]{8,}\b/i,
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
  data: { items?: Array<{ id?: string; source?: LooseSource; url?: string }> },
  fileLabel: string,
): SourceIntegrityViolation[] {
  const violations: SourceIntegrityViolation[] = [];
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
    }
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
