/**
 * generatedPoliticians.ts — lightweight, real-sourced Politician records.
 *
 * For NATIONAL coverage, every current member of Congress in the authoritative
 * `currentLegislators.json` snapshot (and every confirmed sitting governor in
 * `governors.ts`) is turned into a clean Politician record with a correct
 * current office, term, party, state, and official photo.
 *
 * These records are intentionally LIGHTWEIGHT: votes, finance, stock trades,
 * issues, controversies, and news are left empty so the UI shows honest
 * "no verified record available in demo data" placeholders rather than
 * fabricated content. Featured (hand-authored) profiles are merged in ahead of
 * these in lib/data/allPoliticians.ts and win on bioguide/state de-duplication.
 */
import { CampaignFinance, ConsistencyData, Party, Politician } from '../types';
import legislatorsSnapshot from './generated/currentLegislators.json';
import { congressPhotoUrl } from './photos';
import { currentGovernors, GovernorRecord } from './governors';

interface RawLegislatorRecord {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  state: string;
  chamber: string;
  office: string;
  district?: string;
  party: string;
  termStart: string;
  termEnd: string;
  govtrackId?: number;
  fecIds?: string[];
  sourceUrl: string;
}

const snapshot = legislatorsSnapshot as { legislators: RawLegislatorRecord[] };

function emptyFinance(): CampaignFinance {
  return {
    totalRaised: 0,
    totalSpent: 0,
    cashOnHand: 0,
    cycle: '',
    donors: [],
    topIndustries: [],
    lobbyistMoney: [],
    foreignPAC: [],
    individualDonations: 0,
    pacDonations: 0,
    selfFunding: 0,
  };
}

function emptyConsistency(): ConsistencyData {
  return {
    overallScore: 0,
    campaignPromises: [],
    partyLineVotePercentage: 0,
    lobbyistAlignmentPercentage: 0,
    termConsistency: [],
  };
}

function yearOf(iso?: string): string | undefined {
  return iso ? iso.slice(0, 4) : undefined;
}

export function buildLightweightFromLegislator(rec: RawLegislatorRecord): Politician {
  const isSenate = rec.chamber === 'senate';
  const chamberName = isSenate ? 'U.S. Senate' : 'U.S. House of Representatives';
  const seat = isSenate
    ? `${rec.state}`
    : `${rec.state}${rec.district ? `'s ${rec.district} congressional district` : ''}`;
  const since = yearOf(rec.termStart);
  return {
    id: rec.bioguideId,
    bioguideId: rec.bioguideId,
    name: rec.name,
    firstName: rec.firstName,
    lastName: rec.lastName,
    party: (rec.party as Party) ?? 'Other',
    state: rec.state,
    stateCode: rec.stateCode,
    district: rec.district,
    chamber: isSenate ? 'senate' : 'house',
    level: 'federal',
    imageUrl: congressPhotoUrl(rec.bioguideId),
    bio: `${rec.name} is a ${rec.office} representing ${seat} in the ${chamberName}${since ? `, serving since ${since}` : ''}. This is a lightweight, real-sourced record generated from the public-domain unitedstates/congress-legislators dataset; the current office, term, party, and state are verified, while detailed votes, finance, and positions are not yet integrated for this profile.`,
    website: rec.sourceUrl || undefined,
    recordType: 'lightweight',
    inOffice: true, // legacy field; the resolver is authoritative
    termStart: rec.termStart,
    termEnd: rec.termEnd,
    committees: [],
    votingRecord: [],
    campaignFinance: emptyFinance(),
    stockTrades: [],
    consistency: emptyConsistency(),
    topIssues: [],
    controversies: [],
    news: [],
  };
}

export function buildLightweightFromGovernor(g: GovernorRecord): Politician {
  const since = yearOf(g.termStart);
  return {
    id: `gov-${g.stateCode.toLowerCase()}`,
    name: g.name,
    firstName: g.firstName,
    lastName: g.lastName,
    party: g.party,
    state: g.state,
    stateCode: g.stateCode,
    chamber: 'governor',
    level: 'state',
    bio: `${g.name} is the Governor of ${g.state}${since ? `, in office since ${since}` : ''}. This is a lightweight, real-sourced record: the current office, term, party, and state are verified against the National Governors Association roster, while detailed votes, finance, and positions are not yet integrated for this profile.`,
    website: g.website,
    recordType: 'lightweight',
    inOffice: true, // legacy field; the resolver is authoritative
    termStart: g.termStart,
    termEnd: g.termEnd,
    committees: [],
    votingRecord: [],
    campaignFinance: emptyFinance(),
    stockTrades: [],
    consistency: emptyConsistency(),
    topIssues: [],
    controversies: [],
    news: [],
  };
}

/** All 537 current members of Congress as lightweight records (pre-dedup). */
export const generatedCongressPoliticians: Politician[] =
  snapshot.legislators.map(buildLightweightFromLegislator);

/** All confirmed sitting governors as lightweight records (pre-dedup). */
export const generatedGovernorPoliticians: Politician[] =
  currentGovernors.map(buildLightweightFromGovernor);
