'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockElections } from '@/lib/data/mockElections';
import { lookupZip } from '@/lib/data/zipLookup';
import { Poll } from '@/lib/types';
import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowRight, Filter, Vote, AlertTriangle, ExternalLink, BarChart2, Star } from 'lucide-react';
import CandidateTopicAccordion from '@/components/elections/CandidateTopicAccordion';
import { buildCompareUrl } from '@/lib/data/electionCompare';
import { getPoliticianById } from '@/lib/data/allPoliticians';
import { resolveCurrentOffice } from '@/lib/data/officeResolution';
import { getFecFinance, hasFecFinance } from '@/lib/data/fecFinance';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const partyColors: Record<string, string> = {
  Democrat: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Republican: 'bg-red-500/20 text-red-400 border-red-500/30',
  Independent: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const partyBarColor: Record<string, string> = {
  Democrat: 'bg-blue-500',
  Republican: 'bg-red-500',
  Independent: 'bg-gray-400',
};

const raceRatingStyle: Record<string, string> = {
  'Solid R':   'bg-red-700/30 text-red-300 border-red-700/40',
  'Likely R':  'bg-red-500/20 text-red-400 border-red-500/30',
  'Lean R':    'bg-red-400/15 text-red-400 border-red-400/25',
  'Toss-up':   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Lean D':    'bg-blue-400/15 text-blue-400 border-blue-400/25',
  'Likely D':  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Solid D':   'bg-blue-700/30 text-blue-300 border-blue-700/40',
};

function LatestPollRow({ polls, candidateIds }: { polls: Poll[]; candidateIds: string[] }) {
  if (!polls || polls.length === 0) return null;
  const latest = [...polls].sort((a, b) => b.date.localeCompare(a.date))[0];
  const relevantResults = latest.results.filter((r) => candidateIds.includes(r.candidateId));
  if (relevantResults.length === 0) return null;

  return (
    <div className="mt-4 bg-[#0a1628] rounded-xl p-3 border border-[#1e3a5f]">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 className="h-3.5 w-3.5 text-[#c8a951]" />
        <span className="text-xs font-semibold text-[#c8a951] uppercase tracking-wide">
          Latest Poll — {latest.pollType === 'primary' ? 'Primary' : 'General Election'}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 mb-1.5">
        {relevantResults.map((r) => (
          <span key={r.candidateId} className="text-sm text-white">
            <span className="text-gray-400 text-xs">{r.candidateId.split('-').pop()?.replace(/([A-Z])/g, ' $1') || r.candidateId}: </span>
            <strong>{r.percentage}%</strong>
          </span>
        ))}
      </div>
      <div className="text-[10px] text-gray-500 flex flex-wrap gap-2">
        <span>{latest.pollster}</span>
        <span>·</span>
        <span>{new Date(latest.date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        <span>·</span>
        <span>n={latest.sampleSize.toLocaleString()}</span>
        <span>·</span>
        <span>MOE ±{latest.marginOfError}%</span>
        <span>·</span>
        <span>{latest.methodology}</span>
        <span>·</span>
        <span className="text-[#c8a951]/70">Source rated {latest.sourceBias} (AllSides)</span>
      </div>
    </div>
  );
}

function ElectionsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');
  const zipParam = searchParams.get('zip');
  const calendarView = searchParams.get('view') === 'calendar';

  const [levelFilter, setLevelFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    if (state) {
      setStateFilter(state);
    } else if (zip) {
      const loc = lookupZip(zip);
      if (loc?.code) setStateFilter(loc.code);
    }
    if (highlightId) setUpcomingOnly(false);
  }, [searchParams, highlightId]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightId, stateFilter, levelFilter, upcomingOnly]);

  const zipLocation = zipParam ? lookupZip(zipParam) : null;

  const filtered = mockElections.filter((e) => {
    if (upcomingOnly && !e.isUpcoming) return false;
    if (levelFilter && e.level !== levelFilter) return false;
    if (stateFilter && e.stateCode !== stateFilter) return false;
    return true;
  });

  const calendarSorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const displayElections = calendarView ? calendarSorted : filtered;

  const states = [...new Set(mockElections.map((e) => e.stateCode))].sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Elections</h1>
        <p className="text-gray-400">Research every candidate — platform, money, and polling data in one place</p>
        {calendarView && (
          <p className="text-[#c8a951] text-sm mt-2 flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Calendar view — sorted chronologically
          </p>
        )}
      </div>

      {(zipParam || stateFilter) && (
        <div className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4 mb-6 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-[#c8a951] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-white font-medium text-sm">
              {zipLocation
                ? `Showing elections for ${zipLocation.city} (${zipParam})`
                : stateFilter
                  ? `Filtered to ${stateFilter} elections`
                  : `ZIP ${zipParam}`}
            </div>
            <p className="text-gray-500 text-xs mt-1">
              {zipLocation && 'Location saved to My Ledger when searched from the homepage.'}
              {' '}
              <Link href="/dashboard" className="text-[#c8a951] hover:text-white">Open My Ledger →</Link>
            </p>
          </div>
        </div>
      )}

      {/* ── SAMPLE DATA DISCLAIMER ── */}
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-yellow-400 font-semibold text-sm mb-1">Illustrative Data — Verify Before Voting</div>
          <p className="text-gray-300 text-xs leading-relaxed mb-2">
            Candidate fields change frequently. Polling averages, win probabilities, and approval ratings shown here
            are <span className="text-white font-medium">illustrative estimates for demonstration only</span> — not
            official projections. Race ratings use a Cook Political Report–style scale. <span className="text-white font-medium">Do not use this data to make actual voting decisions.</span>
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-gray-400">Verify at:</span>
            <a href="https://www.ballotpedia.org" target="_blank" rel="noopener noreferrer"
               className="text-[#c8a951] hover:text-white flex items-center gap-0.5 transition-colors">
              Ballotpedia.org <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-gray-600">·</span>
            <a href="https://www.realclearpolitics.com" target="_blank" rel="noopener noreferrer"
               className="text-[#c8a951] hover:text-white flex items-center gap-0.5 transition-colors">
              RealClearPolitics <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-gray-600">·</span>
            <a href="https://www.vote.gov" target="_blank" rel="noopener noreferrer"
               className="text-[#c8a951] hover:text-white flex items-center gap-0.5 transition-colors">
              vote.gov <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

          <button
            onClick={() => setUpcomingOnly(!upcomingOnly)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              upcomingOnly ? 'bg-[#c8a951] text-[#0a1628] border-[#c8a951] font-semibold' : 'border-[#1e3a5f] text-gray-400 hover:text-white'
            }`}
          >
            Upcoming Only
          </button>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-[#c8a951]"
          >
            <option value="">All Levels</option>
            <option value="federal">Federal</option>
            <option value="state">State</option>
            <option value="local">Local</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-[#0a1628] border border-[#1e3a5f] rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-[#c8a951]"
          >
            <option value="">All States / National</option>
            {states.map((s) => <option key={s} value={s}>{s === 'NAT' ? 'National' : s}</option>)}
          </select>
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-4">{displayElections.length} election{displayElections.length !== 1 ? 's' : ''}</p>

      {stateFilter === 'FL' && (
        <div className="mb-4 bg-[#0a1628] rounded-xl p-3 border border-dashed border-[#1e3a5f]">
          <p className="text-xs text-gray-500 leading-relaxed">
            Additional 2026 Florida ballot races (U.S. House districts, statewide cabinet, local): not yet integrated.
            U.S. Senate seats are not on the 2026 general ballot.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {displayElections.map((election) => {
          const isHighlighted = highlightId === election.id;
          const latestPollCandidateIds = election.candidates.map((c) => c.id);
          // For presidential, show grouped by party
          const rParty = election.candidates.filter((c) => c.party === 'Republican');
          const dParty = election.candidates.filter((c) => c.party === 'Democrat');
          const isPresidential = election.office.toLowerCase().includes('president');

          return (
            <div
              key={election.id}
              ref={isHighlighted ? highlightRef : undefined}
              className={`bg-[#0d1f35] rounded-2xl border overflow-hidden transition-colors ${
                isHighlighted ? 'border-[#c8a951] ring-2 ring-[#c8a951]/30' : 'border-[#1e3a5f]'
              }`}
            >
              {/* Election Header */}
              <div className="p-5 border-b border-[#1e3a5f]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        election.level === 'federal' ? 'bg-blue-400/20 text-blue-400' :
                        election.level === 'state' ? 'bg-purple-400/20 text-purple-400' :
                        'bg-green-400/20 text-green-400'
                      }`}>
                        {election.level === 'federal' && election.stateCode === 'NAT' ? 'National' : election.level.charAt(0).toUpperCase() + election.level.slice(1)}
                      </span>
                      {election.isPrimary && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-400/20 text-orange-400">Primary Phase</span>
                      )}
                      {election.isUpcoming && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#c8a951]/20 text-[#c8a951]">Upcoming</span>
                      )}
                      {election.raceRating && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${raceRatingStyle[election.raceRating] || ''}`}>
                          {election.raceRating}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{election.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(election.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {election.stateCode === 'NAT' ? 'National' : election.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {election.candidates.length} candidate{election.candidates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {election.raceRating && election.raceRatingSource && (
                      <div className="mt-1 text-[10px] text-gray-600">
                        Race rating source: {election.raceRatingSource}
                      </div>
                    )}
                  </div>

                  {election.registrationDeadline && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-500 mb-0.5">Registration Deadline</div>
                      <div className="text-white font-medium text-sm">
                        {new Date(election.registrationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-election data note */}
              {election.dataNote && (
                <div className="px-5 py-2 bg-yellow-400/5 border-b border-yellow-400/20 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-400/80 text-xs">{election.dataNote}</span>
                </div>
              )}

              {/* Candidates */}
              <div className="p-5">
                {isPresidential && rParty.length > 0 && dParty.length > 0 ? (
                  /* Presidential: two-column by party */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Republican column */}
                    <div>
                      <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                        Republican Primary Frontrunners
                      </div>
                      <div className="space-y-2">
                        {rParty.map((c) => (
                          <CandidateCard key={c.id} candidate={c} isPrimary={election.isPrimary} />
                        ))}
                      </div>
                    </div>
                    {/* Democrat column */}
                    <div>
                      <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                        Democratic Primary Frontrunners
                      </div>
                      <div className="space-y-2">
                        {dParty.map((c) => (
                          <CandidateCard key={c.id} candidate={c} isPrimary={election.isPrimary} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard grid */
                  <>
                    <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">Candidates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {election.candidates.map((candidate) => (
                        <CandidateCard key={candidate.id} candidate={candidate} isPrimary={election.isPrimary} />
                      ))}
                    </div>
                  </>
                )}

                {/* Latest polls */}
                {election.polls && (
                  <LatestPollRow polls={election.polls} candidateIds={latestPollCandidateIds} />
                )}

                <div className="mt-4 flex gap-3">
                  <Link
                    href={buildCompareUrl(election.id)}
                    className="flex items-center gap-1.5 text-sm bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Vote className="h-4 w-4" />
                    Compare Candidates
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayElections.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-lg">No elections match your filters</p>
          <button type="button" onClick={() => { setLevelFilter(''); setStateFilter(''); setUpcomingOnly(false); }} className="mt-3 text-sm text-[#c8a951] hover:text-white">
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export default function ElectionsPage() {
  return (
    <Suspense>
      <ElectionsContent />
    </Suspense>
  );
}

// ── Candidate card sub-component ──────────────────────────────────────────────
import { Candidate } from '@/lib/types';
import { resolveCandidatePoliticianId } from '@/lib/data/electionCompare';

function CandidateNameLink({ candidate }: { candidate: Candidate }) {
  const profileId = resolveCandidatePoliticianId(candidate);
  if (profileId) {
    return (
      <Link href={`/politicians/${profileId}`} className="text-white font-semibold truncate hover:text-[#c8a951] transition-colors">
        {candidate.name}
      </Link>
    );
  }
  return (
    <span className="text-white font-semibold truncate cursor-default" title="Full profile not yet integrated">
      {candidate.name}
    </span>
  );
}

function DonorBreakdownHover({ candidate }: { candidate: Candidate }) {
  const [open, setOpen] = useState(false);
  const profileId = candidate.incumbentId ?? resolveCandidatePoliticianId(candidate);
  const fec = profileId && hasFecFinance(profileId) ? getFecFinance(profileId) : undefined;

  return (
    <div
      className="relative text-right ml-3 shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="text-[#c8a951] font-bold text-sm cursor-default">
        {candidate.fundsRaised > 0 ? formatMoney(candidate.fundsRaised) : '—'}
      </div>
      <div className="text-gray-500 text-xs">raised</div>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-3 shadow-xl text-left">
          {fec ? (
            <>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                FEC breakdown · {fec.electionYear} cycle
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-[#1e3a5f]">
                    <td className="py-1.5 text-gray-400">Receipts</td>
                    <td className="py-1.5 text-white text-right font-medium">{formatMoney(fec.receipts)}</td>
                  </tr>
                  <tr className="border-b border-[#1e3a5f]">
                    <td className="py-1.5 text-gray-400">Individual</td>
                    <td className="py-1.5 text-white text-right">{formatMoney(fec.individualContributions)}</td>
                  </tr>
                  <tr className="border-b border-[#1e3a5f]">
                    <td className="py-1.5 text-gray-400">PAC</td>
                    <td className="py-1.5 text-white text-right">{formatMoney(fec.pacContributions)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-gray-400">Self-funding</td>
                    <td className="py-1.5 text-white text-right">{formatMoney(fec.selfFunding)}</td>
                  </tr>
                </tbody>
              </table>
              <a
                href={fec.fecProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-[10px] text-[#c8a951] hover:text-white"
              >
                OpenFEC profile <ExternalLink className="h-3 w-3" />
              </a>
              {fec.electionYear !== 2026 && (
                <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                  Synced FEC record may not reflect the current race cycle.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 leading-relaxed">
              Detailed donor breakdown: not yet integrated (FEC schedule A)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CandidateCard({ candidate, isPrimary }: { candidate: Candidate; isPrimary: boolean }) {
  const prob = isPrimary ? candidate.primaryProbability : candidate.winProbability;
  const probLabel = isPrimary ? 'Primary prob.' : 'Win prob.';
  const barColor = partyBarColor[candidate.party] || 'bg-gray-400';
  const profileId = resolveCandidatePoliticianId(candidate);
  const politician = profileId ? getPoliticianById(profileId) : undefined;
  const office = politician ? resolveCurrentOffice(politician) : null;

  return (
    <div className="bg-[#0a1628] rounded-xl p-4 border border-[#1e3a5f]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <CandidateNameLink candidate={candidate} />
          <span className={`text-xs px-2 py-0.5 rounded-full border ${partyColors[candidate.party] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
            {candidate.party}
          </span>
          {office && (
            <div className="text-[11px] text-gray-500 mt-1 truncate" title={office.label}>
              Current: {office.label}
            </div>
          )}
        </div>
        <DonorBreakdownHover candidate={candidate} />
      </div>

      {prob !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">{probLabel}</span>
            <span className="text-xs font-bold text-white">{prob}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${prob}%` }} />
          </div>
        </div>
      )}

      {candidate.approvalRating !== undefined && (
        <div className="mb-3 flex items-center gap-1.5 bg-white/[0.03] rounded-lg px-2 py-1.5">
          <Star className="h-3 w-3 text-[#c8a951] shrink-0" />
          <div>
            <span className="text-xs text-white font-semibold">{candidate.approvalRating}% approval</span>
            {candidate.approvalPollster && (
              <span className="text-[10px] text-gray-500 ml-1.5">
                {candidate.approvalPollster}
                {candidate.approvalDate ? ` · ${new Date(candidate.approvalDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                {candidate.approvalSampleSize ? ` · n=${candidate.approvalSampleSize.toLocaleString()}` : ''}
              </span>
            )}
          </div>
        </div>
      )}

      <CandidateTopicAccordion
        issues={candidate.topIssues}
        profileIssues={politician?.topIssues}
        hasProfile={Boolean(profileId)}
        profileId={profileId}
        candidateName={candidate.name}
      />

      {candidate.endorsements.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {candidate.endorsements.slice(0, 3).map((e) => (
            <span key={e} className="text-xs bg-[#1e3a5f] text-gray-400 px-1.5 py-0.5 rounded">
              {e}
            </span>
          ))}
        </div>
      )}

      {profileId ? (
        <Link
          href={`/politicians/${profileId}`}
          className="flex items-center gap-1 text-xs text-[#c8a951] hover:text-white transition-colors"
        >
          View full record <ArrowRight className="h-3 w-3" />
        </Link>
      ) : (
        <span className="text-[10px] text-gray-600" title="No verified profile in The Ledger yet">
          Full profile: not yet integrated
        </span>
      )}
    </div>
  );
}
