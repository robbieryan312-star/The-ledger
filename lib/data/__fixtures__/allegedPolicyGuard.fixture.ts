/**
 * Append-only fixtures for alleged-policy guard (data-policy 2026-07-26).
 * Fixtures only grow — never reset.
 */

/** Profile sections that must NEVER carry tier `'alleged'`. */
export const ALLEGED_BANNED_SECTIONS = [
  'votes',
  'statements',
  'saidDid',
  'positions',
  'finance',
  'trades',
  'lobbying',
  'legislation',
  'orgVoteLinks',
  'endorsements',
] as const;

/** Known-BAD: alleged controversy missing verbatim quote + URL. */
export const ALLEGED_KNOWN_BAD_MISSING_VERBATIM = {
  id: 'fixture-bad-no-quote',
  title: 'Unsourced accusation',
  summary: 'Someone said something bad happened.',
  category: 'Conduct' as const,
  status: 'Alleged' as const,
  date: '2020-01-01',
  isVerified: false,
  sources: [{ name: 'Example Outlet', url: '', tier: 'alleged' as const, date: '2020-01-01' }],
  // missing verbatimQuote
  outcome: 'Investigation closed',
};

/** Known-BAD: alleged controversy with paraphrased (non-verbatim) claim text. */
export const ALLEGED_KNOWN_BAD_PARAPHRASE = {
  id: 'fixture-bad-paraphrase',
  title: 'Paraphrased allegation',
  summary: 'Organizers allegedly were underpaid relative to the campaign pledge.',
  category: 'Campaign' as const,
  status: 'Resolved' as const,
  date: '2019-07-18',
  isVerified: false,
  verbatimQuote: 'Field organizers felt their pay was too low compared to the pledge.', // paraphrase marker — not a sourced quote
  paraphrase: true as const,
  outcome: 'Campaign raised pay',
  sources: [
    {
      name: 'Washington Post',
      url: 'https://www.washingtonpost.com/example',
      tier: 'media' as const,
      date: '2019-07-18',
    },
  ],
};

/** Known-BAD: alleged controversy with verbatim+outcome but only one independent outlet. */
export const ALLEGED_KNOWN_BAD_SINGLE_OUTLET = {
  id: 'fixture-bad-single-outlet',
  title: 'Single-outlet allegation',
  summary: 'Contested claim with only one independent reporting outlet.',
  category: 'Campaign' as const,
  status: 'Resolved' as const,
  date: '2019-07-18',
  isVerified: false,
  verbatimQuote:
    '"Given our campaign\'s commitment to fighting for a living wage of at least $15.00 an hour, we believe it is only fair that the campaign would carry through this commitment to its own field team."',
  outcome: 'Campaign subsequently raised pay / limited hours so pay met $15/hr equivalent.',
  reportedByOutletCount: 1,
  sources: [
    {
      name: 'Washington Post',
      url: 'https://www.washingtonpost.com/politics/labor-fight-roils-bernie-sanders-campaign-as-workers-demand-the-15-hourly-pay-the-candidate-has-proposed-for-employees-nationwide/2019/07/18/3a6df9f4-a966-11e9-9214-246e594de5d5_story.html',
      tier: 'alleged' as const,
      date: '2019-07-18',
    },
    {
      name: 'Washington Post',
      url: 'https://www.washingtonpost.com/politics/bernie-sanders-defends-campaign-salaries-after-post-report-of-labor-dispute-with-unionized-organizers/2019/07/19/c60558ec-aa68-11e9-86dd-d7f0e60391e9_story.html',
      tier: 'media' as const,
      date: '2019-07-19',
    },
  ],
};

/** Known-GOOD: alleged controversy with verbatim quote, URL, and outcome. */
export const ALLEGED_KNOWN_GOOD_WITH_OUTCOME = {
  id: 'fixture-good-outcome',
  title: 'Campaign staff wage dispute (fixture)',
  summary: 'Contested claim about campaign organizer pay; see verbatim quote and outcome.',
  category: 'Campaign' as const,
  status: 'Resolved' as const,
  date: '2019-07-18',
  isVerified: false,
  verbatimQuote:
    '"Given our campaign\'s commitment to fighting for a living wage of at least $15.00 an hour, we believe it is only fair that the campaign would carry through this commitment to its own field team."',
  outcome: 'Campaign subsequently raised pay / limited hours so pay met $15/hr equivalent.',
  reportedByOutletCount: 2,
  sources: [
    {
      name: 'Washington Post',
      url: 'https://www.washingtonpost.com/politics/labor-fight-roils-bernie-sanders-campaign-as-workers-demand-the-15-hourly-pay-the-candidate-has-proposed-for-employees-nationwide/2019/07/18/3a6df9f4-a966-11e9-9214-246e594de5d5_story.html',
      tier: 'media' as const,
      date: '2019-07-18',
    },
    {
      name: 'Politico',
      url: 'https://www.politico.com/story/2019/03/15/bernie-campaign-2020-staff-union-1223914',
      tier: 'media' as const,
      date: '2019-03-15',
    },
  ],
};

/** Known-BAD: banned-section payload carrying tier alleged. */
export const ALLEGED_KNOWN_BAD_BANNED_SECTION = {
  section: 'statements' as const,
  payload: {
    byTopic: {
      healthcare: {
        statements: [
          {
            title: 'Single-outlet contested claim parked on Said',
            date: '2020-01-01',
            url: 'https://example.com/x',
            tier: 'alleged',
            topicId: 'healthcare',
            verbatim: true,
          },
        ],
      },
    },
  },
};
