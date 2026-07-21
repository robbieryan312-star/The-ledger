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

/** Owner 2026-07-20: comparison-only mention does NOT qualify for profile News. */
export const MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY = {
  defect: 'comparison-only-news-mention',
  description:
    'Comparison foil ("Is he Bernie Sanders or Donald Trump?") is not subject and not a quote',
  headline:
    'Is he Bernie Sanders or Donald Trump? Protest vote complicates Graham Platner’s victory',
  body: 'He is an echo of both Trump and Senator Bernie Sanders, who ran insurgent campaigns in 2016 based on economic populism of one kind or another.',
  expectedOk: false,
  expectedReason: 'comparison-only-mention',
} as const;

/**
 * Owner 2026-07-21: "among those responding" ≠ subject and ≠ quote — does NOT qualify.
 * Frozen bad (was incorrectly kept as Iran reaction piece).
 */
export const MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING = {
  defect: 'among-those-responding-mention',
  description:
    '"Bernie Sanders among those responding" is list-membership, not subject or direct quote',
  headline:
    '‘Unhinged madman’: US politicians react to Trump’s expletive-laden threat to Iran',
  body: 'Marjorie Taylor Greene and Bernie Sanders among those responding with alarm to Trump writing ‘open the fuckin’ strait, you crazy bastards’ Some US politicians have reacted with alarm and questioned…',
  expectedOk: false,
  expectedReason: 'among-those-responding-mention',
} as const;

/** Direct member quote DOES qualify when the member is clearly the quote source. */
export const MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE = {
  defect: 'direct-member-quote-ok',
  description: 'Verbatim Sanders quote attributed to him qualifies',
  headline:
    'Bernie Sanders rails against billionaire ‘greed’ amid California tax battle',
  body: 'Billionaires are “treading on very, very thin ice,” Bernie Sanders warned on Wednesday as he criticized grotesque levels of economic inequality.',
  expectedOk: true,
  expectedReason: 'direct-quote',
} as const;

/** Mention as email releaser without a direct quote does NOT qualify. */
export const MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE = {
  defect: 'releaser-mention-no-quote',
  description:
    'CDC emails released by Sen. Bernie Sanders — subject is CDC, no direct Sanders quote',
  headline: 'CDC emails reveal challenges facing its next director',
  body: 'They were recently released by Senator Bernie Sanders, an independent from Vermont, and ranking member of the Senate Health Committee. He asked Houry for documents related to Secretary Kennedy\'s politicization of the CDC.',
  expectedOk: false,
  expectedReason: 'mention-without-subject-or-quote',
} as const;
