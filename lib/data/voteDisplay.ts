import type { PartyVoteBreakdown, VoteRecord } from '../types';

const ACTION_PATTERNS: Array<[RegExp, string]> = [
  [/^on passage$/i, 'Final passage vote'],
  [/^on agreeing to the resolution$/i, 'Vote to agree to the resolution'],
  [/^on the motion to (?:re)?commit$/i, 'Motion to send back to committee'],
  [/^on motion to suspend the rules and pass$/i, 'Vote to suspend rules and pass'],
  [/^on the concurrent resolution$/i, 'Vote on the concurrent resolution'],
  [/^on the nomination/i, 'Confirmation vote'],
  [/^on cloture/i, 'Cloture vote (end debate)'],
  [/^on the motion$/i, 'Procedural motion vote'],
];

function stripOfficialSuffix(text: string): string {
  return text
    .replace(/\.\s*Official (House|Senate) roll-call.*$/i, '')
    .replace(/\s*\(\d+th Congress\)\.?$/i, '')
    .trim();
}

/** Human-readable vote action from question / description metadata. */
export function voteActionLabel(vote: VoteRecord): string {
  if (vote.voteAction) return vote.voteAction;

  const raw = vote.billDescription.split(' — ')[0]?.trim() ?? '';
  for (const [re, label] of ACTION_PATTERNS) {
    if (re.test(raw)) return label;
  }
  if (raw.startsWith('On the ')) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (raw.startsWith('On ')) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return 'Roll-call vote';
}

function extractSenateDocumentSummary(description: string): string | undefined {
  const m = description.match(/— (.+?)\.\s*Official Senate roll-call/i);
  if (m?.[1] && m[1].length > 20) return m[1].trim();
  return undefined;
}

function looksLikeBillNumberOnly(title: string): boolean {
  const t = title.trim();
  if (/^(H\.R\.|S\.|H\.Res\.|H\.Con\.Res\.|S\.Res\.|PN\d+)/i.test(t) && t.length < 40) return true;
  if (/^Motion to /i.test(t) && !t.includes('—')) return true;
  return false;
}

/** Primary plain-English headline for a vote row. */
export function plainVoteTitle(vote: VoteRecord): string {
  if (vote.billSummary && !looksLikeBillNumberOnly(vote.billTitle)) {
    return vote.billSummary;
  }
  if (vote.billSummary) return vote.billSummary;

  const senateSummary = extractSenateDocumentSummary(vote.billDescription);
  if (senateSummary) return senateSummary;

  if (!looksLikeBillNumberOnly(vote.billTitle)) {
    return vote.billTitle;
  }

  const stripped = stripOfficialSuffix(vote.billDescription);
  const afterDash = stripped.includes(' — ') ? stripped.split(' — ').slice(1).join(' — ') : '';
  if (afterDash.length > 30 && !afterDash.startsWith('H.R.') && !afterDash.startsWith('S.')) {
    return afterDash.replace(/\.$/, '');
  }

  if (vote.billId && vote.billId !== 'Roll Call Vote') {
    return `${vote.billId} — summary not in sync`;
  }

  return vote.billTitle;
}

/** Secondary line: what the member voted on + bill identifier. */
export function plainVoteSubtitle(vote: VoteRecord): string {
  const action = voteActionLabel(vote);
  const id = vote.billId && vote.billId !== 'Roll Call Vote' ? vote.billId : null;
  return id ? `${action} · ${id}` : action;
}

/** Bill purpose line for expanded view. */
export function plainVoteSummary(vote: VoteRecord): string {
  if (vote.billSummary) return vote.billSummary;

  const senateSummary = extractSenateDocumentSummary(vote.billDescription);
  if (senateSummary) return senateSummary;

  const stripped = stripOfficialSuffix(vote.billDescription);
  const parts = stripped.split(' — ');
  if (parts.length > 1) {
    const body = parts.slice(1).join(' — ').replace(/\.$/, '');
    if (body.length > 25) return body;
  }

  if (looksLikeBillNumberOnly(vote.billTitle)) {
    return 'Summary not in sync — see Congress.gov link for full bill text.';
  }

  return stripped || 'No bill summary available in integrated data.';
}

export function formatPartyBreakdown(breakdown: PartyVoteBreakdown): string {
  const r = breakdown.republican;
  const d = breakdown.democrat;
  return `Republicans ${r.yea} Yea / ${r.nay} Nay · Democrats ${d.yea} Yea / ${d.nay} Nay`;
}

export function hasPartyBreakdown(vote: VoteRecord): boolean {
  const b = vote.partyBreakdown;
  if (!b) return false;
  const total =
    b.republican.yea + b.republican.nay +
    b.democrat.yea + b.democrat.nay +
    (b.independent?.yea ?? 0) + (b.independent?.nay ?? 0);
  return total > 0;
}
