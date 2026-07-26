/**
 * Append-only fixtures for independent news corroboration (not wire republish).
 * Name-only overlap across unrelated same-member stories is NOT corroboration.
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

/**
 * Known-good: distinct reporting of the same event across two outlets.
 * Headlines share ≥2 NON-NAME tokens (medicare, house, bill) after excluding Sanders name parts.
 */
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
    headline: 'House Democrats join Bernie Sanders to relaunch Medicare for All health bill',
    url: 'https://www.npr.org/2023/05/18/nx-s1-medicare-for-all-sanders-relaunch',
    source: { name: 'NPR', url: 'https://www.npr.org/2023/05/18/nx-s1-medicare-for-all-sanders-relaunch', tier: 'media', date: '2023-05-18' },
  }),
  expectIndependent: true,
  /** Roster / match-name tokens that must not count toward the shared-token threshold. */
  memberNameTokens: ['Bernie Sanders', 'Bernard Sanders', 'Bernie', 'Bernard', 'Sanders'],
} as const;

/**
 * Known-bad (append): two unrelated same-member articles from different outlets.
 * Only shared significant tokens are member-name parts → must NOT verify.
 */
export const NEWS_CORROBORATION_KNOWN_BAD_NAME_ONLY_UNRELATED = {
  defect: 'name-only-overlap-not-same-event',
  description:
    'Unrelated same-member stories that share only name tokens must not corroborate',
  a: item({
    id: 'name-only-a',
    headline: 'Bernie Sanders calls for wealth tax on California billionaires',
    url: 'https://thehill.com/homenews/senate/sanders-wealth-tax-california/',
    source: {
      name: 'The Hill',
      url: 'https://thehill.com/homenews/senate/sanders-wealth-tax-california/',
      tier: 'media',
      date: '2026-04-01',
    },
  }),
  b: item({
    id: 'name-only-b',
    headline: 'Bernie Sanders warns Senate about runaway AI risks',
    url: 'https://www.npr.org/2026/04/02/sanders-ai-risks-hearing',
    source: {
      name: 'NPR',
      url: 'https://www.npr.org/2026/04/02/sanders-ai-risks-hearing',
      tier: 'media',
      date: '2026-04-02',
    },
  }),
  expectIndependent: false,
  expectVerified: false,
  memberNameTokens: ['Bernie Sanders', 'Bernard Sanders', 'Bernie', 'Bernard', 'Sanders'],
} as const;

/**
 * Known-good (append): genuine same-event pair with ≥2 shared NON-NAME tokens
 * (pause, datacenter, construction) after excluding member-name tokens.
 */
export const NEWS_CORROBORATION_KNOWN_GOOD_SAME_EVENT_NON_NAME = {
  defect: 'same-event-non-name-tokens',
  description:
    'Same-event reporting with ≥2 shared non-name tokens is independent corroboration',
  a: item({
    id: 'same-evt-a',
    headline: 'Bernie Sanders introduces bill to pause new AI datacenter construction',
    url: 'https://thehill.com/policy/technology/sanders-datacenter-pause-bill/',
    source: {
      name: 'The Hill',
      url: 'https://thehill.com/policy/technology/sanders-datacenter-pause-bill/',
      tier: 'media',
      date: '2026-03-15',
    },
  }),
  b: item({
    id: 'same-evt-b',
    headline: 'House progressive allies join Sanders on AI datacenter construction pause',
    url: 'https://www.politico.com/news/2026/03/15/sanders-ai-datacenter-pause',
    source: {
      name: 'Politico',
      url: 'https://www.politico.com/news/2026/03/15/sanders-ai-datacenter-pause',
      tier: 'media',
      date: '2026-03-15',
    },
  }),
  expectIndependent: true,
  expectVerified: true,
  memberNameTokens: ['Bernie Sanders', 'Bernard Sanders', 'Bernie', 'Bernard', 'Sanders'],
} as const;

/** M-ALLEGED-POLICY (2026-07-26): unverified approved-outlet listing keeps tier `media`
 *  (isVerified=false). Append-only regression note — demotion to alleged is banned. */
export const NEWS_CORROBORATION_KNOWN_GOOD_LISTING_TIER_PRESERVED = {
  defect: 'listing-tier-not-demoted-to-alleged',
  description:
    'Failed corroboration sets isVerified=false but must preserve approved-outlet listing tier media',
  expectListingTier: 'media' as const,
  expectVerified: false,
} as const;
