/**
 * Append-only fixtures for member news name matching (bare surname ban).
 */
export const MEMBER_NEWS_MATCH_SANDERS_LEG = {
  bioguideId: 'S000033',
  name: 'Bernard Sanders',
  firstName: 'Bernard',
  lastName: 'Sanders',
  chamber: 'senate',
} as const;

export const MEMBER_NEWS_MATCH_KNOWN_BAD_BARE_SURNAME = {
  defect: 'bare-surname-news-match',
  description: 'Surname alone must never match a member — causes Fetterman/Sanders false positives',
  text: 'Sanders leads in early polling among progressives in the midwest.',
  expectedMatch: null,
} as const;

export const MEMBER_NEWS_MATCH_KNOWN_GOOD_HONORIFIC = {
  defect: 'honorific-lastname-ok',
  description: 'Sen. Sanders / Senator Sanders is an allowed match',
  text: 'Sen. Sanders introduced legislation on the Senate floor Tuesday.',
  expectedMatch: 'Sen. Sanders',
} as const;

export const MEMBER_NEWS_MATCH_KNOWN_GOOD_FULL_NAME = {
  defect: 'full-name-ok',
  description: 'Bernie Sanders / Bernard Sanders full name is an allowed match',
  text: 'Bernie Sanders spoke at a rally in Burlington about Medicare for All.',
  expectedMatchContains: 'Sanders',
} as const;
