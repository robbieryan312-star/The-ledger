/**
 * Append-only fixtures for independent news corroboration (not wire republish).
 */
import type { NewsItem } from '../../types';

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'headline' | 'url' | 'source'>): NewsItem {
  return {
    summary: partial.summary ?? partial.headline,
    date: partial.date ?? '2026-07-01',
    category: partial.category ?? 'Congress',
    isOpinion: false,
    isVerified: false,
    ...partial,
  };
}

/** Known-bad: near-identical syndicated headline across two outlets ≠ 2 independent sources. */
export const NEWS_CORROBORATION_KNOWN_BAD_SYNDICATED = {
  defect: 'syndicated-headline-not-independent',
  description: 'Near-identical wire/syndicate headlines must not count as independent corroboration',
  a: item({
    id: 'syn-a',
    headline: 'Senate passes infrastructure bill in late-night vote',
    url: 'https://apnews.com/article/senate-infrastructure-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    source: { name: 'AP News', url: 'https://apnews.com/article/senate-infrastructure-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', tier: 'nonpartisan', date: '2026-07-01' },
  }),
  b: item({
    id: 'syn-b',
    headline: 'Senate passes infrastructure bill in late night vote',
    url: 'https://www.reuters.com/world/us/senate-passes-infrastructure-bill-late-night-vote-2026-07-01/',
    source: { name: 'Reuters', url: 'https://www.reuters.com/world/us/senate-passes-infrastructure-bill-late-night-vote-2026-07-01/', tier: 'nonpartisan', date: '2026-07-01' },
  }),
  expectIndependent: false,
} as const;

/** Known-good: distinct reporting of the same event across two outlets. */
export const NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT = {
  defect: 'distinct-reporting-independent',
  description: 'Distinct headlines about the same event from two outlets count as independent',
  a: item({
    id: 'dist-a',
    headline: 'Sanders unveils Medicare for All bill with record House cosponsors',
    url: 'https://thehill.com/homenews/senate/medicare-for-all-sanders-cosponsors/',
    source: { name: 'The Hill', url: 'https://thehill.com/homenews/senate/medicare-for-all-sanders-cosponsors/', tier: 'media', date: '2023-05-18' },
  }),
  b: item({
    id: 'dist-b',
    headline: 'Bernie Sanders and House allies relaunch single-payer health push',
    url: 'https://www.npr.org/2023/05/18/nx-s1-medicare-for-all-sanders-relaunch',
    source: { name: 'NPR', url: 'https://www.npr.org/2023/05/18/nx-s1-medicare-for-all-sanders-relaunch', tier: 'media', date: '2023-05-18' },
  }),
  expectIndependent: true,
} as const;
