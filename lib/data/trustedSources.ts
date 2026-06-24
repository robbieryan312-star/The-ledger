/**
 * trustedSources.ts — reusable catalog of vetted information conduits.
 *
 * Tier mapping (see lib/types/index.ts):
 *   official     → Tier 1 (.gov primary records)
 *   nonpartisan  → Tier 2 (research .org, official-derived datasets)
 *   media        → Tier 3 (institutional journalism — corroborate, always flag)
 *
 * Every entry carries an as-of checked date. Do not invent statistics here;
 * link to the primary report URL and quote only what the source publishes.
 */

import type { Source, SourceTier } from '@/lib/types';

export type TrustedOrgType = 'government' | 'research' | 'journalism' | 'dataset';

export interface TrustedSourceEntry extends Source {
  /** Stable slug for imports and UI keys */
  id: string;
  orgType: TrustedOrgType;
  /** Hostname or path prefix patterns this conduit covers */
  urlPatterns: string[];
  /** Date this catalog entry was last reviewed against the live source */
  asOf: string;
  notes?: string;
  /** Programmatic access root, when this conduit exposes an API. */
  apiBaseUrl?: string;
  /** True when the API requires a key/token to call. */
  requiresApiKey?: boolean;
  /** Env var (in .env.local) that holds the key, when one is required. */
  keyEnvVar?: string;
  /** What kind of data this conduit supplies — its intended ingestion use. */
  dataCoverage?: string;
  /**
   * Ingestion status, kept honest so the catalog never implies data is flowing:
   *   'live'        — a sync adapter is wired and pulling real data now
   *   'planned'     — vetted/approved conduit, adapter not built yet
   *   'unavailable' — source retired or not publicly accessible (kept for the record)
   */
  integrationStatus?: 'live' | 'planned' | 'unavailable';
}

const CATALOG_AS_OF = '2026-06-23';

// ── Tier 1 — official .gov ───────────────────────────────────────────────────

export const CONGRESS_GOV: TrustedSourceEntry = {
  id: 'congress-gov',
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['congress.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Official U.S. federal legislative records, bill text, and roll-call votes',
  dataCoverage: 'Bills, roll-call votes, sponsorship, and committee records',
  apiBaseUrl: 'https://api.congress.gov/v3/',
  requiresApiKey: true,
  keyEnvVar: 'CONGRESS_API_KEY',
  integrationStatus: 'live',
};

export const FEC: TrustedSourceEntry = {
  id: 'fec',
  name: 'Federal Election Commission',
  url: 'https://www.fec.gov/data/',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['fec.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Official federal campaign finance filings and independent expenditure records',
  dataCoverage: 'Direct federal campaign finance: receipts, disbursements, PACs, independent expenditures',
  apiBaseUrl: 'https://api.open.fec.gov/v1/',
  requiresApiKey: true,
  keyEnvVar: 'FEC_API_KEY',
  integrationStatus: 'live',
};

export const SENATE_GOV: TrustedSourceEntry = {
  id: 'senate-gov',
  name: 'U.S. Senate',
  url: 'https://www.senate.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['senate.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Official Senate roll-call votes and chamber records',
};

export const HOUSE_GOV: TrustedSourceEntry = {
  id: 'house-gov',
  name: 'U.S. House of Representatives',
  url: 'https://www.house.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['house.gov', 'clerk.house.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Official House roll-call votes and chamber records',
};

export const WHITEHOUSE_GOV: TrustedSourceEntry = {
  id: 'whitehouse-gov',
  name: 'White House',
  url: 'https://www.whitehouse.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['whitehouse.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Executive orders, memoranda, and official presidential actions',
};

export const SUPREME_COURT_GOV: TrustedSourceEntry = {
  id: 'scotus-gov',
  name: 'Supreme Court of the United States',
  url: 'https://www.supremecourt.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['supremecourt.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Published opinions and official court records',
};

export const LDA_SENATE: TrustedSourceEntry = {
  id: 'lda-senate',
  name: 'U.S. Senate LDA Database',
  url: 'https://lda.senate.gov/system/public/',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['lda.senate.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Lobbying Disclosure Act registration and quarterly activity reports',
};

// ── Tier 2 — nonpartisan research / datasets ─────────────────────────────────

export const PEW_RESEARCH: TrustedSourceEntry = {
  id: 'pew-research',
  name: 'Pew Research Center',
  url: 'https://www.pewresearch.org',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['pewresearch.org'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan public-opinion and social-research surveys with published methodology',
};

export const CBO: TrustedSourceEntry = {
  id: 'cbo',
  name: 'Congressional Budget Office',
  url: 'https://www.cbo.gov',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['cbo.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan congressional budget and policy cost estimates',
};

export const GAO: TrustedSourceEntry = {
  id: 'gao',
  name: 'U.S. Government Accountability Office',
  url: 'https://www.gao.gov',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['gao.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan audits and program evaluations for Congress',
};

export const CRS: TrustedSourceEntry = {
  id: 'crs',
  name: 'Congressional Research Service',
  url: 'https://crsreports.congress.gov',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['crsreports.congress.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Congressional Research Service reports (where publicly released)',
  notes: 'Many CRS reports are not public; cite only published report URLs.',
};

export const UNITEDSTATES_DATASET: TrustedSourceEntry = {
  id: 'unitedstates-congress-legislators',
  name: 'unitedstates/congress-legislators',
  url: 'https://github.com/unitedstates/congress-legislators',
  tier: 'nonpartisan',
  orgType: 'dataset',
  urlPatterns: ['github.com/unitedstates/congress-legislators', 'theunitedstates.io'],
  asOf: CATALOG_AS_OF,
  description: 'Public-domain congressional biographical and term metadata derived from official records',
};

export const GOVTRACK: TrustedSourceEntry = {
  id: 'govtrack',
  name: 'GovTrack.us',
  url: 'https://www.govtrack.us',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['govtrack.us'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan congressional voting record tracker',
  dataCoverage: 'Legislation: bills, status, and member voting records',
  apiBaseUrl: 'https://www.govtrack.us/api/v2/',
  requiresApiKey: false,
  integrationStatus: 'live',
};

export const OPENSECRETS: TrustedSourceEntry = {
  id: 'opensecrets',
  name: 'OpenSecrets',
  url: 'https://www.opensecrets.org',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['opensecrets.org'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan campaign finance and lobbying aggregates (API/exports — no scraping)',
  dataCoverage: 'Campaign finance, lobbying, and donor aggregates',
  apiBaseUrl: 'https://www.opensecrets.org/api/',
  requiresApiKey: true,
  keyEnvVar: 'OPENSECRETS_API_KEY',
  integrationStatus: 'planned',
};

export const NGA: TrustedSourceEntry = {
  id: 'nga',
  name: 'National Governors Association',
  url: 'https://www.nga.org',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['nga.org'],
  asOf: CATALOG_AS_OF,
  description: 'Bipartisan governors association policy resources and state executive context',
};

export const BALLOTPEDIA: TrustedSourceEntry = {
  id: 'ballotpedia',
  name: 'Ballotpedia',
  url: 'https://ballotpedia.org',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['ballotpedia.org'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan encyclopedia of American politics — elections, offices, and ballot measures',
  notes: 'Tier 2 for structural election/office facts; corroborate contested claims with primary records.',
};

export const BROOKINGS: TrustedSourceEntry = {
  id: 'brookings',
  name: 'Brookings Institution',
  url: 'https://www.brookings.edu',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['brookings.edu'],
  asOf: CATALOG_AS_OF,
  description: 'Nonpartisan public-policy research (cite specific report, not homepage alone)',
};

// ── Tier 3 — institutional journalism (corroborate, flag) ────────────────────

export const AP_NEWS: TrustedSourceEntry = {
  id: 'ap-news',
  name: 'Associated Press',
  url: 'https://apnews.com',
  tier: 'media',
  orgType: 'journalism',
  urlPatterns: ['apnews.com'],
  asOf: CATALOG_AS_OF,
  description: 'Wire service with established fact-checking standards — corroborate with primary records',
  notes: 'Tier 3: show journalism flag; pair with Tier 1/2 when asserting structural facts.',
};

export const REUTERS: TrustedSourceEntry = {
  id: 'reuters',
  name: 'Reuters',
  url: 'https://www.reuters.com',
  tier: 'media',
  orgType: 'journalism',
  urlPatterns: ['reuters.com'],
  asOf: CATALOG_AS_OF,
  description: 'International wire with editorial standards — corroborate with primary records',
  notes: 'Tier 3: show journalism flag; pair with Tier 1/2 when asserting structural facts.',
};

// ── Pew report shortcuts (dated, link to specific published surveys) ─────────

/** Pew survey on U.S. views of the Israel-Hamas war (fielded Feb. 13–25, 2024). */
export const PEW_ISRAEL_HAMAS_WAR_2024: Source = {
  name: 'Pew Research Center — Views of the Israel-Hamas war',
  url: 'https://www.pewresearch.org/2024/03/21/views-of-the-israel-hamas-war/',
  tier: 'nonpartisan',
  date: '2024-03-21',
  description: 'National survey (n=12,693 adults, Feb. 2024) on U.S. public views of the conflict and U.S. role',
};

/** Pew survey on U.S. military and humanitarian aid related to the Israel-Hamas war. */
export const PEW_US_ROLE_ISRAEL_WAR_2024: Source = {
  name: 'Pew Research Center — Views of the U.S. role in the Israel-Hamas war',
  url: 'https://www.pewresearch.org/2024/03/21/views-of-the-u-s-role-in-the-israel-hamas-war/',
  tier: 'nonpartisan',
  date: '2024-03-21',
  description: 'Survey on U.S. public support for military aid to Israel and humanitarian aid to Gaza (Feb. 2024)',
};

/** Pew survey on abortion legality two years after Dobbs (fielded April 8–14, 2024). */
export const PEW_ABORTION_DOBBS_2024: Source = {
  name: 'Pew Research Center — Broad Public Support for Legal Abortion Persists 2 Years After Dobbs',
  url: 'https://www.pewresearch.org/politics/2024/05/13/broad-public-support-for-legal-abortion-persists-2-years-after-dobbs/',
  tier: 'nonpartisan',
  date: '2024-05-13',
  description: 'Survey (n=8,709 adults, April 2024) on abortion legality attitudes by party',
};

/** Pew short read on gun attitudes (April 2024 survey). */
export const PEW_GUN_ATTITUDES_2024: Source = {
  name: 'Pew Research Center — Key facts about Americans and guns',
  url: 'https://www.pewresearch.org/short-reads/2024/07/24/key-facts-about-americans-and-guns/',
  tier: 'nonpartisan',
  date: '2024-07-24',
  description: 'Summary of April 2024 survey: 51% prioritize gun rights vs. 48% gun control; 58% favor stricter laws',
};

/** Pew analysis on housing affordability and public concern (2024). */
export const PEW_HOUSING_AFFORDABILITY_2024: Source = {
  name: 'Pew Research Center — A look at the state of affordable housing in the U.S.',
  url: 'https://www.pewresearch.org/short-reads/2024/10/25/a-look-at-the-state-of-affordable-housing-in-the-us/',
  tier: 'nonpartisan',
  date: '2024-10-25',
  description: 'Analysis citing 69% of U.S. adults very concerned about housing costs (2024 Center survey)',
};

/** Pew economic concerns survey including housing costs (Sept. 2024). */
export const PEW_ECONOMIC_HOUSING_CONCERN_2024: Source = {
  name: 'Pew Research Center — Economic ratings and concerns',
  url: 'https://www.pewresearch.org/politics/2024/09/09/economic-ratings-and-concerns/',
  tier: 'nonpartisan',
  date: '2024-09-09',
  description: 'Survey finding 69% very concerned about housing costs, up from 61% in April 2023',
};

/** Pew climate change public views fact sheet. */
export const PEW_CLIMATE_VIEWS: Source = {
  name: 'Pew Research Center — What the data says about climate change in the U.S.',
  url: 'https://www.pewresearch.org/short-reads/2023/08/09/what-the-data-says-about-climate-change-in-the-united-states/',
  tier: 'nonpartisan',
  date: '2023-08-09',
  description: 'Aggregated survey data on U.S. public views of climate change and policy',
};

// ── Owner-prioritized ingestion sources ──────────────────────────────────────
// Registered conduits from the owner's source list, each with access metadata
// and an honest integration status. Cataloging approves a source for citation;
// real data still arrives via per-source sync adapters (see scripts/sync-*.ts).

export const USASPENDING: TrustedSourceEntry = {
  id: 'usaspending',
  name: 'USASpending.gov',
  url: 'https://www.usaspending.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['usaspending.gov', 'api.usaspending.gov'],
  asOf: CATALOG_AS_OF,
  description: 'Official U.S. federal spending: contracts, grants, loans, and recipient records',
  dataCoverage: 'Federal contracts, grants, and SBA loans by recipient and awarding agency',
  apiBaseUrl: 'https://api.usaspending.gov/api/v2/',
  requiresApiKey: false,
  integrationStatus: 'planned',
  notes: 'Keyless REST API. Use exact recipient matches only — never infer family/entity links without a verified record.',
};

export const FARA_DOJ: TrustedSourceEntry = {
  id: 'fara-doj',
  name: 'DOJ FARA Registry',
  url: 'https://efile.fara.gov',
  tier: 'official',
  orgType: 'government',
  urlPatterns: ['efile.fara.gov', 'fara.gov'],
  asOf: CATALOG_AS_OF,
  description: 'U.S. Department of Justice Foreign Agents Registration Act filings and registrant list',
  dataCoverage: 'Foreign-agent registrations: registrants, foreign principals, and disclosed activities',
  apiBaseUrl: 'https://efile.fara.gov/api/v1/',
  requiresApiKey: false,
  integrationStatus: 'planned',
  notes: 'Authoritative basis for any "FARA-registered" label — only label an organization foreign-registered if it appears here.',
};

export const BALLOTREADY: TrustedSourceEntry = {
  id: 'ballotready',
  name: 'BallotReady',
  url: 'https://www.ballotready.org',
  tier: 'nonpartisan',
  orgType: 'dataset',
  urlPatterns: ['ballotready.org', 'civicengine.com'],
  asOf: CATALOG_AS_OF,
  description: 'Down-ballot candidate and race data with national local-office coverage',
  dataCoverage: 'Down-ballot / local candidate and race data',
  requiresApiKey: true,
  keyEnvVar: 'BALLOTREADY_API_KEY',
  integrationStatus: 'planned',
  notes: 'Licensed/partner API (CivicEngine) — not a free open feed; ingestion requires an access agreement.',
};

/**
 * ProPublica Congress API — RETIRED. ProPublica wound down its standalone
 * Congress API, so it is NOT wired as a live source. Voting records and bill
 * data are covered instead by Congress.gov (Tier 1) + GovTrack (Tier 2).
 * Kept here only to record the evaluation; excluded from the live catalog.
 */
export const PROPUBLICA_CONGRESS_RETIRED: TrustedSourceEntry = {
  id: 'propublica-congress',
  name: 'ProPublica Congress API',
  url: 'https://www.propublica.org/datastore/apis',
  tier: 'nonpartisan',
  orgType: 'research',
  urlPatterns: ['api.propublica.org/congress'],
  asOf: CATALOG_AS_OF,
  description: 'Historically: congressional votes, members, and bill data',
  dataCoverage: 'Voting records and bill data (now served by Congress.gov + GovTrack)',
  integrationStatus: 'unavailable',
  notes: 'Retired by ProPublica; replaced in The Ledger by Congress.gov (Tier 1) and GovTrack (Tier 2).',
};

// ── Catalog registry ─────────────────────────────────────────────────────────
// Live + planned conduits approved for citation. ProPublica (retired) is
// intentionally excluded; it remains exported above for the record.

export const TRUSTED_SOURCE_CATALOG: TrustedSourceEntry[] = [
  CONGRESS_GOV,
  FEC,
  SENATE_GOV,
  HOUSE_GOV,
  WHITEHOUSE_GOV,
  SUPREME_COURT_GOV,
  LDA_SENATE,
  USASPENDING,
  FARA_DOJ,
  PEW_RESEARCH,
  CBO,
  GAO,
  CRS,
  UNITEDSTATES_DATASET,
  GOVTRACK,
  OPENSECRETS,
  NGA,
  BALLOTPEDIA,
  BALLOTREADY,
  BROOKINGS,
  AP_NEWS,
  REUTERS,
];

/** Convenience: conduits with a sync adapter already pulling real data. */
export function getLiveSources(): TrustedSourceEntry[] {
  return TRUSTED_SOURCE_CATALOG.filter((e) => e.integrationStatus === 'live');
}

/** Convenience: vetted conduits whose ingestion adapter is not built yet. */
export function getPlannedSources(): TrustedSourceEntry[] {
  return TRUSTED_SOURCE_CATALOG.filter((e) => e.integrationStatus === 'planned');
}

export function getTrustedSource(id: string): TrustedSourceEntry | undefined {
  return TRUSTED_SOURCE_CATALOG.find((entry) => entry.id === id);
}

export function getTrustedSourcesByTier(tier: SourceTier): TrustedSourceEntry[] {
  return TRUSTED_SOURCE_CATALOG.filter((entry) => entry.tier === tier);
}

/** Strip catalog-only fields for components expecting `Source`. */
export function toSource(entry: TrustedSourceEntry | Source): Source {
  const { name, url, tier, date, description } = entry;
  return { name, url, tier, date, description };
}

/** Build a dated source from a catalog parent + specific report URL. */
export function reportSource(
  parent: TrustedSourceEntry,
  opts: { title: string; url: string; date: string; description?: string },
): Source {
  return {
    name: opts.title,
    url: opts.url,
    tier: parent.tier,
    date: opts.date,
    description: opts.description ?? parent.description,
  };
}
