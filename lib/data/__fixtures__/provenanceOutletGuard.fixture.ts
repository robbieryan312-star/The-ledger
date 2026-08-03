/**
 * Append-only: fabricated provenance-default labels must never be emitted.
 * Statement/media Said with no recorded outlet → omit (not invent Journalism / etc.).
 */

/** Known-BAD: media statement with URL but no outlet — must NOT emit outlet "Journalism". */
export const PROVENANCE_KNOWN_BAD_MEDIA_NO_OUTLET = {
  label: 'media Said without outlet must not invent Journalism',
  statement: {
    title: 'Example media quote about climate policy.',
    date: '2020-01-01',
    url: 'https://www.example-news.test/article/climate',
    tier: 'media' as const,
    topicId: 'climate',
    verbatim: true,
    // outlet intentionally absent
  },
};

/** Known-GOOD: CREC URL with no outlet field → resolve to GovInfo-derived label (not a free invent). */
export const PROVENANCE_KNOWN_GOOD_CREC_URL_DERIVED = {
  label: 'govinfo CREC URL derives Congressional Record (GovInfo)',
  statement: {
    title: 'Mr. SANDERS. Mr. President, example floor remark.',
    date: '2024-01-01',
    url: 'https://www.govinfo.gov/app/details/CREC-2024-01-01-pt1-PgS1',
    tier: 'official' as const,
    topicId: 'healthcare',
    verbatim: true,
  },
  expectedOutlet: 'Congressional Record (GovInfo)',
};

/** Known-GOOD: exact Senate host can derive the chamber record label. */
export const PROVENANCE_KNOWN_GOOD_SENATE_EXACT_HOST = {
  label: 'exact senate.gov URL derives U.S. Senate',
  url: 'https://www.senate.gov/legislative/votes_new.htm',
  expectedOutlet: 'U.S. Senate',
};

/** Known-BAD: senate.gov subdomains are member/party/office pages, not generic Senate records. */
export const PROVENANCE_KNOWN_BAD_SENATE_SUBDOMAIN = {
  label: 'senate.gov office subdomain must not derive generic U.S. Senate',
  url: 'https://www.republicanleader.senate.gov/newsroom/press-releases/mcconnell-on-one-year-anniversary-of-ukraine-escalation',
};

/**
 * Known-BAD: bare invented defaults that must not appear in lib/ or scripts/.
 * Uses synthetic `DefunctSurveySource` (not a live dead-source token) so the purge
 * matrix guard stays maximally strict without exemption creep.
 */
export const PROVENANCE_FORBIDDEN_DEFAULT_LABELS = [
  'Journalism',
  'Congressional Record',
  'Recorded position',
  'DefunctSurveySource',
] as const;
