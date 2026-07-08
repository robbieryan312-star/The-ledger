/**
 * Drop news / controversies / endorsements rows that fail profile source-integrity rules.
 * Used when migrating gold-standard per-category profile files — honest gap over bad URLs.
 */
import {
  isArticleTypeIntegrityUrl,
  isFetchVerifiableUrl,
  validateControversiesFile,
  validateEndorsementsFile,
  validateNewsFile,
} from './sourceIntegrity';

interface LooseSource {
  name?: string;
  url?: string;
  tier?: string;
  date?: string;
  description?: string;
}

export interface ProfileNewsItem {
  id?: string;
  headline?: string;
  summary?: string;
  date?: string;
  category?: string;
  isOpinion?: boolean;
  isVerified?: boolean;
  url?: string;
  source?: LooseSource;
}

export interface ProfileControversyItem {
  id?: string;
  title?: string;
  summary?: string;
  category?: string;
  status?: string;
  date?: string;
  isVerified?: boolean;
  sources?: LooseSource[];
}

export interface ProfileEndorsementItem {
  name?: string;
  office?: string;
  date?: string;
  politicianId?: string;
  source?: LooseSource;
  corroboratingSources?: LooseSource[];
}

export interface ProfileEndorsements {
  endorses?: ProfileEndorsementItem[];
  endorsedBy?: ProfileEndorsementItem[];
}

function sourcePassesArticleRules(source: LooseSource | undefined): boolean {
  const url = source?.url?.trim();
  if (!url || !source?.date?.trim()) return false;
  return isArticleTypeIntegrityUrl(url);
}

function endorsementItemValid(item: ProfileEndorsementItem): boolean {
  const violations = validateEndorsementsFile(
    { endorses: [item], endorsedBy: [] },
    'endorsements.json',
  );
  return violations.length === 0;
}

function newsItemValid(item: ProfileNewsItem): boolean {
  const violations = validateNewsFile({ status: 'filled', items: [item] }, 'news.json');
  return violations.length === 0;
}

function controversyItemValid(item: ProfileControversyItem): ProfileControversyItem | null {
  const sources = (item.sources ?? []).filter((s) => {
    const url = s.url?.trim();
    if (!url || !s.date?.trim()) return false;
    return isArticleTypeIntegrityUrl(url);
  });
  if (sources.length === 0) return null;
  const cleaned = { ...item, sources };
  const violations = validateControversiesFile({ items: [cleaned] }, 'controversies.json');
  return violations.length === 0 ? cleaned : null;
}

/** Keep only news rows with article-type URLs and dated sources. */
export function sanitizeProfileNews(items: ProfileNewsItem[] | undefined): ProfileNewsItem[] {
  return (items ?? []).filter(newsItemValid).map((item) => {
    const articleUrl = item.url?.trim() || item.source?.url?.trim() || '';
    return { ...item, url: articleUrl };
  });
}

/** Keep controversies whose sources all have verifiable URLs (media/alleged = article path). */
export function sanitizeProfileControversies(
  items: ProfileControversyItem[] | undefined,
): ProfileControversyItem[] {
  return (items ?? [])
    .map(controversyItemValid)
    .filter((item): item is ProfileControversyItem => item !== null);
}

/** Keep endorsements with fetch-verifiable primary URL or corroboration. */
export function sanitizeProfileEndorsements(
  data: ProfileEndorsements | undefined,
): ProfileEndorsements {
  if (!data) return { endorses: [], endorsedBy: [] };
  return {
    endorses: (data.endorses ?? []).filter(endorsementItemValid),
    endorsedBy: (data.endorsedBy ?? []).filter(endorsementItemValid),
  };
}

/** True when at least one endorsement row survives sanitization. */
export function hasSanitizedEndorsements(data: ProfileEndorsements): boolean {
  return (data.endorses?.length ?? 0) + (data.endorsedBy?.length ?? 0) > 0;
}

export { isArticleTypeIntegrityUrl, isFetchVerifiableUrl, sourcePassesArticleRules };
