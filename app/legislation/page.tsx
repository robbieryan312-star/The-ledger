'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Search, Filter, ArrowUpDown, ExternalLink, Info,
  CalendarClock, Landmark, ArrowRight, Building2,
} from 'lucide-react';
import type { Bill, BillStage } from '@/lib/types';
import {
  getBills,
  getLegislationMeta,
  availableStages,
  billStageLabel,
  filterBills,
  type BillSortKey,
  type ChamberFilter,
  type StageFilter,
} from '@/lib/data/legislation';
import { getPoliticianByBioguide } from '@/lib/data/allPoliticians';
import SourceBadge from '@/components/ui/SourceBadge';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { FloridaLegislationSections } from '@/components/records/FloridaRecordPanel';
import { getLegislationFloridaBundle } from '@/lib/data/slices/legislationFlorida';

const STAGE_BADGE: Record<BillStage, string> = {
  introduced: 'bg-slate-400/10 text-slate-300 border-slate-400/30',
  committee: 'bg-blue-400/10 text-blue-300 border-blue-400/30',
  passed_one_chamber: 'bg-[#c8a951]/15 text-[#c8a951] border-[#c8a951]/40',
  passed_both: 'bg-teal-400/10 text-teal-300 border-teal-400/30',
  enacted: 'bg-green-400/10 text-green-400 border-green-400/30',
  failed: 'bg-red-400/10 text-red-300 border-red-400/30',
  other: 'bg-gray-400/10 text-gray-300 border-gray-400/20',
};

function partyBadgeClass(party?: string): string {
  if (party === 'Democrat') return 'bg-blue-500/20 text-blue-400';
  if (party === 'Republican') return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-300';
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SponsorLine({ bill }: { bill: Bill }) {
  const sponsor = bill.sponsor;
  if (!sponsor) {
    return <span className="text-gray-500 text-xs">Sponsor: no verified record available</span>;
  }
  const profile = getPoliticianByBioguide(sponsor.bioguideId);
  const meta = [sponsor.party, sponsor.state && `${sponsor.state}${sponsor.district ? `-${sponsor.district}` : ''}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs">
      <span className="text-gray-500">Sponsor:</span>
      {sponsor.party && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${partyBadgeClass(sponsor.party)}`}>
          {sponsor.party[0]}
        </span>
      )}
      {profile ? (
        <Link
          href={`/politicians/${profile.id}`}
          className="text-white font-medium hover:text-[#c8a951] transition-colors inline-flex items-center gap-0.5"
        >
          {sponsor.name}
          <ArrowRight className="h-3 w-3 opacity-60" />
        </Link>
      ) : sponsor.govTrackUrl ? (
        <a
          href={sponsor.govTrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-200 font-medium hover:text-[#c8a951] transition-colors inline-flex items-center gap-0.5"
        >
          {sponsor.name}
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>
      ) : (
        <span className="text-gray-200 font-medium">{sponsor.name}</span>
      )}
      {meta && <span className="text-gray-500">({meta})</span>}
    </div>
  );
}

function BillCard({ bill }: { bill: Bill }) {
  return (
    <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] hover:border-[#c8a951]/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0a1628] text-[#c8a951] border border-[#2d5a8e]">
            {bill.billNumber}
          </span>
          <span className="text-[11px] uppercase tracking-wide text-gray-400 border border-[#1e3a5f] px-1.5 py-0.5 rounded">
            {bill.chamber === 'house' ? 'House' : 'Senate'}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STAGE_BADGE[bill.stage]}`}>
            {bill.statusLabel}
          </span>
          {bill.scheduledConsiderationDate && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-[#c8a951]/15 text-[#c8a951] border-[#c8a951]/40 inline-flex items-center gap-1 font-medium">
              <CalendarClock className="h-3 w-3" />
              Floor: {formatDate(bill.scheduledConsiderationDate)}
            </span>
          )}
        </div>
        {/* Passage probability shown ONLY when a real, sourced value exists (omitted otherwise — never estimated). */}
        {bill.govTrackPrognosis != null && (
          <a
            href={bill.passageProbabilitySource?.url ?? bill.govTrackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-right flex-shrink-0 group"
            title="Passage prognosis — source: GovTrack"
          >
            <div className="text-lg font-bold text-[#c8a951] group-hover:underline">{bill.govTrackPrognosis}%</div>
            <div className="text-[10px] text-gray-500">GovTrack prognosis</div>
          </a>
        )}
      </div>

      <h3 className="text-white text-sm font-medium leading-snug mb-1">{bill.title}</h3>

      <p className="text-gray-400 text-xs leading-relaxed mb-2">
        {bill.latestAction.detail}
      </p>

      {bill.latestAction.detail && bill.latestAction.detail !== bill.title && (
        <p className="text-gray-500 text-xs leading-relaxed mt-0 mb-2 italic">
          Latest action: {bill.latestAction.text}
        </p>
      )}

      <SponsorLine bill={bill} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        <span>
          Latest action: <span className="text-gray-400">{bill.latestAction.text}</span>{' '}
          <span className="text-gray-600">· {formatDate(bill.latestAction.date)}</span>
        </span>
        <span>Introduced {formatDate(bill.introducedDate)}</span>
        {bill.cosponsorCount != null && (
          <span>{bill.cosponsorCount} cosponsor{bill.cosponsorCount === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#1e3a5f] flex-wrap">
        <a
          href={bill.congressGovUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Read full text <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <span className="text-gray-700">·</span>
        <a
          href={bill.govTrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#c8a951]/90 hover:text-[#c8a951] font-medium transition-colors"
        >
          GovTrack <ExternalLink className="h-2.5 w-2.5" />
        </a>
        <span className="ml-auto">
          <SourceBadge source={bill.source} size="xs" />
        </span>
      </div>
    </div>
  );
}

const VALID_STAGES: readonly string[] = [
  'introduced', 'committee', 'passed_one_chamber', 'passed_both', 'enacted', 'failed', 'other',
];

type ParamReader = { get(name: string): string | null };

function paramChamber(sp: ParamReader): ChamberFilter {
  const c = sp.get('chamber');
  return c === 'house' || c === 'senate' ? c : 'all';
}
function paramStage(sp: ParamReader): StageFilter {
  const s = sp.get('status') ?? sp.get('stage');
  return s && VALID_STAGES.includes(s) ? (s as BillStage) : 'all';
}
function paramSort(sp: ParamReader): BillSortKey {
  const so = sp.get('sort');
  return so === 'introduced' || so === 'number' || so === 'recent_action' ? so : 'recent_action';
}

function LegislationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const meta = getLegislationMeta();
  const allBills = useMemo(() => getBills(), []);
  const stages = useMemo(() => availableStages(), []);

  // The URL is the source of truth for chamber/status/sort — shareable and
  // deep-linkable from the nav. Free-text search stays local. No setState-in-effect.
  const chamber = paramChamber(searchParams);
  const stage = paramStage(searchParams);
  const sort = paramSort(searchParams);
  const [query, setQuery] = useState('');

  const setParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const filtered = useMemo(
    () => filterBills(allBills, { query, chamber, stage, sort }),
    [allBills, query, chamber, stage, sort],
  );

  const scheduledCount = useMemo(() => allBills.filter((b) => b.scheduledConsiderationDate).length, [allBills]);
  const advancedCount = useMemo(
    () => allBills.filter((b) => b.stage === 'passed_one_chamber' || b.stage === 'passed_both' || b.stage === 'enacted').length,
    [allBills],
  );
  const committeeCount = useMemo(() => allBills.filter((b) => b.stage === 'committee').length, [allBills]);
  const floridaLegislation = getLegislationFloridaBundle();

  const chamberTabs: { id: ChamberFilter; label: string }[] = [
    { id: 'all', label: 'All chambers' },
    { id: 'house', label: 'House' },
    { id: 'senate', label: 'Senate' },
  ];

  const sortTabs: { id: BillSortKey; label: string }[] = [
    { id: 'recent_action', label: 'Newest action' },
    { id: 'introduced', label: 'Introduced date' },
    { id: 'number', label: 'Bill number' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Upcoming Legislation</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
          Recent and active bills in the {meta.congress}th Congress — what was introduced, where it sits in committee,
          and what moved on the floor. Each record links to its official Congress.gov page and the nonpartisan GovTrack tracker.
        </p>
      </div>

      {/* Data source strip */}
      <div className="bg-[#0a1628] rounded-xl border border-[#1e3a5f] p-4 mb-6">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Data Source</div>
        <SourceProvenance source={meta.source} asOf={meta.asOf} size="sm" />
        <p className="text-xs text-gray-500 leading-relaxed mt-2">
          {meta.fetchedLive ? (
            <>
              {meta.count} bill{meta.count === 1 ? '' : 's'} from GovTrack&apos;s keyless public API, sorted by most recent action,
              with official <span className="text-gray-400">Congress.gov</span> deep links. Snapshot as of {meta.asOf}.
              Run <code className="text-[#c8a951]">npm run sync:legislation</code> to refresh.
            </>
          ) : (
            <>
              <span className="text-yellow-400/90 font-medium">No live snapshot yet.</span>{' '}
              The GovTrack fetch was unavailable when this build was generated, so no rows are shown rather than fabricated.
              Run <code className="text-[#c8a951]">npm run sync:legislation</code> with network access to populate real records.
            </>
          )}
        </p>
      </div>

      {/* Stats */}
      {allBills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
            <FileText className="h-5 w-5 text-[#c8a951] mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{allBills.length}</div>
            <div className="text-xs text-gray-400">Bills tracked</div>
          </div>
          <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#c8a951]/30 text-center">
            <CalendarClock className="h-5 w-5 text-[#c8a951] mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#c8a951]">{scheduledCount}</div>
            <div className="text-xs text-gray-400">Scheduled for floor</div>
          </div>
          <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
            <Landmark className="h-5 w-5 text-teal-300 mx-auto mb-1" />
            <div className="text-2xl font-bold text-teal-300">{advancedCount}</div>
            <div className="text-xs text-gray-400">Passed a chamber+</div>
          </div>
          <div className="bg-[#0d1f35] rounded-xl p-3 border border-[#1e3a5f] text-center">
            <Building2 className="h-5 w-5 text-blue-300 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-300">{committeeCount}</div>
            <div className="text-xs text-gray-400">In committee</div>
          </div>
        </div>
      )}

      {/* Methodology / honest-scope note */}
      <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-white font-semibold mb-1 text-sm">How to read this tracker</div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Status labels, dates, and sponsors come straight from GovTrack (a nonpartisan, Tier 2 source) and link to the
            primary Congress.gov record (Tier 1, official). Cosponsor counts and a passage-probability prognosis are not
            available from the keyless GovTrack feed, so they are omitted rather than estimated — a passage probability will
            only ever appear when a real, sourced value is present and attributed. This page reports the legislative record;
            it does not assign which party benefits from any bill.
          </p>
        </div>
      </div>

      {allBills.length === 0 ? (
        <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-12 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-300 font-medium mb-1">No verified legislation records available</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Run <code className="text-[#c8a951]">npm run sync:legislation</code> with network access to populate this tracker
            from GovTrack. No bills are shown until a real snapshot exists.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] mb-6 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by bill number, title, sponsor, or state…"
                className="w-full bg-[#0a1628] border border-[#1e3a5f] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#c8a951]/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 inline-flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Chamber:</span>
              {chamberTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setParam('chamber', t.id, 'all')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    chamber === t.id ? 'bg-[#c8a951] text-[#0a1628] font-medium' : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">Status:</span>
              <button
                onClick={() => setParam('status', 'all', 'all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  stage === 'all' ? 'bg-[#c8a951] text-[#0a1628] font-medium' : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                }`}
              >
                All
              </button>
              {stages.map((s) => (
                <button
                  key={s}
                  onClick={() => setParam('status', s, 'all')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    stage === s ? 'bg-[#c8a951] text-[#0a1628] font-medium' : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                  }`}
                >
                  {billStageLabel(s)}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#1e3a5f] pt-3">
              <span className="text-xs text-gray-500 inline-flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Sort:</span>
              {sortTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setParam('sort', t.id, 'recent_action')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    sort === t.id ? 'bg-[#c8a951] text-[#0a1628] font-medium' : 'bg-[#0a1628] text-gray-400 border border-[#1e3a5f] hover:border-[#c8a951]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-3">
            Showing {filtered.length} of {allBills.length} bills
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-12 text-center">
                <Search className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No bills match the current filters</p>
              </div>
            ) : (
              filtered.map((bill) => <BillCard key={bill.id} bill={bill} />)
            )}
          </div>
        </>
      )}

      <div className="mt-6 flex items-start gap-2 text-xs bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f]">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-500" />
        <p className="text-gray-400 leading-relaxed">
          Bill status and sponsor data via GovTrack.us (Tier 2, nonpartisan); each row links to the official Congress.gov
          record (Tier 1). Snapshot as of {meta.asOf}. Sorted by most recent legislative action by default.
        </p>
      </div>

      {floridaLegislation.sections.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-white mb-2">Florida legislative &amp; regulatory records</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            State bills (LegiScan), legislators (OpenStates), GovInfo documents, and Federal Register items mentioning Florida.
            Each row includes source link and fetch timestamp.
          </p>
          <FloridaLegislationSections bundle={floridaLegislation} />
        </div>
      )}
    </div>
  );
}

export default function LegislationPage() {
  return (
    <Suspense>
      <LegislationContent />
    </Suspense>
  );
}
