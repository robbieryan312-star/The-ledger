/**
 * Reference catalog of civic data sources for The Ledger.
 *
 * Single source of truth for provenance/credibility surfacing in the UI and for
 * the ingestion roadmap. NO API KEYS belong in this file — only public metadata.
 * Tiers follow the data-credibility policy: 1 official .gov, 2 nonpartisan
 * research/.org, 3 journalism (corroborate + flag), 4 speculative.
 */

export type ReferenceTier = 1 | 2 | 3 | 4;

export type ReferenceStatus =
  | 'integrated' // live snapshot in /data
  | 'candidate' // high-value but needs a key/login/manual access (see needs)
  | 'reference'; // catalogued for future pull/scrape

export interface ReferenceSource {
  id: string;
  name: string;
  url: string;
  tier: ReferenceTier;
  category: 'government' | 'finance' | 'legislative' | 'judiciary' | 'economic' | 'elections' | 'research' | 'journalism';
  status: ReferenceStatus;
  keyRequired: boolean;
  /** Env var name or GH secret needed to enable, when keyRequired. */
  keyVar?: string;
  notes: string;
}

export const REFERENCE_SOURCES: ReferenceSource[] = [
  // ── Integrated (live snapshots) ──────────────────────────────────────────
  { id: 'fec', name: 'OpenFEC', url: 'https://api.open.fec.gov', tier: 1, category: 'finance', status: 'integrated', keyRequired: true, keyVar: 'FEC_API_KEY', notes: 'Federal campaign finance (FL candidates).' },
  { id: 'congress', name: 'Congress.gov', url: 'https://api.congress.gov', tier: 1, category: 'legislative', status: 'integrated', keyRequired: true, keyVar: 'CONGRESS_API_KEY', notes: 'House/Senate roll-call votes for FL members.' },
  { id: 'census', name: 'U.S. Census Bureau ACS', url: 'https://api.census.gov', tier: 1, category: 'economic', status: 'integrated', keyRequired: true, keyVar: 'CENSUS_API_KEY', notes: 'FL demographics (ACS 5-year).' },
  { id: 'bls', name: 'Bureau of Labor Statistics', url: 'https://api.bls.gov', tier: 1, category: 'economic', status: 'integrated', keyRequired: false, notes: 'FL labor statistics (LAUS). Optional BLS_API_KEY raises limits.' },
  { id: 'usaspending', name: 'USASpending.gov', url: 'https://api.usaspending.gov', tier: 1, category: 'finance', status: 'integrated', keyRequired: false, notes: 'Federal contract awards with FL place of performance.' },
  { id: 'govtrack', name: 'GovTrack', url: 'https://www.govtrack.us/api/v2', tier: 2, category: 'legislative', status: 'integrated', keyRequired: false, notes: 'FL member records.' },
  { id: 'fedregister', name: 'Federal Register', url: 'https://www.federalregister.gov/api/v1', tier: 1, category: 'government', status: 'integrated', keyRequired: false, notes: 'Federal rules/notices mentioning FL.' },
  { id: 'govinfo', name: 'GovInfo (GPO)', url: 'https://api.govinfo.gov', tier: 1, category: 'legislative', status: 'integrated', keyRequired: true, keyVar: 'DATA_GOV_API_KEY', notes: 'FL-related congressional documents. Uses shared api.data.gov key.' },
  { id: 'courtlistener', name: 'CourtListener (Free Law Project)', url: 'https://www.courtlistener.com/api/rest/v4', tier: 2, category: 'judiciary', status: 'integrated', keyRequired: false, notes: 'Supreme Court of Florida opinions (official records).' },
  { id: 'secedgar', name: 'SEC EDGAR', url: 'https://efts.sec.gov', tier: 1, category: 'finance', status: 'integrated', keyRequired: false, notes: 'Recent 8-K filings by FL-located filers. Requires descriptive User-Agent.' },
  { id: 'legiscan', name: 'LegiScan', url: 'https://api.legiscan.com', tier: 2, category: 'legislative', status: 'integrated', keyRequired: true, keyVar: 'LEGISCAN_API_KEY', notes: 'FL state legislation.' },
  { id: 'openstates', name: 'Open States', url: 'https://v3.openstates.org', tier: 2, category: 'legislative', status: 'integrated', keyRequired: true, keyVar: 'OPENSTATES_API_KEY', notes: 'FL state legislators.' },
  { id: 'newsapi', name: 'NewsAPI', url: 'https://newsapi.org', tier: 3, category: 'journalism', status: 'integrated', keyRequired: true, keyVar: 'NEWSAPI_KEY', notes: 'FL political coverage. Tier 3 — corroborate + flag.' },
  { id: 'fldoe-finance', name: 'FL Division of Elections — Campaign Finance', url: 'https://dos.elections.myflorida.com/campaign-finance/contributions/', tier: 1, category: 'finance', status: 'integrated', keyRequired: false, notes: 'FL state campaign contributions. Public export blocks non-browser requests; refresh requires a browser session.' },

  // ── Candidate (need a key / login / manual step) ─────────────────────────
  { id: 'sam', name: 'SAM.gov', url: 'https://open.gsa.gov/api/sam', tier: 1, category: 'finance', status: 'candidate', keyRequired: true, keyVar: 'SAM_API_KEY', notes: 'Needs a login.gov identity-verified account to get a key.' },
  { id: 'fred', name: 'FRED (St. Louis Fed)', url: 'https://fred.stlouisfed.org/docs/api/fred', tier: 1, category: 'economic', status: 'candidate', keyRequired: true, keyVar: 'FRED_API_KEY', notes: 'Instant key after free account. FL economic time series.' },
  { id: 'opensecrets', name: 'OpenSecrets', url: 'https://www.opensecrets.org/api', tier: 2, category: 'finance', status: 'candidate', keyRequired: true, keyVar: 'OPENSECRETS_API_KEY', notes: 'Emailed key. Donor/industry aggregates.' },
  { id: 'followthemoney', name: 'FollowTheMoney (NIMP)', url: 'https://www.followthemoney.org/our-data/apis', tier: 2, category: 'finance', status: 'candidate', keyRequired: true, keyVar: 'FOLLOWTHEMONEY_API_KEY', notes: 'Request-form key. State-level money in politics.' },
  { id: 'google-civic', name: 'Google Civic Information', url: 'https://developers.google.com/civic-information', tier: 1, category: 'elections', status: 'candidate', keyRequired: true, keyVar: 'GOOGLE_CIVIC_API_KEY', notes: 'Google Cloud project + key. NOTE: representatives endpoint deprecated 2025; divisions/elections only.' },
  { id: 'mediastack', name: 'mediastack', url: 'https://mediastack.com', tier: 3, category: 'journalism', status: 'candidate', keyRequired: true, keyVar: 'MEDIASTACK_API_KEY', notes: 'Instant dashboard key. Supplementary news (Tier 3).' },
  { id: 'opencorporates', name: 'OpenCorporates', url: 'https://api.opencorporates.com', tier: 2, category: 'finance', status: 'candidate', keyRequired: true, keyVar: 'OPENCORPORATES_API_KEY', notes: 'Free key available. FL company/officer records.' },

  // ── Reference / scrape library (catalogued; pull or scrape, respect terms) ─
  { id: 'voteview', name: 'Voteview (UCLA)', url: 'https://voteview.com/data', tier: 2, category: 'legislative', status: 'reference', keyRequired: false, notes: 'DW-NOMINATE ideology + roll-call bulk CSV. High value for FL members.' },
  { id: 'mit-election-lab', name: 'MIT Election Data + Science Lab', url: 'https://electionlab.mit.edu/data', tier: 2, category: 'elections', status: 'reference', keyRequired: false, notes: 'Bulk CSV election returns incl. Florida.' },
  { id: 'harvard-dataverse', name: 'Harvard Dataverse', url: 'https://dataverse.harvard.edu', tier: 2, category: 'research', status: 'reference', keyRequired: false, notes: 'Open API; FL elections/politics datasets.' },
  { id: 'fivethirtyeight', name: 'FiveThirtyEight data', url: 'https://github.com/fivethirtyeight/data', tier: 3, category: 'research', status: 'reference', keyRequired: false, notes: 'CSV repo; polling/politics. Tier 3 journalism-adjacent.' },
  { id: 'gdelt', name: 'GDELT 2.0', url: 'https://api.gdeltproject.org/api/v2', tier: 3, category: 'journalism', status: 'reference', keyRequired: false, notes: 'Global news/event coverage; FL political coverage. Tier 3 — flag + corroborate.' },
  { id: 'senate-lda', name: 'Senate LDA disclosures', url: 'https://lda.senate.gov/system/public', tier: 1, category: 'finance', status: 'reference', keyRequired: false, notes: 'Federal lobbying disclosures (bulk).' },
  { id: 'house-disclosures', name: 'House Financial Disclosures', url: 'https://disclosures-clerk.house.gov/FinancialDisclosure', tier: 1, category: 'finance', status: 'reference', keyRequired: false, notes: 'Member financial disclosures (bulk ZIP/PDF).' },
  { id: 'fara', name: 'DOJ FARA eFile', url: 'https://efile.fara.gov', tier: 1, category: 'government', status: 'reference', keyRequired: false, notes: 'Foreign agent registrations. Endpoint intermittently blocks bots.' },
  { id: 'oge', name: 'U.S. Office of Government Ethics', url: 'https://www.oge.gov', tier: 1, category: 'government', status: 'reference', keyRequired: false, notes: 'Executive-branch ethics/financial disclosures.' },
  { id: 'cbo', name: 'Congressional Budget Office', url: 'https://www.cbo.gov/data', tier: 1, category: 'economic', status: 'reference', keyRequired: false, notes: 'Budget/economic projections data.' },
  { id: 'gao', name: 'U.S. GAO', url: 'https://www.gao.gov/reports-testimonies', tier: 1, category: 'government', status: 'reference', keyRequired: false, notes: 'Oversight reports (RSS/bulk).' },
  { id: 'ncsl', name: 'National Conference of State Legislatures', url: 'https://www.ncsl.org', tier: 2, category: 'legislative', status: 'reference', keyRequired: false, notes: 'State legislation databases.' },
  { id: 'votesmart', name: 'Vote Smart', url: 'https://justfacts.votesmart.org', tier: 2, category: 'government', status: 'reference', keyRequired: true, keyVar: 'VOTESMART_API_KEY', notes: 'Officials, positions, ratings. Key by request.' },
  { id: 'fl-lobbyist', name: 'Florida Lobbyist Registration', url: 'https://floridalobbyist.gov', tier: 1, category: 'finance', status: 'reference', keyRequired: false, notes: 'Legislative/executive firm directories + compensation reports. Scrapeable.' },
  { id: 'fl-ethics', name: 'Florida Commission on Ethics', url: 'https://www.ethics.state.fl.us', tier: 1, category: 'government', status: 'reference', keyRequired: false, notes: 'Financial disclosures (mostly PDF).' },
  { id: 'pacer', name: 'PACER', url: 'https://pacer.uscourts.gov', tier: 1, category: 'judiciary', status: 'candidate', keyRequired: true, notes: 'Federal court dockets — paywalled/credentialed. Needs account.' },
  { id: 'propublica-datastore', name: 'ProPublica Data Store', url: 'https://www.propublica.org/datastore/', tier: 3, category: 'research', status: 'reference', keyRequired: false, notes: 'Reference datasets. NOTE: ProPublica Congress API is retired — do not use.' },
];

export const INTEGRATED_SOURCE_COUNT = REFERENCE_SOURCES.filter((s) => s.status === 'integrated').length;
