'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { getPoliticianById } from '@/lib/data/allPoliticians';
import { resolveCurrentOffice, EXECUTIVE_CHAMBERS, JUDICIAL_CHAMBERS } from '@/lib/data/officeResolution';
import { mergeCampaignFinance } from '@/lib/data/fecFinance';
import { mergeVotingRecord } from '@/lib/data/congressVotes';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import SourceBadge from '@/components/ui/SourceBadge';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { PHOTO_ATTRIBUTION } from '@/lib/data/photos';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import VotingRecord from '@/components/politicians/VotingRecord';
import DonorChart from '@/components/politicians/DonorChart';
import StockTrades from '@/components/politicians/StockTrades';
import CredibilityConsistency from '@/components/politicians/CredibilityConsistency';
import RelatedOfficialRecords from '@/components/politicians/RelatedOfficialRecords';
import PublicActionsAccordion from '@/components/politicians/PublicActionsAccordion';
import ExecutiveActions from '@/components/politicians/ExecutiveActions';
import EarlierRecordSection from '@/components/politicians/EarlierRecordSection';
import ExpandableEvidenceRow from '@/components/politicians/ExpandableEvidenceRow';
import { findRecordJuxtapositions } from '@/lib/data/recordJuxtapositions';
import SourceTierHelp from '@/components/ui/SourceTierHelp';
import ControversySection from '@/components/politicians/ControversySection';
import ProfileNewsExplorer from '@/components/politicians/ProfileNewsExplorer';
import Link from 'next/link';
import {
  ArrowLeft, X, Globe, Calendar, MapPin,
  TrendingUp, DollarSign, Vote, AlertTriangle, Briefcase, Newspaper, Scale,
  ExternalLink, Users, ChevronDown, ChevronRight, Baby, Crosshair, Plane,
  Heart, Leaf, Landmark, BookOpen, Globe2, Shield, Clock, Gavel, Home, Award,
} from 'lucide-react';
import {
  STANDARD_POLICY_TOPICS,
  TOPIC_GAP_LABEL,
  TOPIC_GAP_DETAIL,
  issuesWithTopicCoverage,
  issueEvidenceSections,
  matchTopic,
  type PolicyTopicDef,
} from '@/lib/data/topicCoverage';
import { use } from 'react';
import TrackButton from '@/components/ui/TrackButton';

const BASE_TABS = [
  { id: 'overview',      label: 'Overview',       icon: Briefcase },
  { id: 'votes',         label: 'Voting Record',  icon: Vote },
  { id: 'finance',       label: 'Money & Donors', icon: DollarSign },
  { id: 'stocks',        label: 'Stock Trades',   icon: TrendingUp },
  { id: 'consistency',   label: 'Track Record',   icon: AlertTriangle },
  { id: 'controversies', label: 'Controversies',  icon: Scale },
  { id: 'news',          label: 'News',           icon: Newspaper },
  { id: 'endorsements',  label: 'Endorsements',   icon: Users },
] as const;

function profileTabs(isExecutive: boolean) {
  if (!isExecutive) return [...BASE_TABS];
  return BASE_TABS.map((tab) =>
    tab.id === 'votes'
      ? { ...tab, id: 'executive-actions', label: 'Executive Actions', icon: Landmark }
      : tab,
  );
}

import { EvidenceItem, Issue, Politician, VoteRecord } from '@/lib/types';

// ── Hot Topics quick-view ────────────────────────────────────────────────────
const TOPIC_ICONS: Record<string, React.ElementType> = {
  abortion: Baby,
  guns: Crosshair,
  immigration: Plane,
  healthcare: Heart,
  climate: Leaf,
  economy: Landmark,
  taxes: DollarSign,
  education: BookOpen,
  foreign: Globe2,
  civil: Shield,
  criminal: Gavel,
  housing: Home,
  veterans: Award,
};

const HOT_TOPICS: Array<PolicyTopicDef & { Icon: React.ElementType }> = STANDARD_POLICY_TOPICS.map((t) => ({
  ...t,
  Icon: TOPIC_ICONS[t.id] ?? Shield,
}));

const MISSING_RECORD_LABEL = 'No verified record available in integrated data';

function MissingRecordPanel({ kind }: { kind: string }) {
  return (
    <div className="rounded-xl p-8 border border-white/[0.07] text-center" style={{ background: 'rgba(11,25,41,0.6)' }}>
      <Shield className="h-10 w-10 text-[#c8a951]/40 mx-auto mb-3" />
      <p className="text-white/60 text-sm font-medium">{MISSING_RECORD_LABEL}</p>
      <p className="text-white/35 text-xs mt-1 max-w-md mx-auto leading-relaxed">
        This is a lightweight, real-sourced record — its current office, term, party, and state are verified, but{' '}
        {kind} has not yet been integrated for this profile. Nothing here is fabricated.
      </p>
    </div>
  );
}

function HotTopicsPanel({ issues, votes, isFeatured }: { issues: Issue[]; votes: VoteRecord[]; isFeatured: boolean }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-white/[0.08] p-5 mb-6" style={{ background: 'rgba(11,25,41,0.7)' }}>
      <h2 className="text-white font-bold mb-1">Where They Stand — Key Issues</h2>
      <p className="text-white/35 text-xs mb-4">Click any topic to see positions based on recorded votes, statements, and actions — not editorial opinion</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {HOT_TOPICS.map(topic => {
          const matched = matchTopic(issues, topic);
          const isGap = matched?.position === TOPIC_GAP_LABEL;
          const Icon = topic.Icon;
          const isOpen = openTopic === topic.id;

          return (
            <div key={topic.id} className="col-span-1">
              <button
                onClick={() => setOpenTopic(isOpen ? null : topic.id)}
                className={`w-full text-left rounded-xl p-3 border transition-all ${
                  matched && !isGap
                    ? isOpen
                      ? 'border-[#d4ac52]/50'
                      : 'border-white/[0.07] hover:border-[#d4ac52]/40'
                    : 'border-white/[0.04] opacity-50'
                }`}
                style={matched && !isGap && isOpen ? { background: 'rgba(212,172,82,0.08)' } : { background: 'rgba(5,9,15,0.5)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 flex-shrink-0 ${matched && !isGap ? 'text-[#c8a951]' : 'text-gray-600'}`} />
                  <span className={`text-xs font-semibold ${matched && !isGap ? 'text-white' : 'text-gray-600'}`}>{topic.label}</span>
                </div>
                <div className="text-xs text-gray-400 leading-tight line-clamp-2">
                  {matched && !isGap ? matched.position : TOPIC_GAP_LABEL}
                </div>
              </button>

              {isOpen && matched && !isGap && (
                <div className="mt-1 rounded-xl border border-[#d4ac52]/25 p-3 text-xs space-y-2" style={{ background: 'rgba(5,9,15,0.85)' }}>
                  <div className="text-[#c8a951] font-semibold text-xs mb-0.5">{matched.position}</div>
                  <p className="text-gray-300 leading-relaxed italic">{matched.statement ?? matched.detail}</p>
                  {matched.evidence && matched.evidence.length > 0 ? (
                    <div className="pt-2 border-t border-[#1e3a5f] space-y-1.5">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Evidence (newest first)</div>
                      {issueEvidenceSections(matched).current.map((ev, j) => (
                        <ExpandableEvidenceRow key={j} item={ev} />
                      ))}
                      <EarlierRecordSection items={issueEvidenceSections(matched).historical} />
                    </div>
                  ) : matched.source ? (
                    <div className="pt-1 border-t border-[#1e3a5f]">
                      <SourceProvenance source={matched.source} />
                    </div>
                  ) : null}
                  {/* Related votes */}
                  {votes.length > 0 && (() => {
                    const kw = topic.keywords;
                    const related = votes.filter(v =>
                      kw.some(k => v.billTitle.toLowerCase().includes(k) || v.billDescription.toLowerCase().includes(k) || v.category.toLowerCase().includes(k))
                    ).slice(0, 2);
                    if (!related.length) return null;
                    return (
                      <div className="pt-1 border-t border-[#1e3a5f]">
                        <div className="text-gray-500 mb-1">Related votes:</div>
                        {related.map(v => (
                          <div key={v.id} className="flex items-center gap-1.5 text-xs">
                            <span className={`font-bold ${v.vote === 'Yea' ? 'text-green-400' : v.vote === 'Nay' ? 'text-red-400' : 'text-gray-400'}`}>{v.vote}</span>
                            <span className="text-gray-400">{v.billTitle}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {isOpen && (!matched || isGap) && (
                <div className="mt-1 rounded-xl border border-white/[0.06] p-3 text-xs space-y-1" style={{ background: 'rgba(5,9,15,0.85)' }}>
                  <div className="text-gray-300 font-semibold">{TOPIC_GAP_LABEL}</div>
                  <p className="text-gray-500 leading-relaxed">
                    {isFeatured
                      ? TOPIC_GAP_DETAIL
                      : `${MISSING_RECORD_LABEL}. Lightweight profiles only show verified office metadata until issue feeds are integrated.`}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// Full calendar date (month + day + year) from an ISO string, parsed from parts to
// avoid UTC off-by-one shifts. Used for term and election dates per demo feedback.
function formatFullDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BioExpandable({ bio }: { bio: string }) {
  const [open, setOpen] = useState(false);
  const needsExpand = bio.length > 220;

  return (
    <div className="mb-2 max-w-2xl">
      <p className={`text-white/40 text-xs leading-relaxed ${!open && needsExpand ? 'line-clamp-3' : ''}`}>
        {bio}
      </p>
      {needsExpand && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-1 flex items-center gap-1 text-[11px] text-[#c8a951] hover:text-white transition-colors"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? 'Show less' : 'Read full record summary'}
        </button>
      )}
    </div>
  );
}

function ConvergenceIndicator({ evidence }: { evidence: EvidenceItem[] }) {
  const uniqueSources = new Set(evidence.map((e) => e.source.name)).size;
  const filled = Math.min(5, evidence.length);
  const label =
    uniqueSources >= 3 ? `${uniqueSources} independent sources point to the same conclusion` :
    uniqueSources === 2 ? 'Corroborated by 2 independent sources' :
    'Single source — treat with appropriate caution';
  const color = uniqueSources >= 3 ? 'text-green-400' : uniqueSources === 2 ? 'text-[#c8a951]' : 'text-gray-500';
  return (
    <div className="flex items-center gap-2 mt-2 mb-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`inline-block w-2 h-2 rounded-full ${n <= filled ? 'bg-[#c8a951]' : 'bg-white/[0.08]'}`} />
        ))}
      </div>
      <span className={`text-[10px] font-medium ${color}`}>{label}</span>
    </div>
  );
}

function IssueAccordion({ issues, politicianName }: { issues: Issue[]; politicianName: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const lastName = politicianName.split(' ').pop() ?? politicianName;
  const isGapIssue = (issue: Issue) => issue.position === TOPIC_GAP_LABEL;

  return (
    <div className="space-y-2">
      {issues.map((issue, i) => (
        <div key={`${issue.name}-${i}`} className={`border rounded-xl overflow-hidden transition-all ${openIdx === i ? 'border-[#d4ac52]/40' : isGapIssue(issue) ? 'border-white/[0.05] opacity-80' : 'border-white/[0.07]'}`}
             style={{ background: openIdx === i ? 'rgba(212,172,82,0.04)' : 'rgba(5,9,15,0.4)' }}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-medium text-sm">{issue.name}</span>
                <span className="text-xs text-white/35 px-2 py-0 rounded-full border border-white/[0.07]">{issue.category}</span>
                {isGapIssue(issue) ? (
                  <span className="text-[10px] text-gray-500 border border-white/[0.08] px-1.5 py-0 rounded-full">coverage gap</span>
                ) : issue.evidence && issue.evidence.length > 0 && (
                  <span className="text-[10px] text-[#c8a951]/60 border border-[#c8a951]/20 px-1.5 py-0 rounded-full">
                    {issue.evidence.length} evidence item{issue.evidence.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className={`text-xs mt-0.5 ${isGapIssue(issue) ? 'text-gray-500' : ''}`} style={isGapIssue(issue) ? undefined : { color: '#d4ac52' }}>{issue.position}</div>
            </div>
            {openIdx === i
              ? <ChevronDown className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />}
          </button>

          {openIdx === i && (
            <div className="px-4 pb-4 border-t border-white/[0.06]" style={{ background: 'rgba(5,9,15,0.4)' }}>

              {/* Convergence indicator */}
              {issue.evidence && issue.evidence.length > 0 && (
                <ConvergenceIndicator evidence={issue.evidence} />
              )}

              {/* Qualified statement */}
              {!isGapIssue(issue) && (
              <p className="text-white/60 text-xs leading-relaxed pt-2 mb-3 italic border-l-2 border-[#c8a951]/30 pl-3">
                {issue.statement ?? `Available evidence suggests ${lastName} ${issue.detail.charAt(0).toLowerCase()}${issue.detail.slice(1)}`}
              </p>
              )}

              {isGapIssue(issue) ? (
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-gray-400 leading-relaxed pt-2">
                  {TOPIC_GAP_DETAIL}
                </div>
              ) : issue.evidence && issue.evidence.length > 0 ? (
                <div className="space-y-2">
                  {issueEvidenceSections(issue).current.map((ev, j) => (
                    <ExpandableEvidenceRow key={j} item={ev} />
                  ))}
                  <EarlierRecordSection items={issueEvidenceSections(issue).historical} />
                </div>
              ) : issue.source ? (
                <div className="pt-1">
                  <SourceProvenance source={issue.source} />
                </div>
              ) : (
                <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-100/75">
                  {TOPIC_GAP_LABEL}. Issue positions are only shown when backed by sourced votes, actions, filings, or statements.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EndorsementsTab({ politician }: { politician: Politician }) {
  const e = politician.endorsements;
  if (!e || (e.endorses.length === 0 && e.endorsedBy.length === 0)) {
    return (
      <div className="rounded-xl p-8 border border-white/[0.07] text-center" style={{ background: 'rgba(11,25,41,0.6)' }}>
        <Users className="h-10 w-10 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">No endorsement data on record for {politician.name}</p>
        <p className="text-white/20 text-xs mt-1">Endorsement records will be added as elections approach</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Endorsed By */}
      <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <Users className="h-4 w-4 text-[#c8a951]" /> Endorsed By
        </h2>
        <p className="text-gray-500 text-xs mb-4">Who has publicly supported {politician.firstName}</p>
        {e.endorsedBy.length === 0 ? (
          <p className="text-gray-500 text-sm">No endorsements recorded</p>
        ) : (
          <div className="space-y-3">
            {e.endorsedBy.map((endorser, i) => (
              <div key={i} className="border border-white/[0.07] rounded-xl p-3" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/[0.08]" style={{ background: 'rgba(212,172,82,0.12)' }}>
                    <span className="text-xs font-bold" style={{ color: '#d4ac52' }}>{endorser.name.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0,2).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {endorser.politicianId ? (
                      <Link href={`/politicians/${endorser.politicianId}`} className="text-white font-medium text-sm hover:text-[#d4ac52] transition-colors">
                        {endorser.name}
                      </Link>
                    ) : (
                      <span className="text-white font-medium text-sm">{endorser.name}</span>
                    )}
                    <div className="text-white/40 text-xs">{endorser.office}</div>
                    {endorser.date && <div className="text-white/25 text-xs">{endorser.date.split('-')[0]}</div>}
                    {endorser.source && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0 rounded font-medium ${
                          endorser.source.tier === 'official' ? 'bg-green-500/15 text-green-400' :
                          endorser.source.tier === 'nonpartisan' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-gray-500/15 text-gray-400'
                        }`}>{endorser.source.tier}</span>
                        {endorser.source.url ? (
                          <a href={endorser.source.url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-white/30 hover:text-[#d4ac52] transition-colors flex items-center gap-1">
                            {endorser.source.name} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-white/25">{endorser.source.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Endorses */}
      <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" /> Who {politician.firstName} Endorses
        </h2>
        <p className="text-gray-500 text-xs mb-4">Candidates and officials {politician.firstName} has publicly backed</p>
        {e.endorses.length === 0 ? (
          <p className="text-gray-500 text-sm">No outgoing endorsements recorded</p>
        ) : (
          <div className="space-y-3">
            {e.endorses.map((endorsed, i) => (
              <div key={i} className="border border-white/[0.07] rounded-xl p-3" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/[0.08]" style={{ background: 'rgba(96,165,250,0.12)' }}>
                    <span className="text-blue-400 text-xs font-bold">{endorsed.name.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0,2).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {endorsed.politicianId ? (
                      <Link href={`/politicians/${endorsed.politicianId}`} className="text-white font-medium text-sm hover:text-[#d4ac52] transition-colors">
                        {endorsed.name}
                      </Link>
                    ) : (
                      <span className="text-white font-medium text-sm">{endorsed.name}</span>
                    )}
                    <div className="text-white/40 text-xs">{endorsed.office}</div>
                    {endorsed.date && <div className="text-white/25 text-xs">{endorsed.date.split('-')[0]}</div>}
                    {endorsed.source && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs px-1.5 py-0 rounded font-medium ${
                          endorsed.source.tier === 'official' ? 'bg-green-500/15 text-green-400' :
                          endorsed.source.tier === 'nonpartisan' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-gray-500/15 text-gray-400'
                        }`}>{endorsed.source.tier}</span>
                        {endorsed.source.url ? (
                          <a href={endorsed.source.url} target="_blank" rel="noopener noreferrer"
                             className="text-xs text-white/30 hover:text-[#d4ac52] transition-colors flex items-center gap-1">
                            {endorsed.source.name} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-white/25">{endorsed.source.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PoliticianProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = use(params);
  const { tab } = use(searchParams);
  const politician = getPoliticianById(id);

  if (!politician) return notFound();

  const isExecutive = EXECUTIVE_CHAMBERS.includes(politician.chamber);
  const tabs = profileTabs(isExecutive);
  const initialTab = tab === 'votes' && isExecutive ? 'executive-actions' : (tab ?? 'overview');
  const [activeTab, setActiveTab] = useState(() => initialTab);

  const isLightweight = politician.recordType === 'lightweight';
  const isFeatured = !isLightweight;
  const displayIssues = issuesWithTopicCoverage(politician.topIssues, isFeatured);

  // CURRENT office is resolved from the authoritative legislators dataset, not
  // from hand-typed fields. A former member resolves to "Former …" by construction.
  const resolvedOffice = resolveCurrentOffice(politician);

  const { finance: displayFinance, fecEntry } = mergeCampaignFinance(
    politician.id,
    politician.campaignFinance,
  );

  const { votes: displayVotes, congressEntry, usingOfficialVotes } = mergeVotingRecord(
    politician.id,
    politician.votingRecord,
    politician.recordType,
  );

  const {
    trades: displayStockTrades,
    officialEntry: stockEntry,
    usingOfficialTrades,
    demoTradeCount,
  } = mergeStockTrades(politician.id, politician.stockTrades, politician.recordType);

  const lobbyOrgTotal = displayFinance.lobbyistMoney.reduce((s, l) => s + l.amount, 0);
  const pacTotal = displayFinance.pacDonations;
  const individualTotal = displayFinance.individualDonations;
  const highConflictTrades = displayStockTrades.filter((t) => t.conflictScore >= 70);

  const recordJuxtapositions =
    isFeatured && usingOfficialVotes && usingOfficialTrades
      ? findRecordJuxtapositions(displayVotes, displayStockTrades)
      : [];

  const partyColor =
    politician.party === 'Democrat' ? 'text-blue-400' :
    politician.party === 'Republican' ? 'text-red-400' :
    'text-gray-300';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/politicians" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Politicians
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl border border-white/[0.08] p-6 mb-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, rgba(15,34,54,0.9) 0%, rgba(11,25,41,0.9) 100%)', backdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 60% 100% at 0% 50%, rgba(30,62,100,0.25) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col md:flex-row gap-5">
          {/* Photo */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl flex items-center justify-center overflow-hidden border border-white/[0.1]"
                 style={{ background: 'linear-gradient(135deg, #0f2236 0%, #07101f 100%)' }}>
              <PoliticianAvatar
                name={politician.name}
                firstName={politician.firstName}
                lastName={politician.lastName}
                imageUrl={politician.imageUrl}
                textClassName="font-bold text-4xl text-[#d4ac52]"
              />
            </div>
            {politician.imageUrl && (
              <a href={PHOTO_ATTRIBUTION.url} target="_blank" rel="noopener noreferrer"
                 className="text-[9px] text-white/25 hover:text-white/45 text-center leading-tight max-w-[9rem]">
                {PHOTO_ATTRIBUTION.label}
              </a>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start flex-wrap gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{politician.name}</h1>
              {resolvedOffice.isCurrent ? (
                <span className="text-xs bg-green-400/15 text-green-400 border border-green-400/25 px-2.5 py-1 rounded-full font-medium tracking-wide">In Office</span>
              ) : resolvedOffice.reason === 'real-former' ? (
                <span className="text-xs bg-gray-400/15 text-gray-300 border border-gray-400/25 px-2.5 py-1 rounded-full font-medium tracking-wide">Former Office</span>
              ) : null}
              <TrackButton politicianId={politician.id} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
              <span className={`font-medium ${partyColor}`}>{politician.party}</span>
              <span className="text-gray-400 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {politician.state}{politician.district ? ` · District ${politician.district}` : ''}
              </span>
              <span className="text-gray-300 font-medium">
                {resolvedOffice.label}
              </span>
              {resolvedOffice.reason !== 'unresolved-demo' ? (
                <a
                  href={resolvedOffice.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${resolvedOffice.source.name} — checked ${resolvedOffice.asOf}`}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-[#c8a951]/15 text-[#d4ac52] border border-[#c8a951]/30 px-2 py-0.5 rounded-full hover:bg-[#c8a951]/25 transition-colors"
                >
                  <Shield className="h-3 w-3" />
                  Official record · as of {resolvedOffice.asOf}
                  <SourceTierHelp tier={resolvedOffice.source.tier} />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-gray-500/15 text-gray-400 border border-gray-500/25 px-2 py-0.5 rounded-full">
                  Demo data
                </span>
              )}
              {politician.termEnd && (() => {
                const end = new Date(politician.termEnd);
                const today = new Date();
                const monthsLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30));
                const soon = monthsLeft > 0 && monthsLeft <= 18;
                return (
                  <span className={`flex items-center gap-1 ${soon ? 'text-[#c8a951]' : 'text-gray-400'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    Term ends {formatFullDate(politician.termEnd)}
                    {soon && <span className="text-xs bg-[#c8a951]/20 px-1.5 py-0.5 rounded-full">({monthsLeft}mo)</span>}
                  </span>
                );
              })()}
              {politician.nextElection && (
                <span className="flex items-center gap-1 text-blue-400 text-xs bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                  <Calendar className="h-3 w-3" />
                  Next election: {politician.nextElection}
                </span>
              )}
            </div>

            {/* Political record summary */}
            <BioExpandable bio={politician.bio} />

            <div className="flex flex-wrap gap-2">
              {politician.termStart && (
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> In office since {formatFullDate(politician.termStart)}
                </span>
              )}
              {politician.website && (
                <a href={politician.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#1e3a5f] rounded-lg px-2 py-1 hover:border-white transition-colors">
                  <Globe className="h-3 w-3" /> Official site
                </a>
              )}
              {politician.twitter && (
                <a href={`https://twitter.com/${politician.twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#1e3a5f] rounded-lg px-2 py-1 hover:border-white transition-colors">
                  <X className="h-3 w-3" /> @{politician.twitter}
                </a>
              )}
            </div>
          </div>

          {/* Key Stats */}
          {isLightweight ? (
            <div className="flex md:flex-col gap-2 md:w-44">
              <div className="rounded-xl p-3 border border-white/[0.07] min-w-[90px]" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="flex items-center gap-1.5 text-[#c8a951] text-xs font-semibold mb-1">
                  <Shield className="h-3.5 w-3.5" /> Real-sourced record
                </div>
                <p className="text-white/40 text-[11px] leading-snug">
                  Current office, term, party &amp; state verified. Votes, finance, and positions
                  are not yet integrated.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex md:flex-col gap-2 flex-wrap md:flex-nowrap">
              <div className="rounded-xl p-3 border border-white/[0.07] text-center min-w-[90px]" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="text-2xl font-bold" style={{ color: '#d4ac52' }}>{formatMoney(displayFinance.totalRaised)}</div>
                <div className="text-xs text-white/40 flex items-center justify-center gap-1 flex-wrap">
                  Total raised
                  {fecEntry && <SourceBadge source={fecEntry.source} size="xs" />}
                </div>
              </div>
              <div className="rounded-xl p-3 border border-green-400/15 text-center min-w-[90px]" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="text-2xl font-bold text-green-400">{formatMoney(individualTotal)}</div>
                <div className="text-xs text-white/40">Individual donors</div>
              </div>
              <div className="rounded-xl p-3 border border-red-400/15 text-center min-w-[90px]" style={{ background: 'rgba(5,9,15,0.5)' }}>
                <div className="text-2xl font-bold text-red-400">{formatMoney(pacTotal)}</div>
                <div className="text-xs text-white/40">PAC contributions</div>
              </div>
              {lobbyOrgTotal > 0 && (
                <div className="rounded-xl p-3 border border-yellow-400/20 text-center min-w-[90px]" style={{ background: 'rgba(5,9,15,0.5)' }}>
                  <div className="text-2xl font-bold text-yellow-400">{formatMoney(lobbyOrgTotal)}</div>
                  <div className="text-xs text-white/40">Lobbying orgs</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Committees */}
        {politician.committees && politician.committees.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] relative">
            <span className="text-xs text-white/35 mr-3">Committees:</span>
            <div className="inline-flex flex-wrap gap-1.5">
              {politician.committees.map((c) => (
                <span key={c} className="text-xs text-white/50 px-2.5 py-0.5 rounded-full border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab !== tab.id ? 'hover:bg-white/[0.08] hover:text-white/70' : ''
              }`}
              style={activeTab === tab.id
                ? { background: 'linear-gradient(135deg, #d4ac52 0%, #b8922f 100%)', color: '#05090f', boxShadow: '0 2px 12px rgba(212,172,82,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <>
          {isLightweight && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-[#c8a951]/25 bg-[#c8a951]/5 px-4 py-3 text-xs text-[#e6cd8a]">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c8a951]" />
              <p>
                <strong className="text-white">Lightweight, real-sourced record.</strong> This profile&apos;s
                current office, term, party, and state are verified from authoritative datasets. Voting record,
                campaign finance, stock trades, issue positions, and news are <em>not yet integrated</em> and show
                as &ldquo;{MISSING_RECORD_LABEL}&rdquo;. No positions or quotes are fabricated.
              </p>
            </div>
          )}
          <HotTopicsPanel issues={displayIssues} votes={displayVotes} isFeatured={isFeatured} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Issues */}
            <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-1">Key Positions</h2>
              <p className="text-gray-500 text-xs mb-4">Click each issue to see evidence and sources — positions expressed as what available records show, not as definitive statements</p>
              {displayIssues.length > 0 ? (
                <IssueAccordion issues={displayIssues} politicianName={politician.name} />
              ) : (
                <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-100/75">
                  {MISSING_RECORD_LABEL}. Issue positions are only shown when backed by sourced votes, actions,
                  filings, or statements — none are fabricated for this profile.
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
                <h2 className="text-white font-bold mb-4">At a Glance</h2>
                {isLightweight ? (
                  <p className="text-white/40 text-sm leading-relaxed">{MISSING_RECORD_LABEL}. Party-line rate,
                  donations, PAC money, lobbyist money, and stock-trade metrics will populate once finance and
                  voting feeds are integrated for this member.</p>
                ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Party-Line Vote Rate</span>
                    <span className="text-white font-medium">{politician.consistency.partyLineVotePercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lobbyist Alignment</span>
                    <span className={`font-medium ${politician.consistency.lobbyistAlignmentPercentage > 50 ? 'text-red-400' : 'text-green-400'}`}>
                      {politician.consistency.lobbyistAlignmentPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Individual contributions</span>
                    <span className="text-white font-medium">{formatMoney(displayFinance.individualDonations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400" title="Money from PACs' own treasuries. Conduit-bundled small-dollar money (e.g. ActBlue) is reported as individual contributions, not PAC money.">
                      PAC contributions
                    </span>
                    <span className={`font-medium ${displayFinance.pacDonations > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {displayFinance.pacDonations > 0 ? formatMoney(displayFinance.pacDonations) : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Lobbying organizations</span>
                    <span className={`font-medium ${lobbyOrgTotal > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {lobbyOrgTotal > 0 ? formatMoney(lobbyOrgTotal) : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stock Trades</span>
                    <span className={`font-medium ${displayStockTrades.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {displayStockTrades.length > 0 ? `${displayStockTrades.length} trades` : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">High Review-Priority Trades</span>
                    <span className={`font-medium ${highConflictTrades.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {highConflictTrades.length > 0 ? `${highConflictTrades.length} detected` : 'None'}
                    </span>
                  </div>
                  {fecEntry && (
                    <p className="text-[10px] text-gray-600 pt-2 border-t border-white/[0.06]">
                      Individual &amp; PAC contributions from OpenFEC (Tier 1), {fecEntry.electionYear} cycle
                      {fecEntry.coverageEnd ? `, coverage through ${fecEntry.coverageEnd}` : ''}. Checked {fecEntry.asOf}.
                    </p>
                  )}
                </div>
                )}
              </div>

              <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
                <h2 className="text-white font-bold mb-3">Compare with Others</h2>
                <p className="text-gray-400 text-sm mb-3">See how this politician compares side-by-side</p>
                <Link
                  href={`/compare?a=${politician.id}`}
                  className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Start Comparison
                </Link>
              </div>
            </div>
          </div>
          {!isLightweight && !isExecutive && displayVotes.length > 0 && (
            <PublicActionsAccordion
              votes={displayVotes}
              finance={displayFinance}
              isFeatured={isFeatured}
            />
          )}
          {!isLightweight && isExecutive && politician.executiveActions && politician.executiveActions.length > 0 && (
            <div className="mt-6 rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-1">Recent Executive Actions</h2>
              <p className="text-gray-500 text-xs mb-4">Sourced orders, nominations, and international actions — open the Executive Actions tab for the full list</p>
              <ExecutiveActions actions={politician.executiveActions.slice(0, 3)} name={politician.name} />
            </div>
          )}
          {recordJuxtapositions.length > 0 && (
            <RelatedOfficialRecords juxtapositions={recordJuxtapositions} name={politician.name} />
          )}
          </>
        )}

        {activeTab === 'votes' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-white font-bold">Voting Record</h2>
              {usingOfficialVotes && congressEntry && (
                <SourceBadge source={congressEntry.source} size="xs" />
              )}
              <SourceTierHelp />
            </div>
            {isLightweight ? (
              <MissingRecordPanel kind="the roll-call voting record" />
            ) : usingOfficialVotes ? (
              <VotingRecord
                votes={displayVotes}
                officialSource
                finance={displayFinance}
                isFeatured={isFeatured}
              />
            ) : JUDICIAL_CHAMBERS.includes(politician.chamber) ? (
              <div className="rounded-xl p-8 border border-white/[0.07] text-center" style={{ background: 'rgba(11,25,41,0.6)' }}>
                <Vote className="h-10 w-10 text-[#c8a951]/40 mx-auto mb-3" />
                <p className="text-white/60 text-sm font-medium">No legislative voting record</p>
                <p className="text-white/35 text-xs mt-1 max-w-md mx-auto leading-relaxed">
                  Supreme Court justices are appointed, not elected; they do not cast roll-call votes in Congress.
                  Published opinions and appointment records are listed under Overview → key issues with sourced evidence.
                </p>
              </div>
            ) : politician.chamber === 'governor' ? (
              <VotingRecord votes={[]} />
            ) : (
              <MissingRecordPanel
                kind={
                  politician.chamber === 'senate'
                    ? 'recent Senate roll-call votes from senate.gov'
                    : 'recent House roll-call votes from Congress.gov'
                }
              />
            )}
          </div>
        )}

        {activeTab === 'executive-actions' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-white font-bold">Executive Actions</h2>
              <SourceTierHelp />
            </div>
            <ExecutiveActions actions={politician.executiveActions ?? []} name={politician.name} />
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-4">Campaign Finance & Donors</h2>
            {isLightweight ? <MissingRecordPanel kind="campaign finance data" /> : <DonorChart finance={displayFinance} fecEntry={fecEntry} />}
          </div>
        )}

        {activeTab === 'stocks' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-4">Stock Trade Disclosures</h2>
            {isLightweight ? (
              <MissingRecordPanel kind="STOCK Act trade disclosures" />
            ) : (
              <StockTrades
                trades={displayStockTrades}
                name={politician.name}
                usingOfficialTrades={usingOfficialTrades}
                officialSource={stockEntry?.source}
                demoTradeCount={demoTradeCount}
              />
            )}
          </div>
        )}

        {activeTab === 'consistency' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-1">Track Record — Statements vs. Official Actions</h2>
            <p className="text-gray-500 text-xs mb-4">
              Statements and platform positions paired with the official record — votes, signatures, and executive
              actions — shown as a neutral, dated factual diff.
            </p>
            {isLightweight ? (
              <MissingRecordPanel kind="statement-to-action consistency tracking" />
            ) : (
              <CredibilityConsistency
                data={politician.consistency}
                issues={politician.topIssues}
                name={politician.name}
              />
            )}
          </div>
        )}

        {activeTab === 'controversies' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-4">Controversies & Allegations</h2>
            {isLightweight ? <MissingRecordPanel kind="controversy records" /> : <ControversySection controversies={politician.controversies} name={politician.name} />}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-4">News & Coverage</h2>
            {isLightweight ? <MissingRecordPanel kind="news coverage" /> : <ProfileNewsExplorer news={politician.news} name={politician.name} />}
          </div>
        )}

        {activeTab === 'endorsements' && (
          <EndorsementsTab politician={politician} />
        )}
      </div>
    </div>
  );
}
