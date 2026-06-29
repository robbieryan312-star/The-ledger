import type { FecFinanceEntry } from './fecFinance';
import type { CongressVoteEntry } from './congressVotes';
import type { ScheduleAMemberRow } from './fecScheduleA';
import type { Issue, Source } from '../types';

export interface LatestProfileRecord {
  label: string;
  date: string;
  source: Source;
  kind: 'vote' | 'finance' | 'statement';
}

interface LatestCandidate {
  label: string;
  date: string;
  source: Source;
  kind: LatestProfileRecord['kind'];
}

function parseDate(iso?: string): number {
  if (!iso) return 0;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return 0;
  return new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function voteCandidates(congressEntry?: CongressVoteEntry): LatestCandidate[] {
  if (!congressEntry?.votes.length) return [];
  return congressEntry.votes.map((v) => ({
    label: `Voted ${v.vote} on ${v.billTitle}`,
    date: v.date,
    source: v.source,
    kind: 'vote',
  }));
}

function financeCandidates(
  fecEntry?: FecFinanceEntry,
  scheduleA?: ScheduleAMemberRow,
): LatestCandidate[] {
  const out: LatestCandidate[] = [];

  if (fecEntry?.coverageEnd) {
    out.push({
      label: `FEC filing coverage through ${fecEntry.coverageEnd} (${formatMoney(fecEntry.receipts)} receipts)`,
      date: fecEntry.coverageEnd,
      source: fecEntry.source,
      kind: 'finance',
    });
  }

  if (scheduleA) {
    for (const c of scheduleA.contributors) {
      out.push({
        label: `Itemized contribution from ${c.name} (${formatMoney(c.amount)})`,
        date: c.date,
        source: scheduleA.source,
        kind: 'finance',
      });
    }
  }

  return out;
}

function statementCandidates(issues: Issue[]): LatestCandidate[] {
  const out: LatestCandidate[] = [];

  for (const issue of issues) {
    for (const ev of issue.evidence ?? []) {
      if (ev.type !== 'statement' && ev.type !== 'quote') continue;
      out.push({
        label: ev.quote ?? ev.description,
        date: ev.date,
        source: ev.source,
        kind: 'statement',
      });
    }
    for (const ev of issue.historicalEvidence ?? []) {
      if (ev.type !== 'statement' && ev.type !== 'quote') continue;
      out.push({
        label: ev.quote ?? ev.description,
        date: ev.date,
        source: ev.source,
        kind: 'statement',
      });
    }
  }

  return out;
}

/** Pick the single newest integrated vote, finance, or statement record for a profile banner. */
export function findLatestProfileRecord({
  congressEntry,
  fecEntry,
  scheduleA,
  issues,
}: {
  congressEntry?: CongressVoteEntry;
  fecEntry?: FecFinanceEntry;
  scheduleA?: ScheduleAMemberRow;
  issues: Issue[];
}): LatestProfileRecord | undefined {
  const candidates = [
    ...voteCandidates(congressEntry),
    ...financeCandidates(fecEntry, scheduleA),
    ...statementCandidates(issues),
  ];

  if (candidates.length === 0) return undefined;

  let best = candidates[0];
  let bestTs = parseDate(best.date);

  for (let i = 1; i < candidates.length; i += 1) {
    const ts = parseDate(candidates[i].date);
    if (ts > bestTs) {
      best = candidates[i];
      bestTs = ts;
    }
  }

  if (bestTs === 0) return undefined;

  return {
    label: best.label,
    date: best.date,
    source: best.source,
    kind: best.kind,
  };
}
