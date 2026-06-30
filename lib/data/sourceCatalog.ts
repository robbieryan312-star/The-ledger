/**
 * Source catalog — what to pull from where, credibility tier, and profile destination.
 *
 * Agents: start with DATA_NEED_ROUTING for a task, then open the matching catalog entry.
 * Keys: see KEYS.md + keyVar on each entry. Never store secrets in this file.
 */
import type { SourceTier } from '../types';

/** Integration status for roadmap and UI transparency. */
export type CatalogStatus =
  | 'integrated' // live sync → generated JSON
  | 'pilot' // proven on one member (S000033); scale pending
  | 'candidate' // worth wiring; key or login may be required
  | 'reference' // bulk/scrape/no-key; not national-profile wired yet
  | 'deferred'; // explicitly skipped — alternative documented

export interface SourceCatalogEntry {
  id: string;
  name: string;
  url: string;
  /** Credibility code value — same strings shown in UI (never "Tier 1/2/3"). */
  sourceTier: SourceTier;
  category:
    | 'government'
    | 'finance'
    | 'legislative'
    | 'judiciary'
    | 'economic'
    | 'elections'
    | 'research'
    | 'journalism'
    | 'positions';
  status: CatalogStatus;
  keyRequired: boolean;
  keyVar?: string;
  /** What to extract from this source (concrete fields, not vague "data"). */
  lookFor: string[];
  /** Profile tab, page section, or generated file this feeds. */
  destinationView: string;
  /** Generated output path (repo-relative) when integrated/pilot. */
  outputPath?: string;
  /** npm script to refresh, if any. */
  syncCommand?: string;
  /** Lower number = check this source first for the destination. */
  agentPriority: number;
  notes: string;
  /** When status is deferred — why and what replaces it. */
  deferredReason?: string;
  replaces?: string;
}

/** Human-readable credibility labels for docs and /sources transparency. */
export const SOURCE_TIER_LABELS: Record<
  SourceTier,
  { label: string; meaning: string; canAssertOffice: boolean }
> = {
  official: {
    label: 'official',
    meaning: 'Primary government record (.gov, FEC, STOCK Act, congress.gov, GPO)',
    canAssertOffice: true,
  },
  nonpartisan: {
    label: 'nonpartisan',
    meaning: 'Established research or official-derived dataset (GovTrack, Ballotpedia, unitedstates)',
    canAssertOffice: true,
  },
  media: {
    label: 'media',
    meaning: 'Named mainstream outlet — verbatim quotes only; 2+ independent sources for verified statements',
    canAssertOffice: false,
  },
  alleged: {
    label: 'alleged',
    meaning: 'Credible but unproven — always flagged; multi-source corroboration required',
    canAssertOffice: false,
  },
  unverified: {
    label: 'unverified',
    meaning: 'No verified sourcing — maximum caveat; rarely shown',
    canAssertOffice: false,
  },
};

/**
 * Agent routing: given a data need, which source to hit first.
 * Order within each need is primary → fallbacks.
 */
export const DATA_NEED_ROUTING: Array<{
  need: string;
  destinationView: string;
  primarySourceId: string;
  fallbackSourceIds?: string[];
}> = [
  { need: 'Current office + bioguideId', destinationView: 'Profile header / roster', primarySourceId: 'congress-legislators', fallbackSourceIds: ['nga-governors'] },
  { need: 'Roll-call votes (Did)', destinationView: 'Voting Record tab', primarySourceId: 'congress-gov', fallbackSourceIds: ['senate-lis'] },
  { need: 'Campaign finance totals', destinationView: 'Money & Donors tab', primarySourceId: 'fec', fallbackSourceIds: [] },
  { need: 'Itemized donors / PAC receipts (Phase 17)', destinationView: 'Money & Donors · Follow the Money', primarySourceId: 'fec-schedule-a', fallbackSourceIds: [] },
  { need: 'Stated positions (Said) — survey/platform', destinationView: 'Track Record · Topic Record', primarySourceId: 'ballotpedia', fallbackSourceIds: ['govinfo-crec'] },
  { need: 'Verbatim floor speech (Said)', destinationView: 'Track Record · Topic Record', primarySourceId: 'govinfo-crec', fallbackSourceIds: ['ballotpedia'] },
  { need: 'Verbatim journalism quote (Said)', destinationView: 'Track Record · promise diff', primarySourceId: 'approved-media', fallbackSourceIds: ['gdelt-national'] },
  { need: 'Said→Did vote pairing', destinationView: 'Track Record tab', primarySourceId: 'topic-positions-sync', fallbackSourceIds: [] },
  { need: 'Sponsored / cosponsored bills by topic', destinationView: 'Topic Record · legislation', primarySourceId: 'congress-gov-deep', fallbackSourceIds: ['congress-gov'] },
  { need: 'STOCK Act trades', destinationView: 'Stock Trades tab', primarySourceId: 'house-ptr', fallbackSourceIds: ['senate-efd'] },
  { need: 'Member news', destinationView: 'News section', primarySourceId: 'gdelt-national', fallbackSourceIds: ['newsapi-fl'] },
  { need: 'Ideology scores', destinationView: 'Profile · Voteview panel', primarySourceId: 'voteview', fallbackSourceIds: ['govtrack'] },
  { need: 'Federal lobbying (LDA)', destinationView: 'Lobbying / finance context', primarySourceId: 'senate-lda', fallbackSourceIds: [] },
  { need: 'Foreign agents (FARA)', destinationView: 'Lobbying disclaimers', primarySourceId: 'fara', fallbackSourceIds: [] },
  { need: 'Office portrait', destinationView: 'Profile avatar', primarySourceId: 'unitedstates-images', fallbackSourceIds: [] },
];

/** Pilot member for full-profile template before 537 scale-up. */
export const PROFILE_PILOT_BIOGUIDE_ID = 'S000033';

export const SOURCE_CATALOG: SourceCatalogEntry[] = [
  // ── National profile core (integrated) ───────────────────────────────────
  {
    id: 'congress-legislators',
    name: 'unitedstates/congress-legislators',
    url: 'https://github.com/unitedstates/congress-legislators',
    sourceTier: 'nonpartisan',
    category: 'government',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['bioguideId', 'name', 'chamber', 'state', 'party', 'term dates', 'fecIds'],
    destinationView: 'Roster · office resolution · universal join key',
    outputPath: 'lib/data/generated/currentLegislators.json',
    syncCommand: 'npm run sync:legislators',
    agentPriority: 1,
    notes: 'Authoritative current Congress roster. Never hand-type inOffice.',
  },
  {
    id: 'congress-gov',
    name: 'Congress.gov API v3',
    url: 'https://api.congress.gov',
    sourceTier: 'official',
    category: 'legislative',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'CONGRESS_API_KEY',
    lookFor: ['House roll-call votes', 'bill number/title', 'member position Yea/Nay', 'sponsorship', 'committee assignment'],
    destinationView: 'Voting Record tab · Topic Record votes',
    outputPath: 'lib/data/generated/congressVotes.json · data/votes/national/congress-votes.json',
    syncCommand: 'npm run sync:votes · sync:votes-national',
    agentPriority: 1,
    notes: 'House votes require key. Primary Did side for Said→Did.',
  },
  {
    id: 'senate-lis',
    name: 'Senate.gov LIS roll-call XML',
    url: 'https://www.senate.gov/legislative/LIS/roll_call_lists',
    sourceTier: 'official',
    category: 'legislative',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['Senate roll-call number', 'vote question', 'member lis_id → bioguideId', 'Yea/Nay'],
    destinationView: 'Voting Record tab (Senate)',
    outputPath: 'lib/data/generated/congressVotes.json',
    syncCommand: 'npm run sync:votes · sync:votes-national',
    agentPriority: 1,
    notes: 'No key. Mapped via unitedstates LIS IDs.',
  },
  {
    id: 'fec',
    name: 'OpenFEC API',
    url: 'https://api.open.fec.gov',
    sourceTier: 'official',
    category: 'finance',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'FEC_API_KEY',
    lookFor: ['candidate totals', 'receipts/disbursements/cash', 'fecCandidateId', 'election cycle'],
    destinationView: 'Money & Donors tab · headline totals',
    outputPath: 'lib/data/generated/fecFinance.json · data/fec/national/congress-finance.json',
    syncCommand: 'npm run sync:fec · sync:fec-national',
    agentPriority: 1,
    notes: '527/537 national coverage. Join on bioguideId + fecIds.',
  },
  {
    id: 'fec-schedule-a',
    name: 'OpenFEC Schedule A (itemized receipts)',
    url: 'https://api.open.fec.gov/v1/schedules/schedule_a/',
    sourceTier: 'official',
    category: 'finance',
    status: 'pilot',
    keyRequired: true,
    keyVar: 'FEC_API_KEY',
    lookFor: ['contributor name', 'amount', 'date', 'employer/occupation', 'PAC committee name/id', 'org registry match for Phase 17'],
    destinationView: 'Money & Donors · Follow the Money · Phase 17 org→vote context',
    outputPath: 'data/fec/national/schedule-a.json',
    syncCommand: 'npm run sync:fec-schedule-a',
    agentPriority: 1,
    notes: 'Phase 17: aggregate by FEC committee ID + employer; pair with topic-tagged votes — not index-paired rows.',
  },
  {
    id: 'ballotpedia',
    name: 'Ballotpedia',
    url: 'https://ballotpedia.org',
    sourceTier: 'nonpartisan',
    category: 'positions',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['Political positions section', 'key votes on profile', 'platform/survey text by topic keyword', 'Candidate Connection blocks'],
    destinationView: 'Track Record (Said) · Topic Record platform positions',
    outputPath: 'lib/data/generated/topicPositions.json',
    syncCommand: 'npm run sync:topic-positions',
    agentPriority: 1,
    notes: '442/537 with platform text. Not verbatim quotes unless in quotation marks on page — label accordingly.',
  },
  {
    id: 'topic-positions-sync',
    name: 'Topic positions + Said→Did builder',
    url: 'https://github.com/unitedstates/congress-legislators',
    sourceTier: 'official',
    category: 'positions',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['platformPositions by topic', 'saidDidLinks (stated date + vote + bill)', 'topic keyword → voteTopicId match'],
    destinationView: 'Track Record tab · ProfileRecordByTopicPanel',
    outputPath: 'lib/data/generated/topicPositions.json',
    syncCommand: 'npm run sync:topic-positions -- --member S000033',
    agentPriority: 1,
    notes: 'Merges Ballotpedia + national votes. VoteSmart NPAT removed from critical path.',
  },
  {
    id: 'govinfo-crec',
    name: 'GovInfo — Congressional Record (CREC)',
    url: 'https://api.govinfo.gov',
    sourceTier: 'official',
    category: 'legislative',
    status: 'pilot',
    keyRequired: true,
    keyVar: 'GOVINFO_API_KEY',
    lookFor: ['Floor speech excerpts by member name + topic keywords', 'speech date', 'CREC citation URL', 'verbatim text only'],
    destinationView: 'Track Record (Said) · Topic Record statements[]',
    outputPath: 'lib/data/generated/topicPositions.json',
    syncCommand: 'npm run sync:topic-positions -- --member S000033',
    agentPriority: 2,
    notes: 'Wired in sync:topic-positions. Official Said tier for floor speech excerpts. Pilot proven on S000033.',
  },
  {
    id: 'congress-gov-deep',
    name: 'Congress.gov member deep ingest',
    url: 'https://api.congress.gov/v3',
    sourceTier: 'official',
    category: 'legislative',
    status: 'pilot',
    keyRequired: true,
    keyVar: 'CONGRESS_API_KEY',
    lookFor: ['sponsored bills by topic', 'cosponsored bills', 'bill title/number/date', 'Congress.gov URL'],
    destinationView: 'Topic Record · collapsed legislation',
    outputPath: 'lib/data/generated/members/{bioguideId}.json',
    syncCommand: 'npm run ingest:member -- --bioguide S000033 · ingest:member-all',
    agentPriority: 2,
    notes: 'Pilot file exists for S000033. Scale with checkpointed --all.',
  },
  {
    id: 'house-ptr',
    name: 'House STOCK Act PTR disclosures',
    url: 'https://disclosures.house.gov/public_disc/financial-pdfs',
    sourceTier: 'official',
    category: 'finance',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['PTR PDF transactions', 'ticker/asset', 'transaction type/date/amount range', 'member name → bioguideId'],
    destinationView: 'Stock Trades tab',
    outputPath: 'lib/data/generated/stockTrades.json',
    syncCommand: 'npm run sync:stock-trades',
    agentPriority: 1,
    notes: 'House PTR live. Senate eFD still 503 — honest gap in UI.',
  },
  {
    id: 'senate-efd',
    name: 'Senate eFD periodic transaction reports',
    url: 'https://efdsearch.senate.gov',
    sourceTier: 'official',
    category: 'finance',
    status: 'reference',
    keyRequired: false,
    lookFor: ['PTR transactions', 'filer', 'asset', 'date', 'amount'],
    destinationView: 'Stock Trades tab (Senate)',
    outputPath: 'lib/data/generated/stockTrades.json',
    syncCommand: 'npm run sync:stock-trades',
    agentPriority: 3,
    notes: 'Blocked HTTP 503 maintenance — do not fabricate.',
  },
  {
    id: 'gdelt-national',
    name: 'GDELT DOC API',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    sourceTier: 'media',
    category: 'journalism',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['headline', 'outlet name', 'URL', 'publication date', 'member name in context — not paraphrased quotes'],
    destinationView: 'Profile News section',
    outputPath: 'lib/data/generated/newsNational.json',
    syncCommand: 'npm run sync:news-national',
    agentPriority: 1,
    notes: 'Tier media — corroborate before using as Said. NewsAPI 426 for national; GDELT is primary.',
  },
  {
    id: 'approved-media',
    name: 'Approved journalism outlets (manual/curation)',
    url: 'https://github.com/unitedstates/congress-legislators',
    sourceTier: 'media',
    category: 'journalism',
    status: 'pilot',
    keyRequired: false,
    lookFor: ['Verbatim quote in quotation marks', 'outlet from approved list', 'article URL + date', '2+ independent sources for verified Said'],
    destinationView: 'Track Record · featured profiles · promise diff',
    outputPath: 'lib/data/generated/topicPositions.json (statements[] via sync-topic-positions)',
    agentPriority: 1,
    notes: 'See ledger-data-policy approved outlet list. Core differentiator vs Ballotpedia paraphrase.',
  },
  {
    id: 'unitedstates-images',
    name: 'unitedstates/images (Congress photos)',
    url: 'https://theunitedstates.io/images/congress',
    sourceTier: 'nonpartisan',
    category: 'government',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['Official portrait by bioguideId', '450x550 JPEG URL'],
    destinationView: 'Profile avatar',
    outputPath: 'lib/data/photos.ts',
    agentPriority: 5,
    notes: 'Public domain. Initials fallback when missing.',
  },
  {
    id: 'voteview',
    name: 'Voteview (DW-NOMINATE)',
    url: 'https://voteview.com/data',
    sourceTier: 'nonpartisan',
    category: 'legislative',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['ideology score', 'party unity', 'member bioguide crosswalk'],
    destinationView: 'Profile · VoteviewIdeologyPanel',
    outputPath: 'data/voteview/ · lib/data/slices/voteview',
    syncCommand: 'npm run ingest:voteview-fl',
    agentPriority: 4,
    notes: 'Research scores — not votes. Label as nonpartisan research.',
  },
  {
    id: 'govtrack',
    name: 'GovTrack',
    url: 'https://www.govtrack.us/api/v2',
    sourceTier: 'nonpartisan',
    category: 'legislative',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['Member metadata supplement', 'bill status summaries when Congress.gov thin'],
    destinationView: 'Florida ingest · supplementary',
    outputPath: 'data/govtrack/',
    syncCommand: 'npm run ingest:govtrack-fl',
    agentPriority: 4,
    notes: 'Do not override official roll-call positions.',
  },
  {
    id: 'senate-lda',
    name: 'Senate LDA API',
    url: 'https://lda.senate.gov/api/v1',
    sourceTier: 'official',
    category: 'finance',
    status: 'reference',
    keyRequired: false,
    lookFor: ['registrant/client', 'lobbying issues', 'amounts', 'covered officials', 'filing URL'],
    destinationView: 'Lobbying pages · org profiles · future bill crosswalk',
    outputPath: 'data/lobbying/',
    syncCommand: 'npm run ingest:lobbying-fl',
    agentPriority: 3,
    notes: 'Phase 17c: which orgs lobbied on which bill numbers.',
  },
  {
    id: 'fara',
    name: 'DOJ FARA eFile',
    url: 'https://efile.fara.gov',
    sourceTier: 'official',
    category: 'government',
    status: 'reference',
    keyRequired: false,
    lookFor: ['registrant', 'foreign principal', 'activity reports', 'short-form filings'],
    destinationView: 'Lobbying · foreign-agent labels',
    outputPath: 'data/fara/',
    agentPriority: 4,
    notes: 'Fetch often blocked — document honest gap.',
  },
  {
    id: 'nga-governors',
    name: 'National Governors Association roster',
    url: 'https://www.nga.org/governors',
    sourceTier: 'nonpartisan',
    category: 'government',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['Governor name', 'party', 'state', 'term start', 'state .gov link'],
    destinationView: 'Governor profiles · office resolution',
    outputPath: 'lib/data/governors.ts',
    agentPriority: 2,
    notes: 'Curated list — re-verify after elections.',
  },

  // ── Florida pipeline (integrated) — same credibility rules ─────────────────
  {
    id: 'legiscan',
    name: 'LegiScan',
    url: 'https://api.legiscan.com',
    sourceTier: 'nonpartisan',
    category: 'legislative',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'LEGISCAN_API_KEY',
    lookFor: ['FL bill id', 'title', 'status', 'sponsor', 'roll calls'],
    destinationView: 'Florida legislative records',
    outputPath: 'data/legiscan/florida-*.json',
    syncCommand: 'npm run ingest:legiscan-fl',
    agentPriority: 2,
    notes: 'State-level only.',
  },
  {
    id: 'openstates',
    name: 'Open States v3',
    url: 'https://v3.openstates.org',
    sourceTier: 'nonpartisan',
    category: 'legislative',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'OPENSTATES_API_KEY',
    lookFor: ['FL state legislator', 'district', 'party', 'contact'],
    destinationView: 'Florida state roster',
    outputPath: 'data/openstates/',
    syncCommand: 'npm run ingest:openstates-fl',
    agentPriority: 2,
    notes: 'State-level only.',
  },
  {
    id: 'newsapi-fl',
    name: 'NewsAPI',
    url: 'https://newsapi.org',
    sourceTier: 'media',
    category: 'journalism',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'NEWSAPI_KEY',
    lookFor: ['FL political headlines', 'outlet', 'url', 'publishedAt'],
    destinationView: 'Florida news sections',
    outputPath: 'data/news/',
    syncCommand: 'npm run ingest:news-fl',
    agentPriority: 3,
    notes: '426 on developer plan for some national use — FL ingest OK.',
  },

  // ── Deferred (documented alternatives) ───────────────────────────────────
  {
    id: 'votesmart',
    name: 'Vote Smart / NPAT',
    url: 'https://justfacts.votesmart.org',
    sourceTier: 'nonpartisan',
    category: 'positions',
    status: 'deferred',
    keyRequired: true,
    keyVar: 'VOTESMART_API_KEY',
    lookFor: ['NPAT survey answers by topic', 'candidateId'],
    destinationView: 'Was: Track Record stated position',
    agentPriority: 99,
    notes: 'Application/membership required; bot 403 on web.',
    deferredReason: 'Gated access — not worth blocking pipeline.',
    replaces: 'ballotpedia + govinfo-crec',
  },
  {
    id: 'opensecrets',
    name: 'OpenSecrets API',
    url: 'https://www.opensecrets.org/open-data',
    sourceTier: 'nonpartisan',
    category: 'finance',
    status: 'deferred',
    keyRequired: true,
    keyVar: 'OPENSECRETS_API_KEY',
    lookFor: ['industry totals', 'PAC aggregates', 'outside spending'],
    destinationView: 'Was: donor industry breakdown',
    agentPriority: 99,
    notes: 'Public API discontinued April 2025.',
    deferredReason: 'Use FEC Schedule A + org registry for Phase 17.',
    replaces: 'fec-schedule-a',
  },
  {
    id: 'google-civic',
    name: 'Google Civic Information API',
    url: 'https://developers.google.com/civic-information',
    sourceTier: 'official',
    category: 'elections',
    status: 'deferred',
    keyRequired: true,
    keyVar: 'GOOGLE_CIVIC_API_KEY',
    lookFor: ['election events', 'divisions'],
    destinationView: '/elections demo replacement',
    agentPriority: 99,
    notes: 'Representatives endpoint deprecated 2025.',
    deferredReason: 'Limited scope vs MIT Election Lab bulk.',
    replaces: 'mit-election-lab',
  },
  {
    id: 'mediastack',
    name: 'mediastack',
    url: 'https://mediastack.com',
    sourceTier: 'media',
    category: 'journalism',
    status: 'deferred',
    keyRequired: true,
    keyVar: 'MEDIASTACK_API_KEY',
    lookFor: ['headlines'],
    destinationView: 'News supplement',
    agentPriority: 99,
    notes: 'Redundant with GDELT national pipeline.',
    deferredReason: 'GDELT already integrated without key.',
    replaces: 'gdelt-national',
  },

  // ── Candidate (optional future keys) ───────────────────────────────────────
  {
    id: 'fred',
    name: 'FRED (St. Louis Fed)',
    url: 'https://fred.stlouisfed.org/docs/api/fred',
    sourceTier: 'official',
    category: 'economic',
    status: 'candidate',
    keyRequired: true,
    keyVar: 'FRED_API_KEY',
    lookFor: ['state economic time series', 'unemployment', 'GDP by state'],
    destinationView: 'State/county economic context (future)',
    agentPriority: 5,
    notes: 'Instant free key — no script wired yet.',
  },
  {
    id: 'followthemoney',
    name: 'FollowTheMoney (NIMP)',
    url: 'https://www.followthemoney.org/our-data/apis',
    sourceTier: 'nonpartisan',
    category: 'finance',
    status: 'candidate',
    keyRequired: true,
    keyVar: 'FOLLOWTHEMONEY_API_KEY',
    lookFor: ['state campaign contributions', 'donor', 'race'],
    destinationView: 'State finance (future)',
    agentPriority: 5,
    notes: 'Request-form key. Federal covered by FEC.',
  },
  {
    id: 'opencorporates',
    name: 'OpenCorporates',
    url: 'https://api.opencorporates.com',
    sourceTier: 'nonpartisan',
    category: 'finance',
    status: 'candidate',
    keyRequired: true,
    keyVar: 'OPENCORPORATES_API_KEY',
    lookFor: ['company officer', 'employer crosswalk for Schedule A donors'],
    destinationView: 'Follow the Money enrichment (future)',
    agentPriority: 6,
    notes: 'Free tier available — wire only if employer→org linking needed.',
  },
  {
    id: 'sam',
    name: 'SAM.gov entity API',
    url: 'https://api.sam.gov',
    sourceTier: 'official',
    category: 'finance',
    status: 'candidate',
    keyRequired: true,
    keyVar: 'SAM_API_KEY',
    lookFor: ['federal contractor registration', 'UEI', 'entity address'],
    destinationView: 'Florida contractors slice',
    outputPath: 'data/sam/',
    syncCommand: 'npm run ingest:sam-fl',
    agentPriority: 7,
    notes: 'login.gov identity verification required for key.',
  },

  // ── Reference bulk (no key) ────────────────────────────────────────────────
  {
    id: 'usaspending',
    name: 'USASpending.gov',
    url: 'https://api.usaspending.gov/api/v2',
    sourceTier: 'official',
    category: 'finance',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['awards by place of performance', 'recipient', 'amount', 'agency'],
    destinationView: 'Florida federal spending',
    outputPath: 'data/spending/',
    syncCommand: 'npm run ingest:usaspending-fl',
    agentPriority: 4,
    notes: 'No key.',
  },
  {
    id: 'mit-election-lab',
    name: 'MIT Election Data + Science Lab',
    url: 'https://electionlab.mit.edu/data',
    sourceTier: 'nonpartisan',
    category: 'elections',
    status: 'reference',
    keyRequired: false,
    lookFor: ['historical election returns CSV', 'state/county results'],
    destinationView: '/elections future · map context',
    agentPriority: 5,
    notes: 'Bulk download — no live API.',
  },
  {
    id: 'census',
    name: 'U.S. Census ACS',
    url: 'https://api.census.gov',
    sourceTier: 'official',
    category: 'economic',
    status: 'integrated',
    keyRequired: true,
    keyVar: 'CENSUS_API_KEY',
    lookFor: ['demographics', 'income', 'population by tract/county'],
    destinationView: 'County/map context',
    outputPath: 'data/census/',
    syncCommand: 'npm run ingest:census-fl',
    agentPriority: 3,
    notes: 'Key in .env.local.',
  },
  {
    id: 'bls',
    name: 'Bureau of Labor Statistics',
    url: 'https://api.bls.gov',
    sourceTier: 'official',
    category: 'economic',
    status: 'integrated',
    keyRequired: false,
    lookFor: ['LAUS unemployment', 'state/month series'],
    destinationView: 'Florida economic slice',
    outputPath: 'data/bls/',
    syncCommand: 'npm run ingest:bls-fl',
    agentPriority: 4,
    notes: 'Optional BLS_API_KEY for rate limits.',
  },
  {
    id: 'fl-lobbyist',
    name: 'Florida Lobbyist Registration',
    url: 'https://floridalobbyist.gov',
    sourceTier: 'official',
    category: 'finance',
    status: 'reference',
    keyRequired: false,
    lookFor: ['firm directory', 'compensation reports', 'principal registrations'],
    destinationView: 'Florida lobbying',
    outputPath: 'data/fllobbyist/',
    syncCommand: 'npm run ingest:fllobbyist-fl',
    agentPriority: 4,
    notes: 'Scrape — respect terms.',
  },
];

export function getCatalogEntry(id: string): SourceCatalogEntry | undefined {
  return SOURCE_CATALOG.find((s) => s.id === id);
}

export function getCatalogByDestination(destinationView: string): SourceCatalogEntry[] {
  const needle = destinationView.toLowerCase();
  return SOURCE_CATALOG.filter(
    (s) => s.destinationView.toLowerCase().includes(needle) || s.status === 'integrated' || s.status === 'pilot',
  ).sort((a, b) => a.agentPriority - b.agentPriority);
}

export function getCatalogByTier(tier: SourceTier): SourceCatalogEntry[] {
  return SOURCE_CATALOG.filter((s) => s.sourceTier === tier).sort((a, b) => a.agentPriority - b.agentPriority);
}

export function getRoutingForNeed(need: string): (typeof DATA_NEED_ROUTING)[number] | undefined {
  const n = need.toLowerCase();
  return DATA_NEED_ROUTING.find((r) => r.need.toLowerCase().includes(n) || n.includes(r.need.toLowerCase()));
}

/** S000033 pilot checklist — every row must be filled or honestly gap-labeled before 537 scale. */
export const PILOT_PROFILE_CHECKLIST: Array<{
  dataNeed: string;
  sourceId: string;
  destinationView: string;
  pilotStatus: 'done' | 'partial' | 'gap' | 'next';
}> = [
  { dataNeed: 'Office + bioguideId', sourceId: 'congress-legislators', destinationView: 'Profile header', pilotStatus: 'done' },
  { dataNeed: 'Roll-call votes', sourceId: 'congress-gov', destinationView: 'Voting Record', pilotStatus: 'done' },
  { dataNeed: 'FEC totals', sourceId: 'fec', destinationView: 'Money & Donors', pilotStatus: 'done' },
  { dataNeed: 'Schedule A donors', sourceId: 'fec-schedule-a', destinationView: 'Follow the Money', pilotStatus: 'done' },
  { dataNeed: 'Platform positions (Said)', sourceId: 'ballotpedia', destinationView: 'Track Record', pilotStatus: 'done' },
  { dataNeed: 'CREC floor speech (Said)', sourceId: 'govinfo-crec', destinationView: 'Track Record', pilotStatus: 'done' },
  { dataNeed: 'Said→Did links', sourceId: 'topic-positions-sync', destinationView: 'Track Record', pilotStatus: 'done' },
  { dataNeed: 'Topic legislation', sourceId: 'congress-gov-deep', destinationView: 'Topic Record', pilotStatus: 'done' },
  { dataNeed: 'STOCK trades', sourceId: 'house-ptr', destinationView: 'Stock Trades', pilotStatus: 'partial' },
  { dataNeed: 'News', sourceId: 'gdelt-national', destinationView: 'News', pilotStatus: 'partial' },
  { dataNeed: 'Org/PAC receipts by topic (Phase 17)', sourceId: 'fec-schedule-a', destinationView: 'Topic Record + votes', pilotStatus: 'done' },
];
