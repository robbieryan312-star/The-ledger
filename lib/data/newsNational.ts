/**
 * National Congress news snapshot — GDELT DOC API per member.
 * Output: lib/data/generated/newsNational.json (sync:news-national).
 */
import type { NewsItem } from '../types';
import { isRegistryNewsHost, tierForArticleUrl } from './newsFeedRegistry';
import { leadSummary } from './displaySummary';
import newsNationalSnapshot from './generated/newsNational.json';

interface MemberNewsArticle {
  title: string;
  outlet: string;
  publishedDate: string;
  url: string;
}

interface MemberNewsEntry {
  bioguideId: string;
  name: string;
  articles: MemberNewsArticle[];
}

interface NewsNationalSnapshot {
  byBioguideId: Record<string, MemberNewsEntry>;
}

const snapshot = newsNationalSnapshot as NewsNationalSnapshot;

/** GDELT articles for a member from the national snapshot (empty when file missing). */
export function getNationalNewsArticles(bioguideId: string): MemberNewsArticle[] {
  const entry = snapshot.byBioguideId[bioguideId];
  return entry?.articles ?? [];
}

/** Map GDELT national articles to profile NewsItem shape (approved hosts only). */
export function nationalArticlesToNewsItems(
  bioguideId: string,
  articles: MemberNewsArticle[],
): NewsItem[] {
  const items: NewsItem[] = [];
  for (const [idx, article] of articles.entries()) {
    if (!isRegistryNewsHost(article.url)) continue;
    const tier = tierForArticleUrl(article.url) ?? 'media';
    const date = article.publishedDate.slice(0, 10);
    items.push({
      id: `${bioguideId.toLowerCase()}-gdelt-${idx + 1}`,
      headline: article.title,
      summary: leadSummary(article.title, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : article.publishedDate,
      category: 'Congress',
      isOpinion: false,
      isVerified: false,
      url: article.url,
      source: {
        name: article.outlet,
        url: article.url,
        tier,
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
        description: 'GDELT DOC API — corroborate with official record before citing as verified fact',
      },
    });
  }
  return items;
}
