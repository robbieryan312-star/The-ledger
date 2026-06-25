/**
 * senateVotesClient.ts — fetch Senate roll-call votes from official senate.gov XML.
 * No API key. Tier 1 (official .gov).
 */
import type { Source, VoteChoice, VoteRecord } from '../types';
import { computePartyBreakdown } from './partyVoteBreakdown';

export const SENATE_GOV_SOURCE: Source = {
  name: 'senate.gov',
  url: 'https://www.senate.gov/legislative/votes_new.htm',
  tier: 'official',
  description: 'Official U.S. Senate roll-call vote records (LIS XML)',
};

const LEGISLATORS_URL =
  'https://unitedstates.github.io/congress-legislators/legislators-current.json';

interface RawLegislatorId {
  bioguide: string;
  lis?: string;
}

interface SenateVoteMenuItem {
  voteNumber: number;
  voteDate: string;
  issue: string;
  question: string;
  result: string;
  title: string;
}

export interface SenateMemberVote {
  lisMemberId: string;
  voteCast: VoteChoice;
  party?: string;
}

export interface SenateRollCall {
  congress: number;
  session: number;
  voteNumber: number;
  voteDate: string;
  question: string;
  title: string;
  documentText: string;
  result: string;
  documentName?: string;
  sourceUrl: string;
  members: SenateMemberVote[];
}

function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function normalizeSenateVote(raw: string): VoteChoice {
  const v = raw.trim().toLowerCase();
  if (v === 'yea' || v === 'aye' || v === 'yes') return 'Yea';
  if (v === 'nay' || v === 'no') return 'Nay';
  if (v.includes('present')) return 'Present';
  return 'Not Voting';
}

function senateVoteUrl(congress: number, session: number, voteNumber: number): string {
  const padded = String(voteNumber).padStart(5, '0');
  return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
}

function menuUrl(congress: number, session: number): string {
  return `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`;
}

function lisMapFromRaw(raw: Array<{ id: RawLegislatorId }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const leg of raw) {
    if (leg.id.lis && leg.id.bioguide) {
      map.set(leg.id.lis, leg.id.bioguide);
    }
  }
  return map;
}

async function fetchLisMapFromNetwork(retries = 3): Promise<Map<string, string>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(LEGISLATORS_URL);
      if (!res.ok) throw new Error(`legislators-current fetch failed: HTTP ${res.status}`);
      const raw = (await res.json()) as Array<{ id: RawLegislatorId }>;
      return lisMapFromRaw(raw);
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function fetchLisMapFromLocalSnapshot(): Promise<Map<string, string> | null> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const file = path.join(root, 'lib', 'data', 'generated', 'currentLegislators.json');
    const data = JSON.parse(await readFile(file, 'utf8')) as {
      legislators?: Array<{ bioguideId: string; lisId?: string }>;
    };
    const map = new Map<string, string>();
    for (const leg of data.legislators ?? []) {
      if (leg.lisId && leg.bioguideId) map.set(leg.lisId, leg.bioguideId);
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

export async function fetchLisToBioguideMap(): Promise<Map<string, string>> {
  const local = await fetchLisMapFromLocalSnapshot();
  if (local && local.size >= 90) return local;
  try {
    return await fetchLisMapFromNetwork();
  } catch (err) {
    if (local && local.size > 0) return local;
    throw err;
  }
}

export async function fetchSenateVoteMenu(congress: number, session: number): Promise<SenateVoteMenuItem[]> {
  const res = await fetch(menuUrl(congress, session));
  if (!res.ok) throw new Error(`Senate vote menu HTTP ${res.status}`);
  const xml = await res.text();
  const blocks = xml.match(/<vote>[\s\S]*?<\/vote>/gi) ?? [];
  return blocks.map((block) => ({
    voteNumber: parseInt(tag(block, 'vote_number'), 10),
    voteDate: tag(block, 'vote_date'),
    issue: tag(block, 'issue'),
    question: tag(block, 'question'),
    result: tag(block, 'result'),
    title: tag(block, 'title'),
  })).filter((v) => Number.isFinite(v.voteNumber));
}

export async function fetchSenateRollCall(
  congress: number,
  session: number,
  voteNumber: number,
): Promise<SenateRollCall> {
  const url = senateVoteUrl(congress, session, voteNumber);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Senate roll call HTTP ${res.status}`);
  const xml = await res.text();
  if (xml.includes('Roll Call Vote Unavailable')) {
    throw new Error('vote unavailable');
  }

  const memberBlocks = xml.match(/<member>[\s\S]*?<\/member>/gi) ?? [];
  const members: SenateMemberVote[] = memberBlocks.map((block) => ({
    lisMemberId: tag(block, 'lis_member_id'),
    voteCast: normalizeSenateVote(tag(block, 'vote_cast')),
    party: tag(block, 'party') || undefined,
  })).filter((m) => m.lisMemberId);

  const documentName = tag(xml, 'document_name') || undefined;
  return {
    congress,
    session,
    voteNumber,
    voteDate: tag(xml, 'vote_date'),
    question: tag(xml, 'vote_question_text') || tag(xml, 'question'),
    title: tag(xml, 'vote_title'),
    documentText: tag(xml, 'vote_document_text'),
    result: tag(xml, 'vote_result'),
    documentName,
    sourceUrl: url,
    members,
  };
}

function policyCategory(question: string, documentName?: string): string {
  const text = `${question} ${documentName ?? ''}`.toLowerCase();
  if (text.includes('cloture') || text.includes('motion')) return 'Procedural';
  if (text.includes('nomination') || text.includes('confirm')) return 'Judiciary';
  if (text.includes('defense') || text.includes('ndaa') || text.includes('military')) return 'Defense';
  if (text.includes('tax') || text.includes('budget') || text.includes('appropriat')) return 'Economy';
  if (text.includes('health') || text.includes('medicare') || text.includes('medicaid')) return 'Healthcare';
  if (text.includes('immigration') || text.includes('border')) return 'Immigration';
  if (text.includes('climate') || text.includes('energy')) return 'Environment';
  return 'Legislation';
}

function isoDateFromSenate(dateStr: string): string {
  // e.g. "June 22, 2026,  05:40 PM" or menu "22-Jun"
  const long = Date.parse(dateStr.replace(/,\s+/g, ', '));
  if (!Number.isNaN(long)) return new Date(long).toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const short = Date.parse(`${dateStr} ${year}`);
  if (!Number.isNaN(short)) return new Date(short).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function humanVoteAction(question: string): string {
  const q = question.trim();
  if (/^on passage$/i.test(q)) return 'Final passage vote';
  if (/^on agreeing to the resolution$/i.test(q)) return 'Vote to agree to the resolution';
  if (/^on the concurrent resolution/i.test(q)) return 'Vote on the concurrent resolution';
  if (/^on the nomination/i.test(q)) return 'Confirmation vote';
  if (/^on cloture/i.test(q)) return 'Cloture vote (end debate)';
  if (q.startsWith('On ')) return q.charAt(0).toUpperCase() + q.slice(1);
  return 'Roll-call vote';
}

export function senateVoteToRecord(
  politicianId: string,
  roll: SenateRollCall,
  position: VoteChoice,
): VoteRecord {
  const billId = roll.documentName ?? roll.title.slice(0, 80);
  const date = isoDateFromSenate(roll.voteDate);
  const source: Source = {
    ...SENATE_GOV_SOURCE,
    url: roll.sourceUrl,
    date,
  };
  const passed = roll.result.toLowerCase().includes('agreed') ||
    roll.result.toLowerCase().includes('confirmed') ||
    roll.result.toLowerCase().includes('passed');

  const billSummary = roll.documentText || undefined;
  const partyBreakdown = computePartyBreakdown(
    roll.members.filter((m) => m.party).map((m) => ({ party: m.party!, voteCast: m.voteCast })),
  );

  return {
    id: `${politicianId}-s${roll.congress}-${roll.session}-${roll.voteNumber}`,
    billId,
    billTitle: roll.title || roll.question,
    billDescription: roll.documentText
      ? `${roll.question} — ${roll.documentText}. Official Senate roll-call from senate.gov (${roll.congress}th Congress).`
      : `${roll.question}. Official Senate roll-call from senate.gov (${roll.congress}th Congress).`,
    voteAction: humanVoteAction(roll.question),
    billSummary,
    date,
    vote: position,
    result: passed ? 'Passed' : 'Failed',
    category: policyCategory(roll.question, roll.documentName),
    partyBreakdown,
    source,
  };
}
