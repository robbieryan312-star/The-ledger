'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { allPoliticians, resolveOffice } from '@/lib/data/allPoliticians';
import { fecFinanceCount } from '@/lib/data/fecFinance';
import { congressVotesCount } from '@/lib/data/congressVotes';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { mockElections } from '@/lib/data/mockElections';
import { lookupZip } from '@/lib/data/zipLookup';
import StateRosterControls from '@/components/dashboard/StateRosterControls';
import {
  DEFAULT_ROSTER_FILTERS,
  applyStateRosterFilters,
  getPoliticiansForStateRoster,
  type StateRosterFilters,
} from '@/lib/dashboard/stateRoster';
import {
  User, MapPin, Bookmark, BookmarkCheck, ArrowRight, Calendar,
  AlertTriangle, ExternalLink, X,
} from 'lucide-react';
import TrackButton from '@/components/ui/TrackButton';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington, DC' },
];

export default function DashboardPage() {
  const { profile, hydrated, setLocation, clearLocation, untrackPolitician, isTracked } = useUserProfile();
  const [stateCode, setStateCode] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [rosterFilters, setRosterFilters] = useState<StateRosterFilters>(DEFAULT_ROSTER_FILTERS);

  // Auto-fill state when a recognized ZIP is entered
  useEffect(() => {
    if (zipInput.length === 5) {
      const loc = lookupZip(zipInput);
      if (loc && loc.code !== stateCode) setStateCode(loc.code);
    }
  }, [zipInput, stateCode]);

  const hasLocation = hydrated && !!profile.stateCode;

  const stateReps = useMemo(
    () => (hasLocation ? getPoliticiansForStateRoster(profile.stateCode, rosterFilters.inOfficeOnly) : []),
    [hasLocation, profile.stateCode, rosterFilters.inOfficeOnly],
  );

  const filteredReps = useMemo(
    () => applyStateRosterFilters(stateReps, rosterFilters),
    [stateReps, rosterFilters],
  );

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-[#c8a951] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const stateElections = hasLocation
    ? mockElections.filter((e) => e.stateCode === profile.stateCode && e.isUpcoming)
    : [];

  const trackedPoliticians = allPoliticians.filter((p) => isTracked(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c8a951]/10 border border-[#c8a951]/30 flex items-center justify-center">
            <User className="h-5 w-5 text-[#c8a951]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Ledger</h1>
            <p className="text-gray-400 text-sm">
              {hasLocation ? `${profile.stateName}${profile.zipCode ? ` · ${profile.zipCode}` : ''}` : 'Your personalized view'}
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-600/40 rounded-full px-2 py-0.5">
            Demo data · {fecFinanceCount()} featured with FEC · {congressVotesCount()} with Congress votes
          </span>
        </div>
        {hasLocation && (
          <button
            type="button"
            onClick={clearLocation}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Change location
          </button>
        )}
      </div>

      <p className="text-gray-300 text-sm leading-relaxed max-w-3xl mb-6">
        The politicians making decisions about your community, your family&apos;s future, and the issues you actually care about will never trend on social media. They&apos;ll just appear on your ballot. Know them before that moment.
      </p>

      <div className="mb-8 flex items-start gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3 text-xs text-yellow-100/80">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-yellow-400/80" />
        <p>
          Demo data current as of 2026-06 where modeled. Representative rosters are illustrative and should be verified against official sources before relying on them.
        </p>
      </div>

      {/* Location Setup */}
      {!hasLocation && (
        <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-[#c8a951]" />
            <h2 className="text-white font-bold">Set Your Location</h2>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Enter your state (and optionally your ZIP code) to see your representatives, upcoming elections, and local candidates.
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block font-medium">State</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c8a951] min-w-[200px]"
              >
                <option value="">Select your state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block font-medium">ZIP Code (optional)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 33426"
                className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#c8a951] w-36 placeholder-gray-600"
              />
            </div>
            <button
              type="button"
              disabled={!stateCode}
              onClick={() => {
                const zipLoc = zipInput.length === 5 ? lookupZip(zipInput) : null;
                const code = zipLoc?.code ?? stateCode;
                const s = US_STATES.find((st) => st.code === code);
                if (s) setLocation(s.code, s.name, zipInput);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#c8a951] text-[#0a1628] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#d4b96b] transition-colors"
            >
              Personalize My Ledger
            </button>
          </div>
        </div>
      )}

      {/* My Tracked Politicians */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-[#c8a951]" />
            <h2 className="text-white font-bold text-lg">My Tracked Politicians</h2>
            {trackedPoliticians.length > 0 && (
              <span className="text-xs bg-[#c8a951]/20 text-[#c8a951] px-2 py-0.5 rounded-full">{trackedPoliticians.length}</span>
            )}
          </div>
          <Link href="/politicians" className="text-[#c8a951] text-xs hover:text-white flex items-center gap-1 transition-colors">
            Browse politicians <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {trackedPoliticians.length === 0 ? (
          <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-8 text-center">
            <Bookmark className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">No politicians tracked yet</p>
            <p className="text-gray-500 text-xs">Visit any politician&apos;s profile and click <strong className="text-gray-400">Track</strong> to follow them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trackedPoliticians.map((p) => {
              const bipartisan = 100 - p.consistency.partyLineVotePercentage;
              const lobbyistTotal = p.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
              return (
                <div key={p.id} className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] hover:border-[#c8a951]/50 transition-colors relative">
                  <button
                    type="button"
                    onClick={() => untrackPolitician(p.id)}
                    className="absolute top-3 right-3 text-gray-600 hover:text-red-400 transition-colors"
                    title="Remove from tracking"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Link href={`/politicians/${p.id}`} className="block">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center overflow-hidden flex-shrink-0">
                        <PoliticianAvatar name={p.name} firstName={p.firstName} lastName={p.lastName} imageUrl={p.imageUrl} textClassName="text-[#c8a951] font-bold text-sm" />
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">{p.name}</div>
                        <div className="text-gray-400 text-xs">{p.party} · {resolveOffice(p).label}</div>
                      </div>
                    </div>
                    {p.recordType === 'lightweight' ? (
                      <div className="text-xs text-[#c8a951]/80 bg-[#c8a951]/5 border border-[#c8a951]/15 rounded-lg px-2.5 py-2">
                        Real-sourced record · detailed metrics not yet integrated
                      </div>
                    ) : (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className={`text-sm font-bold ${p.consistency.overallScore >= 75 ? 'text-green-400' : p.consistency.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {p.consistency.overallScore}
                        </div>
                        <div className="text-gray-500 text-xs">Consistency</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${bipartisan >= 15 ? 'text-blue-400' : 'text-gray-400'}`}>
                          {bipartisan}%
                        </div>
                        <div className="text-gray-500 text-xs">Bipartisan</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatMoney(lobbyistTotal)}
                        </div>
                        <div className="text-gray-500 text-xs">Lobbyist $</div>
                      </div>
                    </div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My State section — only shown when location is set */}
      {hasLocation && (
        <>
          {/* State Representatives */}
          <section className="mb-10">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-[#c8a951]" />
                <h2 className="text-white font-bold text-lg">{profile.stateName} Representatives</h2>
                {stateReps.length > 0 && (
                  <span className="text-xs bg-[#1e3a5f] text-gray-400 px-2 py-0.5 rounded-full">{stateReps.length} in database</span>
                )}
              </div>
              <StateRosterControls
                filters={rosterFilters}
                onChange={setRosterFilters}
                totalCount={stateReps.length}
                filteredCount={filteredReps.length}
              />
            </div>

            {stateReps.length === 0 ? (
              <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-8 text-center">
                <p className="text-gray-400 text-sm">No federal politicians tracked for {profile.stateName} in the current database.</p>
                <p className="text-gray-500 text-xs mt-1">More profiles are added as the database grows.</p>
              </div>
            ) : filteredReps.length === 0 ? (
              <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-6 text-center">
                <p className="text-gray-400 text-sm">No {profile.stateName} politicians match the current filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReps.map((p) => {
                  const bipartisan = 100 - p.consistency.partyLineVotePercentage;
                  const lobbyistTotal = p.campaignFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
                  return (
                    <Link key={p.id} href={`/politicians/${p.id}`}
                      className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] hover:border-[#c8a951] transition-colors group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center overflow-hidden flex-shrink-0">
                          <PoliticianAvatar name={p.name} firstName={p.firstName} lastName={p.lastName} imageUrl={p.imageUrl} textClassName="text-[#c8a951] font-bold text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-sm group-hover:text-[#c8a951] transition-colors">{p.name}</div>
                          <div className="text-gray-400 text-xs truncate">{p.party} · {resolveOffice(p).label}</div>
                        </div>
                        <TrackButton politicianId={p.id} size="sm" />
                      </div>
                      {p.recordType === 'lightweight' ? (
                        <div className="text-xs text-[#c8a951]/80 bg-[#c8a951]/5 border border-[#c8a951]/15 rounded-lg px-2.5 py-2">
                          Real-sourced record · detailed metrics not yet integrated
                        </div>
                      ) : (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className={`text-sm font-bold ${p.consistency.overallScore >= 75 ? 'text-green-400' : p.consistency.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {p.consistency.overallScore}
                          </div>
                          <div className="text-gray-500 text-xs">Consistency</div>
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${bipartisan >= 15 ? 'text-blue-400' : 'text-gray-400'}`}>
                            {bipartisan}%
                          </div>
                          <div className="text-gray-500 text-xs">Bipartisan</div>
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${lobbyistTotal > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {formatMoney(lobbyistTotal)}
                          </div>
                          <div className="text-gray-500 text-xs">Lobbyist $</div>
                        </div>
                      </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upcoming Elections in my state */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#c8a951]" />
                <h2 className="text-white font-bold text-lg">Upcoming Elections in {profile.stateName}</h2>
              </div>
              <Link href="/elections" className="text-[#c8a951] text-xs hover:text-white flex items-center gap-1 transition-colors">
                All elections <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {stateElections.length === 0 ? (
              <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-8 text-center">
                <Calendar className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No upcoming elections tracked for {profile.stateName}.</p>
                <a href="https://www.vote.gov" target="_blank" rel="noopener noreferrer"
                   className="text-[#c8a951] text-xs flex items-center gap-1 justify-center mt-2 hover:text-white transition-colors">
                  Check vote.gov for official election info <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-yellow-400/70 bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Candidate data is illustrative — verify at <a href="https://www.ballotpedia.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-400 ml-1">Ballotpedia.org</a>
                </div>
                {stateElections.map((election) => (
                  <Link key={election.id} href={`/elections?id=${election.id}`}
                    className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] hover:border-[#c8a951] transition-colors p-5 block group">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-white font-semibold group-hover:text-[#c8a951] transition-colors">{election.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(election.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          <span className="text-gray-600">·</span>
                          <span>{election.candidates.length} candidates</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        election.level === 'federal' ? 'bg-blue-400/20 text-blue-400' :
                        election.level === 'state' ? 'bg-purple-400/20 text-purple-400' :
                        'bg-green-400/20 text-green-400'
                      }`}>
                        {election.level.charAt(0).toUpperCase() + election.level.slice(1)}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {election.candidates.map((c) => (
                        <span key={c.id} className={`text-xs px-2 py-0.5 rounded border ${
                          c.party === 'Democrat' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' :
                          c.party === 'Republican' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                          'bg-gray-500/15 text-gray-400 border-gray-500/20'
                        }`}>
                          {c.name} ({c.party[0]})
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Prompt to set location if not set but have tracked politicians */}
      {!hasLocation && trackedPoliticians.length > 0 && (
        <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-6 text-center mt-4">
          <MapPin className="h-8 w-8 text-[#c8a951]/50 mx-auto mb-3" />
          <p className="text-gray-300 text-sm mb-1 font-medium">See your local representatives and elections</p>
          <p className="text-gray-500 text-xs mb-4">Set your location above to unlock your state-specific view</p>
        </div>
      )}
    </div>
  );
}
