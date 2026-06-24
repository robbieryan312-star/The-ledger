'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockPoliticians } from '@/lib/data/mockPoliticians';
import { mockElections } from '@/lib/data/mockElections';
import { getPoliticianById } from '@/lib/data/allPoliticians';
import {
  pickComparePair,
  isCandidatePick,
  findElectionCandidate,
} from '@/lib/data/electionCompare';
import { mergeCampaignFinance, getFecFinanceSnapshot } from '@/lib/data/fecFinance';
import SourceBadge from '@/components/ui/SourceBadge';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { Candidate, Election, Issue, Politician } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle, MinusCircle, Info } from 'lucide-react';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function CompareCell({ label, aVal, bVal, higherIsBetter = true, format = 'number' }: {
  label: string;
  aVal: number; bVal: number; higherIsBetter?: boolean; format?: 'money' | 'percent' | 'number';
}) {
  const aBetter = higherIsBetter ? aVal >= bVal : aVal <= bVal;
  const fmt = (v: number) => format === 'money' ? formatMoney(v) : format === 'percent' ? `${v}%` : v.toString();

  return (
    <div className="grid grid-cols-3 gap-3 items-center py-3 border-b border-white/[0.05] last:border-0">
      <div className={`text-sm font-bold text-right ${aBetter ? 'text-white' : 'text-white/35'}`}>
        {fmt(aVal)}
        {aBetter && aVal !== bVal && <span className="ml-1 text-green-400">✓</span>}
      </div>
      <div className="text-xs text-white/35 text-center">{label}</div>
      <div className={`text-sm font-bold text-left ${!aBetter ? 'text-white' : 'text-white/35'}`}>
        {!aBetter && aVal !== bVal && <span className="mr-1 text-green-400">✓</span>}
        {fmt(bVal)}
      </div>
    </div>
  );
}

type CompareSide = {
  pick: string;
  politician?: Politician;
  candidate?: Candidate;
  displayName: string;
  lastName: string;
  issues: Issue[];
  isElectionOnly: boolean;
};

function resolveSide(pick: string, election?: Election): CompareSide | null {
  if (isCandidatePick(pick)) {
    const candidate = findElectionCandidate(election, pick);
    if (!candidate) return null;
    const parts = candidate.name.split(' ');
    return {
      pick,
      candidate,
      displayName: candidate.name,
      lastName: parts[parts.length - 1] ?? candidate.name,
      issues: candidate.topIssues,
      isElectionOnly: true,
    };
  }
  const politician = getPoliticianById(pick) ?? mockPoliticians.find((p) => p.id === pick);
  if (!politician) return null;
  return {
    pick,
    politician,
    displayName: politician.name,
    lastName: politician.lastName,
    issues: politician.topIssues,
    isElectionOnly: false,
  };
}

function isValidPick(pick: string, election?: Election): boolean {
  if (isCandidatePick(pick)) return !!findElectionCandidate(election, pick);
  return !!(getPoliticianById(pick) ?? mockPoliticians.find((p) => p.id === pick));
}

const cardStyle = { background: 'rgba(11,25,41,0.7)', backdropFilter: 'blur(12px)' };
const headerStyle = { background: 'rgba(5,9,15,0.5)' };

function CompareContent() {
  const searchParams = useSearchParams();
  const defaultA = mockPoliticians[0]?.id || '';
  const defaultB = mockPoliticians[1]?.id || '';

  const [aPick, setAPick] = useState<string>(defaultA);
  const [bPick, setBPick] = useState<string>(defaultB);
  const [electionContext, setElectionContext] = useState<string | null>(null);
  const [activeElection, setActiveElection] = useState<Election | undefined>();

  useEffect(() => {
    const paramA = searchParams.get('a');
    const paramB = searchParams.get('b');
    const electionId = searchParams.get('election');

    if (electionId) {
      const election = mockElections.find((e) => e.id === electionId);
      if (election) {
        setElectionContext(election.title);
        setActiveElection(election);

        const pair = pickComparePair(election);
        const nextA = paramA && isValidPick(paramA, election) ? paramA : pair?.a;
        const nextB = paramB && isValidPick(paramB, election) ? paramB : pair?.b;

        if (nextA) setAPick(nextA);
        if (nextB) setBPick(nextB);
        return;
      }
    }

    setElectionContext(null);
    setActiveElection(undefined);

    if (paramA && isValidPick(paramA)) setAPick(paramA);
    if (paramB && isValidPick(paramB)) setBPick(paramB);
  }, [searchParams]);

  const sideA = useMemo(() => resolveSide(aPick, activeElection), [aPick, activeElection]);
  const sideB = useMemo(() => resolveSide(bPick, activeElection), [bPick, activeElection]);

  const financeA = sideA?.politician
    ? mergeCampaignFinance(sideA.politician.id, sideA.politician.campaignFinance)
    : null;
  const financeB = sideB?.politician
    ? mergeCampaignFinance(sideB.politician.id, sideB.politician.campaignFinance)
    : null;
  const fecMeta = getFecFinanceSnapshot().meta;

  const allIssueCategories = sideA && sideB
    ? [...new Set([...sideA.issues.map((i) => i.category), ...sideB.issues.map((i) => i.category)])]
    : [];
  const sharedCategories = allIssueCategories.filter((cat) =>
    sideA?.issues.some((i) => i.category === cat) && sideB?.issues.some((i) => i.category === cat),
  );
  const uniqueCategories = allIssueCategories.filter((cat) =>
    !(sideA?.issues.some((i) => i.category === cat) && sideB?.issues.some((i) => i.category === cat)),
  );

  const raisedA = sideA?.politician
    ? (financeA?.finance.totalRaised ?? sideA.politician.campaignFinance.totalRaised)
    : (sideA?.candidate?.fundsRaised ?? 0);
  const raisedB = sideB?.politician
    ? (financeB?.finance.totalRaised ?? sideB.politician.campaignFinance.totalRaised)
    : (sideB?.candidate?.fundsRaised ?? 0);

  const selectStyle: React.CSSProperties = {
    background: 'rgba(5,9,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
  };

  const canCompare = sideA && sideB && aPick !== bPick;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Compare Politicians</h1>
        <p className="text-white/40">The two-party system has turned politics into a tribal identity. While voters dig deeper into opposing camps, the politicians at the top often have more in common than either side realizes. Find the candidate who actually shares your values — not just your team.</p>
        {electionContext && (
          <p className="text-[#c8a951] text-sm mt-2">
            Comparing candidates from: {electionContext}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {(['a', 'b'] as const).map((side) => {
          const pick = side === 'a' ? aPick : bPick;
          const other = side === 'a' ? bPick : aPick;
          const setPick = side === 'a' ? setAPick : setBPick;
          const resolved = side === 'a' ? sideA : sideB;
          const selectValue = isCandidatePick(pick) ? '' : pick;

          return (
            <div key={side}>
              <label className="text-white/35 text-xs font-medium uppercase tracking-wider mb-2 block">
                Candidate {side.toUpperCase()}
              </label>
              {isCandidatePick(pick) && resolved ? (
                <div className="w-full rounded-xl px-4 py-3 text-sm border border-white/[0.08] text-white/80" style={selectStyle}>
                  {resolved.displayName}
                  <span className="block text-[10px] text-gray-500 mt-0.5">Election profile — full record not yet integrated</span>
                </div>
              ) : (
                <select
                  value={selectValue}
                  onChange={(e) => setPick(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={selectStyle}
                >
                  {mockPoliticians.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === other}>
                      {p.name} ({p.state}){p.id === other ? ' — already selected' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      {aPick === bPick && (
        <div className="rounded-xl p-4 mb-6 border border-yellow-400/25 text-yellow-400 text-sm" style={{ background: 'rgba(212,172,82,0.08)' }}>
          Select two different candidates to compare them side-by-side.
        </div>
      )}

      {canCompare && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.08] p-4 flex items-start gap-3" style={cardStyle}>
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/50 leading-relaxed">
              <strong className="text-white/80">Data tiers:</strong> Total raised uses{' '}
              <span className="text-green-400/90">Tier 1 OpenFEC</span> when a synced profile exists (as of {fecMeta.asOf}).
              Election-only candidates use illustrative race totals until a profile is integrated.
              Consistency scores, votes, lobbyist money, stock trades, and promise tracker rows are{' '}
              <span className="text-yellow-400/90">demo data</span> for featured profiles only.
              {(financeA?.fecEntry || financeB?.fecEntry) && (
                <span className="inline-flex items-center gap-1.5 ml-2">
                  <SourceBadge source={fecMeta.source} size="xs" />
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[sideA, sideB].map((side) => (
              <div key={side.pick} className="rounded-2xl p-5 border border-white/[0.08]" style={cardStyle}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.09]"
                       style={{ background: 'linear-gradient(135deg, #0f2236 0%, #07101f 100%)' }}>
                    <PoliticianAvatar
                      name={side.displayName}
                      firstName={side.politician?.firstName}
                      lastName={side.politician?.lastName}
                      imageUrl={side.politician?.imageUrl}
                      textClassName="font-bold text-xl text-[#d4ac52]"
                    />
                  </div>
                  <div>
                    <div className="text-white font-bold">{side.displayName}</div>
                    <div className="text-white/40 text-xs">
                      {(side.politician?.party ?? side.candidate?.party) ?? '—'}
                      {side.politician ? ` · ${side.politician.state}` : ''}
                    </div>
                    <div className="text-white/30 text-xs">
                      {side.isElectionOnly
                        ? 'Election candidate — profile not yet integrated'
                        : side.politician?.chamber.replaceAll('_', ' ')}
                    </div>
                  </div>
                </div>
                <p className="text-white/40 text-xs leading-relaxed line-clamp-3">
                  {side.politician?.bio ?? 'No verified full profile available. Platform positions below are sourced from the election record.'}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b border-white/[0.06]" style={headerStyle}>
              <h2 className="text-white font-bold">Platform & Where They Stand</h2>
              <p className="text-white/35 text-xs mt-1">
                Compare each candidate&apos;s stated positions to find where your priorities align
              </p>
              <div className="flex items-center gap-3 mt-2.5 text-xs text-white/30">
                <span>{sharedCategories.length} shared policy areas</span>
                {uniqueCategories.length > 0 && <><span>·</span><span>{uniqueCategories.length} stated by only one</span></>}
              </div>
            </div>

            {sharedCategories.length > 0 && (
              <div>
                <div className="px-5 py-2 border-b border-white/[0.04] bg-white/[0.015]">
                  <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Both candidates have stated positions</span>
                </div>
                {sharedCategories.map((cat) => {
                  const aIssue = sideA.issues.find((i) => i.category === cat)!;
                  const bIssue = sideB.issues.find((i) => i.category === cat)!;
                  return (
                    <div key={cat} className="grid grid-cols-[1fr_90px_1fr] gap-3 px-5 py-4 border-b border-white/[0.04] last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-white mb-1">{aIssue.position}</div>
                        <div className="text-white/40 text-xs leading-relaxed">{aIssue.detail}</div>
                      </div>
                      <div className="flex items-start justify-center pt-0.5">
                        <span className="text-[10px] text-white/35 text-center px-2 py-1 rounded-full border border-white/[0.07] leading-tight">{cat}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white mb-1">{bIssue.position}</div>
                        <div className="text-white/40 text-xs leading-relaxed">{bIssue.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {uniqueCategories.length > 0 && (
              <div>
                <div className="px-5 py-2 border-b border-white/[0.04] bg-white/[0.015]">
                  <span className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Positions stated by one candidate only</span>
                </div>
                {uniqueCategories.map((cat) => {
                  const aIssue = sideA.issues.find((i) => i.category === cat);
                  const bIssue = sideB.issues.find((i) => i.category === cat);
                  return (
                    <div key={cat} className="grid grid-cols-[1fr_90px_1fr] gap-3 px-5 py-4 border-b border-white/[0.04] last:border-0">
                      <div>
                        {aIssue ? (
                          <>
                            <div className="text-sm font-semibold text-white mb-1">{aIssue.position}</div>
                            <div className="text-white/40 text-xs leading-relaxed">{aIssue.detail}</div>
                          </>
                        ) : (
                          <div className="text-white/20 text-xs italic mt-1">No stated position</div>
                        )}
                      </div>
                      <div className="flex items-start justify-center pt-0.5">
                        <span className="text-[10px] text-white/35 text-center px-2 py-1 rounded-full border border-white/[0.07] leading-tight">{cat}</span>
                      </div>
                      <div className="text-right">
                        {bIssue ? (
                          <>
                            <div className="text-sm font-semibold text-white mb-1">{bIssue.position}</div>
                            <div className="text-white/40 text-xs leading-relaxed">{bIssue.detail}</div>
                          </>
                        ) : (
                          <div className="text-white/20 text-xs italic mt-1 text-left">No stated position</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {allIssueCategories.length === 0 && (
              <div className="px-5 py-6 text-center text-white/30 text-sm">
                No verified platform positions available for this comparison.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b border-white/[0.06]" style={headerStyle}>
              <h2 className="text-white font-bold">Key Metrics</h2>
              <p className="text-white/30 text-xs mt-1">Total raised from OpenFEC when synced; election totals otherwise illustrative</p>
              <div className="grid grid-cols-3 mt-2">
                <div className="text-xs font-medium text-right" style={{ color: '#d4ac52' }}>{sideA.lastName}</div>
                <div className="text-white/25 text-xs text-center">Metric</div>
                <div className="text-xs font-medium text-left" style={{ color: '#d4ac52' }}>{sideB.lastName}</div>
              </div>
            </div>
            <div className="px-5">
              {sideA.politician && sideB.politician ? (
                <>
                  <CompareCell label="Consistency Score (demo)" aVal={sideA.politician.consistency.overallScore} bVal={sideB.politician.consistency.overallScore} />
                  <CompareCell label="Bipartisan Vote % (demo)" aVal={100 - sideA.politician.consistency.partyLineVotePercentage} bVal={100 - sideB.politician.consistency.partyLineVotePercentage} higherIsBetter={true} format="percent" />
                </>
              ) : null}
              <CompareCell
                label={`Total Raised${financeA?.fecEntry || financeB?.fecEntry ? ' (FEC)' : sideA.isElectionOnly || sideB.isElectionOnly ? ' (race est.)' : ''}`}
                aVal={raisedA}
                bVal={raisedB}
                higherIsBetter={false}
                format="money"
              />
              {sideA.politician && sideB.politician ? (
                <>
                  <CompareCell
                    label="Individual Donors %"
                    aVal={(financeA?.finance.totalRaised ?? 0) > 0 ? Math.round(((financeA?.finance.individualDonations ?? 0) / (financeA?.finance.totalRaised ?? 1)) * 100) : 0}
                    bVal={(financeB?.finance.totalRaised ?? 0) > 0 ? Math.round(((financeB?.finance.individualDonations ?? 0) / (financeB?.finance.totalRaised ?? 1)) * 100) : 0}
                    higherIsBetter={true}
                    format="percent"
                  />
                  <CompareCell label="Lobbyist Money (demo)" aVal={sideA.politician.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0)} bVal={sideB.politician.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0)} higherIsBetter={false} format="money" />
                  <CompareCell label="Lobbyist Alignment % (demo)" aVal={sideA.politician.consistency.lobbyistAlignmentPercentage} bVal={sideB.politician.consistency.lobbyistAlignmentPercentage} higherIsBetter={false} format="percent" />
                  <CompareCell label="Stock Trades (demo)" aVal={sideA.politician.stockTrades.length} bVal={sideB.politician.stockTrades.length} higherIsBetter={false} />
                  <CompareCell label="High Review-Priority Trades (demo)" aVal={sideA.politician.stockTrades.filter((t) => t.conflictScore >= 70).length} bVal={sideB.politician.stockTrades.filter((t) => t.conflictScore >= 70).length} higherIsBetter={false} />
                </>
              ) : (
                <p className="py-4 text-xs text-white/35 text-center">
                  Additional finance and voting metrics require integrated politician profiles on both sides.
                </p>
              )}
            </div>
          </div>

          {sideA.politician && sideB.politician ? (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden" style={cardStyle}>
              <div className="px-5 py-4 border-b border-white/[0.06]" style={headerStyle}>
                <h2 className="text-white font-bold">Campaign Promise Tracker</h2>
                <p className="text-white/30 text-xs mt-1">Demo editorial tracking for featured profiles — not sourced from official records</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/[0.05]">
                {[sideA.politician, sideB.politician].map((p) => (
                  <div key={p.id} className="p-5">
                    <div className="font-semibold mb-3 text-sm" style={{ color: '#d4ac52' }}>{p.firstName} {p.lastName}</div>
                    <div className="space-y-2">
                      {p.consistency.campaignPromises.length > 0 ? p.consistency.campaignPromises.map((promise) => (
                        <div key={promise.id} className="flex items-start gap-2">
                          {promise.status === 'Kept'        ? <CheckCircle   className="h-4 w-4 text-green-400  flex-shrink-0 mt-0.5" /> :
                           promise.status === 'Broken'      ? <XCircle       className="h-4 w-4 text-red-400    flex-shrink-0 mt-0.5" /> :
                           promise.status === 'Compromised' ? <AlertTriangle  className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" /> :
                                                              <MinusCircle   className="h-4 w-4 text-blue-400   flex-shrink-0 mt-0.5" />}
                          <div>
                            <div className="text-xs text-white font-medium">{promise.issue}</div>
                            <div className={`text-xs ${promise.status === 'Kept' ? 'text-green-400' : promise.status === 'Broken' ? 'text-red-400' : promise.status === 'Compromised' ? 'text-yellow-400' : 'text-blue-400'}`}>
                              {promise.status}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-white/30">No verified promise tracker data.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
