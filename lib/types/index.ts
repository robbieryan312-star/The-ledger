export type Chamber = 'senate' | 'house' | 'governor' | 'state_senate' | 'state_house' | 'mayor' | 'city_council' | 'school_board' | 'president';
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
}

export interface VoteRecord {
  id: string;
  billId: string;
  billTitle: string;
  billDescription: string;
  date: string;
  vote: VoteChoice;
  result: 'Passed' | 'Failed';
  category: string;
  alignsWithCampaign?: boolean;
  alignsWithDonors?: boolean;
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
}

export interface Donor {
  id: string;
  name: string;
  type: 'Individual' | 'PAC' | 'Super PAC' | 'Corporation' | 'Union' | '501(c)(4)';
  amount: number;
  date: string;
  occupation?: string;
  employer?: string;
  isLobbyist?: boolean;
  isForeign?: boolean;
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
  evidence?: EvidenceItem[];
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
