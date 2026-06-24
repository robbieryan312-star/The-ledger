'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Landmark,
  ListChecks,
  Microscope,
  Quote,
  Users,
} from 'lucide-react';
import {
  getDominantParty,
  getTotalSpending,
  mockLobbyingGroups,
} from '@/lib/data/mockLobbyingGroups';
import SourceBadge from '@/components/ui/SourceBadge';
import SourceProvenance from '@/components/ui/SourceProvenance';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'spending', label: 'Spending & Recipients', icon: DollarSign },
  { id: 'issues', label: 'Issues/Bills', icon: Landmark },
  { id: 'sources', label: 'Sources', icon: FileText },
] as const;

type TabId = (typeof tabs)[number]['id'];

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

function PartyPill({ party }: { party: string }) {
  const cls =
    party === 'D' || party === 'Democratic'
      ? 'bg-blue-400/12 text-blue-300 border-blue-400/20'
      : party === 'R' || party === 'Republican'
        ? 'bg-red-400/12 text-red-300 border-red-400/20'
        : 'bg-gray-400/12 text-gray-300 border-gray-400/20';

  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{party}</span>;
}

function RecordNotice({ caveat }: { caveat: string }) {
  return (
    <div className="rounded-xl p-4 border border-blue-400/20 mb-6 flex items-start gap-3" style={{ background: 'rgba(59,130,246,0.08)' }}>
      <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-blue-100/80 text-sm leading-relaxed">{caveat}</p>
    </div>
  );
}

function PartyDistribution({ group }: { group: (typeof mockLobbyingGroups)[number] }) {
  return (
    <div className="space-y-3">
      {group.spendingByParty.parties.map((party) => (
        <div key={party.party}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/50">{party.party}</span>
            <span className="text-white">{formatMoney(party.amount)} · {party.percentage}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-white/[0.06]">
            <div
              className={
                party.party === 'Democratic'
                  ? 'h-full bg-blue-400'
                  : party.party === 'Republican'
                    ? 'h-full bg-red-400'
                    : 'h-full bg-gray-400'
              }
              style={{ width: `${party.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatedAgenda({
  agenda,
}: {
  agenda: NonNullable<(typeof mockLobbyingGroups)[number]['statedAgenda']>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <h2 className="text-white font-bold flex items-center gap-2">
          <Quote className="h-4 w-4 text-[#d4ac52]" /> In their own words — stated agenda
        </h2>
        {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
      </button>
      {open && (
        <div className="mt-3">
          <p className="text-white/40 text-xs leading-relaxed mb-3">{agenda.intro}</p>
          <div className="space-y-2.5">
            {agenda.claims.map((claim, i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(5,9,15,0.38)' }}>
                <p className="text-white/70 text-sm leading-relaxed italic">{claim.text}</p>
                <div className="mt-2">
                  <SourceProvenance source={claim.source} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LobbyingGroupProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const group = mockLobbyingGroups.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!group) return notFound();

  const totalSpending = getTotalSpending(group);
  const dominantParty = getDominantParty(group);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/lobbying" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Lobbying Groups
      </Link>

      <div
        className="rounded-2xl border border-white/[0.08] p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(15,34,54,0.92) 0%, rgba(11,25,41,0.92) 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 100% at 0% 50%, rgba(212,172,82,0.16) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col md:flex-row gap-5">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/[0.1]" style={{ background: 'rgba(212,172,82,0.12)' }}>
            <Building2 className="h-14 w-14 text-[#d4ac52]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{group.shortName}</h1>
              <span className="text-xs bg-[#d4ac52]/15 text-[#d4ac52] border border-[#d4ac52]/25 px-2.5 py-1 rounded-full font-medium tracking-wide">
                Policy area: {group.category.replaceAll('-', ' ')}
              </span>
            </div>
            <div className="text-white/55 text-sm mb-3">{group.name}</div>
            <p className="text-white/50 text-sm leading-relaxed max-w-3xl">{group.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={group.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#1e3a5f] rounded-lg px-2 py-1 hover:border-white transition-colors">
                <Globe className="h-3 w-3" /> Website
              </a>
              {group.sources.slice(0, 3).map((source) => (
                <SourceBadge key={source.name} source={source} showName />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:min-w-[170px]">
            <div className="rounded-xl p-3 border border-white/[0.07] text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
              <div className="text-2xl font-bold text-[#d4ac52]">{formatMoney(totalSpending)}</div>
              <div className="text-xs text-white/40">{group.spendingByParty.cycle} demo records</div>
            </div>
            <div className="rounded-xl p-3 border border-white/[0.07] text-center" style={{ background: 'rgba(5,9,15,0.5)' }}>
              <div className="text-2xl font-bold text-white">{dominantParty.percentage}%</div>
              <div className="text-xs text-white/40">Largest party share</div>
            </div>
          </div>
        </div>
      </div>

      <RecordNotice caveat={group.caveat} />

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
              style={
                activeTab === tab.id
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

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
          {group.statedAgenda && <StatedAgenda agenda={group.statedAgenda} />}
          <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-1 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[#d4ac52]" /> Stated Platform Sections
            </h2>
            <p className="text-white/35 text-xs mb-4">Summaries below describe stated advocacy areas and linked records, not editorial judgments.</p>
            <div className="space-y-3">
              {group.stanceSections.map((section) => (
                <div key={section.title} className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(5,9,15,0.38)' }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-medium">{section.title}</h3>
                    <SourceBadge source={section.source} />
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{section.summary}</p>
                </div>
              ))}
            </div>
          </div>
          {group.historyTimeline && group.historyTimeline.length > 0 && (
            <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#d4ac52]" /> Timeline
              </h2>
              <div className="space-y-4">
                {group.historyTimeline.map((event) => (
                  <div key={`${event.year}-${event.title}`} className="grid grid-cols-[82px_1fr] gap-4">
                    <div className="text-[#d4ac52] font-bold text-sm">{event.year}</div>
                    <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(5,9,15,0.38)' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-white font-medium">{event.title}</h3>
                        <SourceBadge source={event.source} />
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed">{event.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          {group.researchContext && group.researchContext.length > 0 && (
            <div className="rounded-xl p-5 border border-white/[0.08] lg:col-span-2" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-1 flex items-center gap-2">
                <Microscope className="h-4 w-4 text-[#d4ac52]" /> Independent research context
              </h2>
              <p className="text-white/35 text-xs mb-4">
                Nonpartisan survey and research summaries for background — not advocacy positions. Each item is dated and tier-labeled.
              </p>
              <div className="space-y-3">
                {group.researchContext.map((item) => (
                  <div key={item.topic} className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(5,9,15,0.38)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <h3 className="text-white font-medium text-sm">{item.topic}</h3>
                      <span className="text-[10px] text-white/30">as of {item.asOf}</span>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed mb-3">{item.summary}</p>
                    <SourceProvenance
                      source={item.source}
                      recordDate={item.recordDate}
                      asOf={item.asOf}
                      showCompleteness={false}
                    />
                    {item.relevanceNote && (
                      <p className="text-white/30 text-xs mt-2 border-l-2 border-white/[0.06] pl-3">{item.relevanceNote}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-3">At a Glance</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Status</span>
                  <span className="text-white text-right">{group.currentStatus}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Record type</span>
                  <span className="text-white text-right">{group.spendingByParty.recordType}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Data level</span>
                  <span className="text-[#d4ac52]">{group.dataCompleteness.level}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Last updated</span>
                  <span className="text-white">{group.dataCompleteness.lastUpdated}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-3">Issue Focus</h2>
              <div className="flex flex-wrap gap-2">
                {group.issueFocus.map((issue) => (
                  <span key={issue} className="text-xs text-[#d4ac52] bg-[#d4ac52]/10 border border-[#d4ac52]/15 rounded-full px-2 py-1">
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            {group.registrations && group.registrations.length > 0 && (
              <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
                <h2 className="text-white font-bold mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#d4ac52]" /> Registrations
                </h2>
                <p className="text-white/35 text-xs mb-3">What kind of organization this is, by its official filings — not a functional label.</p>
                <div className="space-y-3">
                  {group.registrations.map((reg) => (
                    <div key={reg.type} className="rounded-lg border border-white/[0.06] p-3" style={{ background: 'rgba(5,9,15,0.38)' }}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{reg.type}</span>
                        <SourceBadge source={reg.source} />
                      </div>
                      <div className="text-[#d4ac52] text-xs mb-1">{reg.status}</div>
                      <p className="text-white/45 text-xs leading-relaxed">{reg.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'spending' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <h2 className="text-white font-bold mb-1">Party Support Distribution</h2>
              <p className="text-white/35 text-xs mb-2">{group.spendingByParty.disclosureNote}</p>
              <p className="text-white/30 text-xs mb-5 leading-relaxed border-l-2 border-[#d4ac52]/20 pl-3">
                <span className="text-white/40 font-medium">Methodology: </span>
                {group.spendingByParty.methodologyNote}
              </p>
              <PartyDistribution group={group} />
            </div>

            <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <div className="px-5 py-4 border-b border-white/[0.07] bg-[#05090f]/35">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#d4ac52]" /> Top Recipients / Record Buckets
                </h2>
                <p className="text-white/35 text-xs mt-1">Aggregate spending categories from disclosure records — not individual member line items.</p>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {group.topRecipients.map((recipient) => (
                  <div key={recipient.name} className="px-5 py-4 grid grid-cols-[1fr_auto] gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{recipient.name}</span>
                        <PartyPill party={recipient.party} />
                      </div>
                      <div className="text-white/35 text-xs">{recipient.office} · {recipient.recordType} · {recipient.cycle}</div>
                      <p className="text-white/35 text-xs mt-1">{recipient.sourceNote}</p>
                    </div>
                    <div className="text-right text-[#d4ac52] font-bold">{formatMoney(recipient.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <div className="px-5 py-4 border-b border-white/[0.07] bg-[#05090f]/35">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-[#d4ac52]" /> Federal Recipients
              </h2>
              <p className="text-white/35 text-xs mt-1 leading-relaxed">
                Recipients and roll-call positions on selected legislation — sourced records. Demo-flagged amounts are illustrative until live FEC imports replace them.
              </p>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {group.federalRecipients.map((recipient) => (
                <div key={recipient.politicianId} className="px-5 py-4 grid grid-cols-[1fr_auto] gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/politicians/${recipient.politicianId}`} className="text-white font-medium hover:text-[#d4ac52] transition-colors">
                        {recipient.name}
                      </Link>
                      <PartyPill party={recipient.party} />
                      {recipient.isDemo && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-300/80 border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          Demo
                        </span>
                      )}
                    </div>
                    <div className="text-white/35 text-xs">{recipient.office} · {recipient.recordType} · {recipient.cycle}</div>
                    <p className="text-white/35 text-xs mt-1">{recipient.sourceNote}</p>
                  </div>
                  <div className="text-right text-[#d4ac52] font-bold">{recipient.amount > 0 ? formatMoney(recipient.amount) : '$0'}</div>
                </div>
              ))}
            </div>
          </div>

          {group.relatedVotes.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(11,25,41,0.7)' }}>
              <div className="px-5 py-4 border-b border-white/[0.07] bg-[#05090f]/35">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#d4ac52]" /> Related Votes
                </h2>
                <p className="text-white/35 text-xs mt-1">Bills the group publicly tracked or lobbied on, paired with how linked federal recipients voted — factual Yea/Nay records with dates.</p>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {group.relatedVotes.map((bill) => (
                  <div key={`${bill.billId}-${bill.cycle}`} className="px-5 py-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-white font-medium">{bill.billTitle}</h3>
                          <span className="text-xs text-[#d4ac52] border border-[#d4ac52]/20 bg-[#d4ac52]/10 rounded-full px-2 py-0.5">
                            {bill.groupPositionLabel}
                          </span>
                        </div>
                        <div className="text-white/35 text-xs mb-2">
                          {bill.billId} · {bill.chamber} · {bill.cycle}
                        </div>
                        {bill.disclosureNote && <p className="text-white/35 text-xs leading-relaxed">{bill.disclosureNote}</p>}
                      </div>
                      <a
                        href={bill.congressGovUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-[#1e3a5f] rounded-lg px-2 py-1 hover:border-white transition-colors flex-shrink-0"
                      >
                        Congress.gov <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(5,9,15,0.38)' }}>
                      <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wide text-white/30 border-b border-white/[0.06]">
                        <span>Recipient</span>
                        <span>Vote</span>
                        <span>Date</span>
                      </div>
                      {bill.recipientVotes.map((rv) => {
                        const recipientMeta = group.federalRecipients.find((r) => r.politicianId === rv.politicianId);
                        const voteCls =
                          rv.vote === 'Yea'
                            ? 'text-green-400'
                            : rv.vote === 'Nay'
                              ? 'text-red-400'
                              : 'text-gray-400';
                        return (
                          <div key={`${bill.billId}-${rv.politicianId}`} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 items-center text-sm">
                            <div>
                              <Link href={`/politicians/${rv.politicianId}`} className="text-white hover:text-[#d4ac52] transition-colors">
                                {recipientMeta?.name ?? rv.politicianId}
                              </Link>
                              {rv.isDemo && (
                                <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-300/70">demo</span>
                              )}
                              {rv.note && <p className="text-white/30 text-xs mt-0.5">{rv.note}</p>}
                            </div>
                            <span className={`font-bold ${voteCls}`}>{rv.vote}</span>
                            <span className="text-white/40 text-xs">{rv.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="rounded-xl p-5 border border-white/[0.08]" style={{ background: 'rgba(11,25,41,0.7)' }}>
          <h2 className="text-white font-bold mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#d4ac52]" /> Issues & Bills
          </h2>
          <p className="text-white/35 text-xs mb-4">Bills are linked as official records where possible; issue-only rows use organization materials or disclosure sources.</p>
          <div className="space-y-3">
            {group.promotedBillsIssues.map((item) => (
              <div key={`${item.title}-${item.positionLabel}`} className="rounded-xl border border-white/[0.06] p-4" style={{ background: 'rgba(5,9,15,0.38)' }}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{item.title}</h3>
                      <span className="text-xs text-[#d4ac52] border border-[#d4ac52]/20 bg-[#d4ac52]/10 rounded-full px-2 py-0.5">
                        {item.positionLabel}
                      </span>
                    </div>
                    <div className="text-white/35 text-xs mb-2">
                      {[item.billId, item.chamber, item.cycle].filter(Boolean).join(' · ') || 'Issue record'}
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed">{item.summary}</p>
                  </div>
                  <SourceBadge source={item.source} showName />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="rounded-xl border border-white/[0.08] overflow-hidden" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <div className="px-5 py-4 border-b border-white/[0.07] bg-[#05090f]/35">
              <h2 className="text-white font-bold">Sources</h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {group.sources.map((source) => (
                <a
                  key={`${source.name}-${source.url}`}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {source.name}
                        <ExternalLink className="h-3.5 w-3.5 text-white/25" />
                      </div>
                      <div className="text-white/35 text-xs mt-0.5">{source.sourceType.replaceAll('-', ' ')}</div>
                      {source.description && <p className="text-white/45 text-sm mt-2 leading-relaxed">{source.description}</p>}
                    </div>
                    <SourceBadge source={source} />
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-5 border border-white/[0.08] h-fit" style={{ background: 'rgba(11,25,41,0.7)' }}>
            <h2 className="text-white font-bold mb-3">Data Completeness</h2>
            <div className="text-sm text-white/50 mb-3">
              <span className="text-[#d4ac52] font-medium">{group.dataCompleteness.level}</span> · updated {group.dataCompleteness.lastUpdated}
            </div>
            <div className="space-y-2">
              {group.dataCompleteness.notes.map((note) => (
                <div key={note} className="text-sm text-white/45 leading-relaxed border-l-2 border-[#d4ac52]/25 pl-3">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
