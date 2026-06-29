export type Chamber = 'senate' | 'house' | 'governor' | 'state_senate' | 'state_house' | 'mayor' | 'city_council' | 'school_board' | 'president' | 'vice_president' | 'cabinet' | 'scotus';
export type GovernmentBranch = 'executive' | 'legislative' | 'judicial' | 'state';
export type Party = 'Democrat' | 'Republican' | 'Independent' | 'Green' | 'Libertarian' | 'Other';
export type Level = 'federal' | 'state' | 'local';
export type VoteChoice = 'Yea' | 'Nay' | 'Not Voting' | 'Present';

// Source credibility tiers — applied identically to all sources regardless of political lean
export type SourceTier =
  | 'official'      // .gov, STOCK Act, FEC, court records — fully verified primary source
  | 'nonpartisan'   // Ballotpedia, OpenSecrets, GovTrack, Pew, AP, Reuters — established fact-checking
  | 'media'         // Named mainstream outlet — verifiable story, editorial process unknown
  | 'alleged'       // Credible but unproven claim — clearly labeled, no adjudication yet
  | 'unverified';   // Circulating claim with no verified sourcing — shown with maximum caveat

export interface Source {
  name: string;
  url?: string;
  tier: SourceTier;
  date?: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sourced, dated, tiered fact model
//
// Every real-sourced value flows through `SourcedFact`. It carries the value
// itself plus the provenance the owner requires: a tiered `source`, the date
// the underlying record became effective, and the date we last checked it.
// Low-trust facts (media/alleged/unverified) carry `corroboration` so the UI
// can enforce the multi-source rule before displaying them.
// ─────────────────────────────────────────────────────────────────────────────

// Numeric credibility ranking derived from SourceTier — higher = more credible.
// Used by the recency resolver to break ties between same-dated records.
export const SOURCE_TIER_RANK: Record<SourceTier, number> = {
  official: 4,    // Tier 1 — official .gov / primary record
  nonpartisan: 3, // Tier 2 — nonpartisan .org / research dataset
  media: 2,       // Tier 3 — journalism
  alleged: 1,     // Tier 4 — speculative / reported-but-unproven
  unverified: 0,  // Tier 4 — circulating claim, no verified sourcing
};

// Tiers that are allowed to set a politician's CURRENT, structural facts
// (e.g. which office they hold). Low-trust tiers can only annotate, never assert.
export const AUTHORITATIVE_TIERS: SourceTier[] = ['official', 'nonpartisan'];

export interface SourcedFact<T> {
  value: T;
  source: Source;
  // When the underlying record became true (e.g. term start, vote date).
  effectiveDate: string;
  // When we last fetched/checked this fact against the source.
  asOf: string;
  // Required for media/alleged/unverified facts before they may be shown.
  corroboration?: Source[];
  note?: string;
}

// A single dated, sourced record of an office a person held or holds.
// Multiple records collapse to one CURRENT office via the recency resolver.
export interface OfficeRecord {
  bioguideId?: string;
  chamber: Chamber;
  office: string;        // human label, e.g. "U.S. Senator"
  state: string;
  stateCode: string;
  district?: string;
  party: Party;
  termStart: string;     // ISO date — drives recency ordering
  termEnd: string;       // ISO date
  source: Source;
  asOf: string;
}

// Output of the recency resolver: the one office that is current-by-construction,
// plus the supporting record and an audit trail of everything considered.
export interface ResolvedOffice {
  isCurrent: boolean;
  // The office label to display now. For former members this is the historical
  // office prefixed as former (e.g. "Former U.S. Senator").
  label: string;
  current?: OfficeRecord;
  // Why the resolver decided this — surfaced in UI / debugging.
  reason:
    | 'real-current'      // found in authoritative current-members dataset
    | 'real-former'       // congressional member absent from current dataset
    | 'unresolved-demo';  // no authoritative record yet; falling back to mock
  source: Source;
  asOf: string;
}

export interface Controversy {
  id: string;
  title: string;
  summary: string;
  category: 'Ethics' | 'Legal' | 'Financial' | 'Campaign' | 'Conduct' | 'Policy' | 'Conflict of Interest';
  status: 'Resolved' | 'Ongoing' | 'Dismissed' | 'Convicted' | 'Acquitted' | 'Under Investigation' | 'Alleged';
  date: string;
  sources: Source[];
  isVerified: boolean;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  date: string;
  source: Source;
  category: string;
  isOpinion: boolean;
  isVerified: boolean;
  url?: string;
  /** Date we last checked this item against its source. Optional — shown only when present, never fabricated. */
  asOf?: string;
}

// Chronological event tied to a specific stock trade
export interface TradeTimelineEvent {
  date: string;
  type: 'vote' | 'statement' | 'committee_action' | 'hearing' | 'bill_signed' | 'market_event';
  title: string;
  description: string;
  daysRelativeToTrade: number;  // negative = before trade, positive = after trade
  priceAtEvent?: number;
  priceChangePct?: number;       // % price change in the day(s) following this event
  isFlagged: boolean;
  source: Source;
}

export interface SaidDidDiff {
  said: {
    quote: string;
    speaker: string;
    date: string;
    outlet: string;
    url: string;
    tier: 'media' | 'official';
  };
  did: {
    action: string;
    date: string;
    url: string;
    tier: 'official';
  };
  gapDays: number | null;
}

export interface Politician {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  party: Party;
  state: string;
  stateCode: string;
  district?: string;
  chamber: Chamber;
  level: Level;
  /** Branch of government — explicit on executive/judicial profiles; derived for others. */
  branch?: GovernmentBranch;
  // Bioguide ID links this profile to authoritative congressional datasets
  // (unitedstates/congress-legislators, congress.gov). When present, the
  // CURRENT office label is derived from real data, not hand-typed fields.
  bioguideId?: string;
  imageUrl?: string;
  bio: string;
  website?: string;
  twitter?: string;
  // Distinguishes richly hand-authored profiles ('featured') from lightweight,
  // real-sourced records generated from authoritative datasets ('lightweight').
  // Lightweight records carry a correct current office, term, party, state, and
  // photo, but intentionally show honest "no verified record" placeholders for
  // votes/finance/issues that have not yet been integrated. Undefined = featured.
  recordType?: 'featured' | 'lightweight';
  inOffice: boolean;
  termStart?: string;
  termEnd?: string;
  nextElection?: string;
  committees?: string[];
  votingRecord: VoteRecord[];
  campaignFinance: CampaignFinance;
  stockTrades: StockTrade[];
  consistency: ConsistencyData;
  topIssues: Issue[];
  controversies: Controversy[];
  news: NewsItem[];
  endorsements?: {
    endorses: { name: string; office: string; politicianId?: string; date?: string; source?: Source }[];
    endorsedBy: { name: string; office: string; politicianId?: string; date?: string; source?: Source }[];
  };
  /** President, VP, and cabinet — executive orders, nominations, department actions (not roll calls). */
  executiveActions?: ExecutiveAction[];
  /** Verbatim quote paired with official action — Said → Did diffs for Track Record tab. */
  saidDidDiffs?: SaidDidDiff[];
}

/** Yea/Nay counts by party from an official roll call (when sync captured member votes). */
export interface PartyVoteBreakdown {
  republican: { yea: number; nay: number; notVoting?: number };
  democrat: { yea: number; nay: number; notVoting?: number };
  independent?: { yea: number; nay: number; notVoting?: number };
}

/** Optional donor/lobby overlap note — demo-flagged or sourced from finance records. */
export interface VoteDonorConnection {
  text: string;
  isDemo: boolean;
  source?: Source;
}

export interface VoteRecord {
  id: string;
  billId: string;
  billTitle: string;
  billDescription: string;
  /** Plain-language vote action, e.g. "Final passage vote" (from sync metadata). */
  voteAction?: string;
  /** Bill purpose line from Congress.gov when available. */
  billSummary?: string;
  date: string;
  vote: VoteChoice;
  result: 'Passed' | 'Failed';
  category: string;
  alignsWithCampaign?: boolean;
  alignsWithDonors?: boolean;
  partyBreakdown?: PartyVoteBreakdown;
  donorConnection?: VoteDonorConnection;
  source: Source;
}

export interface CampaignFinance {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  cycle: string;
  donors: Donor[];
  topIndustries: IndustryDonation[];
  lobbyistMoney: LobbyistDonation[];
  foreignPAC: ForeignPACDonation[];
  individualDonations: number;
  pacDonations: number;
  selfFunding: number;
  /**
   * Optional caption for the top-donor / funding-source breakdown: which cycle it
   * covers and how its categories reconcile with the headline FEC totals (e.g. that
   * conduit-bundled money is reported as individual, not PAC). Never fabricated — demo
   * composition blocks use this to stay non-contradictory with Tier-1 FEC figures.
   */
  donorNote?: string;
  /** Reporting cycle the donor/industry composition reflects, when it predates current FEC totals. */
  donorCompositionCycle?: string;
}

/**
 * Donor `type` distinguishes who the money is *from* for FEC reporting purposes:
 * - `Individual` — a person's contribution (incl. aggregated small-dollar).
 * - `PAC` / `Super PAC` — a committee giving from its own treasury (PAC money).
 * - `Conduit` — a bundler (e.g. ActBlue, WinRed) that forwards *earmarked individual*
 *   contributions. Conduit dollars are reported as individual money, NOT PAC money,
 *   so they must never be summed into PAC totals.
 */
export interface Donor {
  id: string;
  name: string;
  type: 'Individual' | 'PAC' | 'Super PAC' | 'Corporation' | 'Union' | '501(c)(4)' | 'Conduit';
  amount: number;
  date: string;
  occupation?: string;
  employer?: string;
  isLobbyist?: boolean;
  isForeign?: boolean;
  /** Reporting cycle this figure covers (e.g. "2022") — shown when it differs from current FEC totals. */
  cycle?: string;
  /** Clarifying note, e.g. that a conduit's total is earmarked individual money reported as individual, not PAC. */
  note?: string;
}

export interface IndustryDonation {
  industry: string;
  amount: number;
  donors: number;
  percentage: number;
}

export interface LobbyistDonation {
  organization: string;
  amount: number;
  sector: string;
  issues: string[];
}

export interface ForeignPACDonation {
  organization: string;
  country: string;
  amount: number;
  date: string;
}

export interface StockTrade {
  id: string;
  ticker: string;
  companyName: string;
  type: 'Purchase' | 'Sale' | 'Partial Sale';
  amount: number;
  amountMin: number;
  amountMax: number;
  purchasePriceApprox?: number;
  currentPrice?: number;
  date: string;
  disclosureDate: string;
  daysToDisclose: number;
  relatedVotes?: string[];
  relatedCommittees?: string[];
  conflictScore: number;
  sector: string;
  source: Source;
  timelineEvents?: TradeTimelineEvent[];
}

export interface ConsistencyData {
  overallScore: number;
  campaignPromises: CampaignPromise[];
  partyLineVotePercentage: number;
  lobbyistAlignmentPercentage: number;
  termConsistency: TermConsistency[];
}

/** One side of a promise-vs-record factual diff (said or did). */
export interface PromiseRecord {
  summary: string;
  date?: string;
  source?: Source;
}

export interface CampaignPromise {
  id: string;
  issue: string;
  statement: string;
  category: string;
  status: 'Kept' | 'Broken' | 'Compromised' | 'In Progress' | 'Stalled';
  /** Public statement side of the diff — quote or paraphrase with source. */
  said?: PromiseRecord;
  /** Official action side — vote, signature, trade, or filing with source. */
  did?: PromiseRecord;
  evidence?: string;
  evidenceSource?: Source;
  relatedVotes?: string[];
}

/** Vote + trade pair shown when official records fall near each other in time. */
export interface RecordJuxtaposition {
  id: string;
  headline: string;
  tradeDate: string;
  disclosureDate: string;
  voteDate: string;
  daysBetween: number;
  connection: 'sector' | 'temporal';
  trade: StockTrade;
  vote: VoteRecord;
}

export interface TermConsistency {
  year: number;
  score: number;
  keyChanges: string[];
}

export type EvidenceType = 'vote' | 'quote' | 'statement' | 'action' | 'legislation' | 'committee_action';

export interface EvidenceItem {
  type: EvidenceType;
  description: string;
  quote?: string;
  date: string;
  source: Source;
  voteId?: string;
}

export interface Issue {
  name: string;
  position: string;
  detail: string;
  category: string;
  source?: Source;
  statement?: string;
  /** Most recent sourced actions/statements — shown first (newest-first per data policy). */
  evidence?: EvidenceItem[];
  /** Older records when dates conflict with current position summary — expandable in UI. */
  historicalEvidence?: EvidenceItem[];
}

export type ExecutiveActionType =
  | 'executive_order'
  | 'appointment'
  | 'nomination'
  | 'agenda'
  | 'international'
  | 'memorandum'
  | 'directive';

export interface ExecutiveAction {
  id: string;
  type: ExecutiveActionType;
  title: string;
  description: string;
  date: string;
  source: Source;
  url?: string;
}

export type RaceRating = 'Solid R' | 'Likely R' | 'Lean R' | 'Toss-up' | 'Lean D' | 'Likely D' | 'Solid D';

export interface PollResult {
  candidateId: string;
  percentage: number;
}

export interface Poll {
  pollster: string;
  methodology: 'Live Phone' | 'Online Panel' | 'Automated Phone' | 'Mixed';
  sourceBias: 'Nonpartisan' | 'Center' | 'Center-Left' | 'Center-Right';
  date: string;
  sampleSize: number;
  marginOfError: number;
  pollType: 'primary' | 'general';
  results: PollResult[];
}

export interface Election {
  id: string;
  title: string;
  date: string;
  state: string;
  stateCode: string;
  level: Level;
  office: string;
  chamber: Chamber;
  district?: string;
  candidates: Candidate[];
  isUpcoming: boolean;
  isPrimary: boolean;
  registrationDeadline?: string;
  earlyVotingStart?: string;
  dataNote?: string;
  raceRating?: RaceRating;
  raceRatingSource?: string;
  polls?: Poll[];
}

export interface Candidate {
  id: string;
  name: string;
  party: Party;
  imageUrl?: string;
  website?: string;
  topIssues: Issue[];
  fundsRaised: number;
  endorsements: string[];
  incumbentId?: string;
  winProbability?: number;
  primaryProbability?: number;
  approvalRating?: number;
  approvalPollster?: string;
  approvalSampleSize?: number;
  approvalDate?: string;
}

export interface USState {
  code: string;
  name: string;
  senators: string[];
  representatives: number;
  governor?: string;
  upcomingElections: number;
  activePoliticians: number;
}

export interface CountyElection {
  id: string;
  title: string;
  office: string;
  date: string;
  isUpcoming: boolean;
  turnout?: number;
  candidates: {
    name: string;
    party: Party;
    votes?: number;
    percentage?: number;
    won?: boolean;
  }[];
}

// County-level elected officials
export interface CountyOfficial {
  id: string;
  name: string;
  position: string;
  party: Party;
  inOffice: boolean;
  bio: string;
  imageUrl?: string;
  termEnd?: string;
  nextElection?: string;
  website?: string;
  email?: string;
  phone?: string;
  topIssues?: Issue[];
  statements?: { quote: string; context: string; date: string; source: Source }[];
}

export interface CountyData {
  fips: string;
  name: string;
  stateName: string;
  stateCode: string;
  seat?: string;
  population?: number;
  officials: CountyOfficial[];
  website?: string;
  zipCodes?: string[];
  elections?: CountyElection[];
  mapCenter?: [number, number];
  mapZoom?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legislation tracker (feature #7)
//
// Real-sourced congressional bills from GovTrack's keyless public API (Tier 2,
// nonpartisan) with constructed Congress.gov (Tier 1) deep links. Every Bill
// carries its own `source` + `asOf`. Fields the keyless GovTrack list feed does
// NOT provide — cosponsor counts and a passage prognosis — are OPTIONAL and are
// shown only when a real, attributed value is present. They are never fabricated.
// ─────────────────────────────────────────────────────────────────────────────

export type BillChamber = 'house' | 'senate';

/** Coarse, neutral stage groupings for filtering — derived from GovTrack status. */
export type BillStage =
  | 'introduced'
  | 'committee'
  | 'passed_one_chamber'
  | 'passed_both'
  | 'enacted'
  | 'failed'
  | 'other';

export interface BillSponsor {
  name: string;
  bioguideId?: string;
  party?: string;
  state?: string;
  district?: string;
  /** GovTrack member page for the sponsor, when available. */
  govTrackUrl?: string;
}

export interface BillAction {
  /** Human-readable latest action / status label. */
  text: string;
  /** ISO date of the latest action. */
  date: string;
  /** Longer status description from GovTrack, when present (attributed in UI). */
  detail?: string;
}

export interface Bill {
  /** Stable id: `${congress}-${billType}-${number}` e.g. "119-house_bill-815". */
  id: string;
  congress: number;
  /** Display number, e.g. "H.R.815" / "S.4847". */
  billNumber: string;
  /** GovTrack bill_type, e.g. "house_bill", "senate_joint_resolution". */
  billType: string;
  chamber: BillChamber;
  title: string;
  sponsor?: BillSponsor;
  /** Not provided by the keyless GovTrack list feed — shown only when present, never fabricated. */
  cosponsorCount?: number;
  introducedDate: string;
  latestAction: BillAction;
  /** Machine status from GovTrack (current_status). */
  status: string;
  /** Human status label from GovTrack (current_status_label). */
  statusLabel: string;
  /** Coarse neutral stage grouping for filters. */
  stage: BillStage;
  /** Whether GovTrack still considers the bill active in this Congress. */
  isAlive: boolean;
  /** Scheduled floor consideration date when GovTrack has one (a genuine "upcoming" signal). */
  scheduledConsiderationDate?: string | null;
  /** GovTrack passage prognosis 0–100 — set only when sourced (not in the keyless feed today). */
  govTrackPrognosis?: number;
  /** Source for the passage probability, attached only when a probability is shown. */
  passageProbabilitySource?: Source;
  /** Constructed Congress.gov (Tier 1, official) deep link. */
  congressGovUrl: string;
  /** GovTrack (Tier 2, nonpartisan) bill page. */
  govTrackUrl: string;
  source: Source;
  asOf: string;
}
