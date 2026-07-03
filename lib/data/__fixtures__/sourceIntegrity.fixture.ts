/**
 * Build-gated fixtures for source URL integrity regression tests.
 * APPEND-ONLY — never reset.
 */

export const SOURCE_INTEGRITY_KNOWN_BAD_URLS: Array<{ label: string; url: string }> = [
  {
    label: 'verbatim fabricated AP endorsement slug (S000033 pilot)',
    url: 'https://apnews.com/article/election-2020-joe-biden-bernie-sanders-endorsement-a1b2c3d4e5f6',
  },
  {
    label: 'word-prefix + invented hex slug placeholder',
    url: 'https://apnews.com/article/election-2020-joe-biden-bernie-sanders-endorsement-b1c2d3e4f5a6',
  },
  {
    label: 'example.com placeholder host',
    url: 'https://example.com/fake-article',
  },
  {
    label: 'bare OpenSecrets homepage (batch #1 endorsement regression)',
    url: 'https://www.opensecrets.org',
  },
  {
    label: 'bare Ballotpedia homepage (batch #1 endorsement regression)',
    url: 'https://www.ballotpedia.org',
  },
];

export const SOURCE_INTEGRITY_KNOWN_GOOD_URLS: Array<{ label: string; url: string }> = [
  {
    label: 'fetch-verifiable PBS Sanders→Biden endorsement article',
    url: 'https://www.pbs.org/newshour/politics/watch-live-sanders-endorses-biden-for-president-during-virtual-covid-19-event',
  },
  {
    label: 'real WaPo campaign wage dispute article',
    url: 'https://www.washingtonpost.com/politics/labor-fight-roils-bernie-sanders-campaign-as-workers-demand-the-15-hourly-pay-the-candidate-has-proposed-for-employees-nationwide/2019/07/18/3a6df9f4-a966-11e9-9214-246e594de5d5_story.html',
  },
  {
    label: 'real Politico article with numeric slug suffix (not a placeholder)',
    url: 'https://www.politico.com/news/2025/02/12/bernie-sanders-iowa-midterms-trump-musk-00203974',
  },
];

/** Alleged/media journalism quote without verbatim:true — must fail statements integrity guard. */
export const STATEMENT_KNOWN_BAD_NON_VERBATIM_ALLEGED = {
  label: 'alleged tier quote with verbatim:false',
  statement: {
    title: 'Example alleged journalism quote presented without verbatim confirmation.',
    date: '2020-01-01',
    url: 'https://thehill.com/policy/example-non-verbatim-quote',
    tier: 'alleged' as const,
    topicId: 'climate',
    verbatim: false,
  },
};

/** Vote-as-Said tautology — SJ Res 54 Ballotpedia row diffed against the same vote (must reject). */
export const SAID_DID_KNOWN_BAD_TAUTOLOGY = {
  label: 'SJ Res 54 Ballotpedia vote restated as Said',
  said: {
    quote:
      'Voted Yea on: "A joint resolution to direct the removal of United States Armed Forces from hostilities in the Republic of Yemen that have not been authorized by Congress." (SJ Res 54)',
    url: 'https://ballotpedia.org/Bernard_Sanders',
    verbatim: false,
  },
  did: {
    action:
      'Voted Yea — SJ Res 54: A joint resolution to direct the removal of United States Armed Forces from hostilities in the Republic of Yemen that have not been authorized by Congress.',
    url: 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1152/vote_115_2_00266.htm',
  },
};

/** Subject-mismatched Said→Did — Warren tax-filing statement vs War Powers vote (must reject). */
export const SAID_DID_KNOWN_BAD_SUBJECT_MISMATCH = {
  label: 'W000817 tax-filing statement paired with H.Con.Res. 86 War Powers vote',
  said: {
    quote:
      'Ms. WARREN. Mr. President, I want to say thank you to my partner in these efforts, Senator Blumenthal, and to all the others who have come here to speak on tax day about how outrageous it is that a program to actually let people pay their taxes online for free has been destroyed by Donald Trump and the Republicans.',
    url: 'https://www.govinfo.gov/app/details/CREC-2026-04-15-pt1-PgS1770',
    verbatim: true,
  },
  did: {
    action: 'Voted Yea — H.Con.Res. 86: H. Con. Res. 86',
    url: 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/86',
  },
};
