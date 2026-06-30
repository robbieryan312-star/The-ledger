'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import type { ProfileRecordByTopic, TopicRecordGroup } from '@/lib/data/profileRecordByTopic';
import type { MemberDeepBill, MemberDeepProfile } from '@/lib/data/memberDeep';
import { getTopicPositions } from '@/lib/data/topicPositions';
import { buildTopicConsistencyTimeline } from '@/lib/data/buildTopicConsistencyTimeline';
import type { OrgVoteTopicLink } from '@/lib/data/buildOrgVoteTopicLinks';
import { recordTopicLabel } from '@/lib/data/profileRecordByTopic';
import SourceBadge from '@/components/ui/SourceBadge';
import ExpandableQuoteBlock from '@/components/ui/ExpandableQuoteBlock';

function voteSplitSummary(group: TopicRecordGroup): string {
  const parts: string[] = [];
  if (group.voteSplit.yea > 0) parts.push(`${group.voteSplit.yea} Yea`);
  if (group.voteSplit.nay > 0) parts.push(`${group.voteSplit.nay} Nay`);
  if (group.voteSplit.notVoting > 0) parts.push(`${group.voteSplit.notVoting} Not Voting`);
  if (group.voteSplit.present > 0) parts.push(`${group.voteSplit.present} Present`);
  return parts.join(' · ');
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncateTitle(title: string, max = 80): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function LegislationBillRow({ bill, label }: { bill: MemberDeepBill; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[#c8a951] font-medium">{label}</span>
          {bill.billNumber && <span className="text-gray-500">{bill.billNumber}</span>}
          {bill.introducedDate && (
            <span className="text-gray-500">{formatShortDate(bill.introducedDate)}</span>
          )}
          <SourceBadge
            source={{
              name: 'Congress.gov',
              url: bill.url,
              tier: bill.tier,
              date: bill.introducedDate,
            }}
          />
        </div>
        <p className="text-gray-300 leading-snug mt-0.5 line-clamp-2">{bill.title}</p>
        {bill.latestAction && (
          <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-1">{bill.latestAction}</p>
        )}
        <Link
          href={bill.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white mt-1 transition-colors"
        >
          Congress.gov <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function TopicGroupRow({
  group,
  bioguideId,
  memberDeep,
  politicianId,
  orgVoteLinks,
}: {
  group: TopicRecordGroup;
  bioguideId?: string;
  memberDeep?: MemberDeepProfile | null;
  politicianId?: string;
  orgVoteLinks?: OrgVoteTopicLink[];
}) {
  const [open, setOpen] = useState(false);
  const [showLegislation, setShowLegislation] = useState(false);
  const topicPositions = bioguideId ? getTopicPositions(bioguideId, group.topicId) : null;
  const deepTopic = memberDeep?.byTopic[group.topicId];
  const deepSponsored = deepTopic?.sponsored ?? [];
  const deepCosponsored = deepTopic?.cosponsored ?? [];
  const deepSponsoredCount = deepSponsored.length;
  const deepCosponsoredCount = deepCosponsored.length;

  const voteExamples = group.examples.filter((ex) => ex.role === 'vote');
  const sponsorExamples = group.examples.filter((ex) => ex.role === 'sponsor');

  const additionalBills: Array<{
    title: string;
    billNumber: string;
    date: string;
    url: string;
    tier: 'official';
  }> = [];

  const hasStatedPosition = Boolean(topicPositions?.statedPosition);
  const hasStatements = (topicPositions?.statements.length ?? 0) > 0;
  const platformPositions = topicPositions?.platformPositions ?? [];
  const hasPlatformPositions = platformPositions.length > 0;
  const hasStatedBlock = hasStatedPosition || hasStatements || hasPlatformPositions;

  const legislationBillCount = deepSponsoredCount + deepCosponsoredCount;
  const hasLegislation =
    legislationBillCount > 0 ||
    sponsorExamples.length > 0 ||
    additionalBills.length > 0;

  const topicOrgLinks = orgVoteLinks?.filter((l) => l.orgTopicId === group.topicId) ?? [];
  const timeline =
    bioguideId && politicianId && topicPositions
      ? buildTopicConsistencyTimeline(bioguideId, group.topicId, topicPositions, politicianId)
      : [];
  const hasTimeline = timeline.length >= 2;

  const hasExpandable =
    voteExamples.length > 0 || hasStatedBlock || hasLegislation || topicOrgLinks.length > 0 || hasTimeline;

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0a1628]/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-[#c8a951] flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold">{group.topicName}</div>
          <div className="text-gray-400 text-xs mt-0.5">
            {group.voteCount > 0 && (
              <span>
                {group.voteCount} roll-call{group.voteCount === 1 ? '' : 's'}
                {voteSplitSummary(group) ? ` · ${voteSplitSummary(group)}` : ''}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && hasExpandable && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          {hasStatedBlock && topicPositions && (
            <div className="text-xs space-y-3">
              {hasStatedPosition && (
                <div>
                  <div className="text-white font-semibold mb-1">Stated position</div>
                  <ExpandableQuoteBlock
                    summary={topicPositions.statedPosition!.split(/(?<=[.!?])\s+/)[0] ?? topicPositions.statedPosition!}
                    fullText={topicPositions.statedPosition!}
                  />
                  {topicPositions.statedPositionSource && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SourceBadge
                        source={{
                          name: topicPositions.statedPositionSource.source,
                          url: topicPositions.statedPositionSource.url,
                          tier: topicPositions.statedPositionSource.tier,
                        }}
                      />
                      <Link
                        href={topicPositions.statedPositionSource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                      >
                        {topicPositions.statedPositionSource.source}{' '}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {!hasStatedPosition && hasPlatformPositions && (
                <div>
                  <div className="text-white font-semibold mb-1">Platform position</div>
                  {platformPositions.map((pos, idx) => (
                    <div key={idx} className={idx > 0 ? 'mt-3' : ''}>
                      <ExpandableQuoteBlock
                        summary={pos.text.split(/(?<=[.!?])\s+/)[0] ?? pos.text}
                        fullText={pos.text}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SourceBadge
                          source={{
                            name: pos.source,
                            url: pos.url,
                            tier: pos.tier,
                            date: pos.asOf,
                          }}
                        />
                        <Link
                          href={pos.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                        >
                          {pos.source} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasStatedPosition && !hasPlatformPositions && hasStatements && (
                <div>
                  <div className="text-white font-semibold mb-1">Stated position</div>
                  {topicPositions.statements.map((statement, idx) => (
                    <div key={idx} className="flex items-start gap-2 mt-2">
                      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-gray-500">{formatShortDate(statement.date)}</span>
                          <SourceBadge
                            source={{
                              name: 'Congressional Record',
                              url: statement.url,
                              tier: statement.tier,
                              date: statement.date,
                            }}
                          />
                        </div>
                        <ExpandableQuoteBlock
                          summary={statement.title.split(/(?<=[.!?])\s+/)[0] ?? statement.title}
                          fullText={statement.title}
                          verbatim={statement.tier === 'official' || statement.tier === 'media'}
                        />
                        <Link
                          href={statement.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors mt-1 text-[11px]"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {voteExamples.length > 0 && (
            <div className="text-xs space-y-3">
              <div className="text-gray-500 text-[11px] font-medium">How they voted</div>
              {voteExamples.map((ex, i) => (
                <div key={i} className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {ex.vote && (
                        <span
                          className={`font-bold ${
                            ex.vote === 'Yea'
                              ? 'text-green-400'
                              : ex.vote === 'Nay'
                                ? 'text-red-400'
                                : 'text-gray-400'
                          }`}
                        >
                          {ex.vote}
                        </span>
                      )}
                      {ex.billNumber && (
                        <span className="text-gray-500">{ex.billNumber}</span>
                      )}
                      <span className="text-gray-500">{formatShortDate(ex.date)}</span>
                    </div>
                    <div className="mt-0.5">
                      <ExpandableQuoteBlock
                        summary={
                          ex.billSummary?.split(/(?<=[.!?])\s+/)[0] ??
                          ex.title.split(/(?<=[.!?])\s+/)[0] ??
                          ex.title
                        }
                        fullText={ex.billSummary ?? ex.title}
                      />
                    </div>
                    <Link
                      href={ex.congressGovUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white mt-1 transition-colors"
                    >
                      Congress.gov <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {topicOrgLinks.length > 0 && (
            <div className="text-xs space-y-2 border-t border-white/[0.06] pt-3">
              <div className="text-gray-500 text-[11px] font-medium">
                PAC/committee receipts and roll-call votes on the same topic
              </div>
              {topicOrgLinks.slice(0, 3).map((link, i) => (
                <div key={i} className="rounded border border-white/[0.06] bg-[#0a1628]/40 px-3 py-2">
                  <p className="text-gray-200 leading-snug">
                    {link.orgName} — ${link.totalAmount.toLocaleString()} ({link.receiptCount} receipt
                    {link.receiptCount === 1 ? '' : 's'}) · roll-call {link.voteChoice} on{' '}
                    {formatShortDate(link.voteDate)} — {truncateTitle(link.billTitle, 60)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <SourceBadge
                      source={{
                        name: 'Federal Election Commission (OpenFEC)',
                        url: 'https://www.fec.gov/data/',
                        tier: 'official',
                      }}
                      size="xs"
                    />
                    <Link
                      href={link.voteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white transition-colors"
                    >
                      Congress.gov <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasTimeline && (
            <div className="text-xs space-y-2 border-t border-white/[0.06] pt-3">
              <div className="text-gray-500 text-[11px] font-medium">Topic record timeline</div>
              <ul className="space-y-2 list-none pl-0">
                {timeline.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-gray-300 leading-snug">
                    <span className="text-gray-500 flex-shrink-0">{formatShortDate(bullet.date)}</span>
                    <span className="text-[#c8a951] flex-shrink-0">{bullet.kind}</span>
                    <span className="flex-1 min-w-0">{truncateTitle(bullet.claim, 120)}</span>
                    <span className="text-gray-500 flex-shrink-0 hidden sm:inline">
                      {bullet.sourceName}, {bullet.tier}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasLegislation && (
            <div className="text-xs border-t border-white/[0.06] pt-3">
              <button
                type="button"
                onClick={() => setShowLegislation((v) => !v)}
                className="text-[#c8a951] hover:text-white transition-colors text-[11px] font-medium"
              >
                {showLegislation
                  ? `Hide proposed legislation (${legislationBillCount} bills ↑)`
                  : `Show proposed legislation (${legislationBillCount} bills ↓)`}
              </button>

              {showLegislation && (
                <div className="mt-3 space-y-3">
                  <div className="text-gray-500 text-[11px] font-medium">Proposed legislation</div>

                  {sponsorExamples.map((ex, i) => (
                    <div key={`sp-${i}`} className="flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[#c8a951] font-medium">Sponsored</span>
                          {ex.billNumber && (
                            <span className="text-gray-500">{ex.billNumber}</span>
                          )}
                          <span className="text-gray-500">{formatShortDate(ex.date)}</span>
                        </div>
                        <p className="text-gray-300 leading-snug mt-0.5 line-clamp-2">{ex.title}</p>
                        <Link
                          href={ex.congressGovUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white mt-1 transition-colors"
                        >
                          Congress.gov <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}

                  {memberDeep &&
                    deepSponsored.slice(0, 5).map((bill, idx) => (
                      <LegislationBillRow key={`s-${idx}`} bill={bill} label="Sponsored" />
                    ))}
                  {memberDeep &&
                    deepCosponsored.slice(0, 5).map((bill, idx) => (
                      <LegislationBillRow key={`c-${idx}`} bill={bill} label="Cosponsored" />
                    ))}

                  {additionalBills.map((bill, idx) => (
                    <div key={`ab-${idx}`} className="flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {bill.billNumber && (
                            <span className="text-gray-500">{bill.billNumber}</span>
                          )}
                          <span className="text-gray-500">{formatShortDate(bill.date)}</span>
                          <SourceBadge
                            source={{
                              name: 'Congress.gov',
                              url: bill.url,
                              tier: bill.tier,
                              date: bill.date,
                            }}
                          />
                        </div>
                        <p className="text-gray-300 leading-snug mt-0.5 line-clamp-2">{bill.title}</p>
                        <Link
                          href={bill.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#c8a951] hover:text-white mt-1 transition-colors"
                        >
                          Congress.gov <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}

                  {memberDeep && (deepSponsoredCount > 5 || deepCosponsoredCount > 5) && (
                    <p className="text-gray-600 text-[10px]">
                      Showing up to 5 sponsored and 5 cosponsored bills per topic. Full record:{' '}
                      {legislationBillCount} bills as of {memberDeep.meta.asOf}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileRecordByTopicPanel({
  record,
  bioguideId,
  memberDeep,
  politicianId,
  orgVoteLinks,
}: {
  record: ProfileRecordByTopic;
  bioguideId?: string;
  memberDeep?: MemberDeepProfile | null;
  politicianId?: string;
  orgVoteLinks?: OrgVoteTopicLink[];
}) {
  const deepSponsoredTotal = memberDeep?.meta.totalSponsored ?? 0;
  const deepCosponsoredTotal = memberDeep?.meta.totalCosponsored ?? 0;

  return (
    <div
      className="rounded-xl border border-white/[0.08] p-5 mb-6"
      style={{ background: 'rgba(11,25,41,0.7)' }}
    >
      <h2 className="text-white font-bold mb-1">Where they stand — by the record</h2>
      <p className="text-gray-500 text-xs mb-4 leading-relaxed">
        Roll-call votes and sponsored bills from official congressional records
        {memberDeep
          ? ` (${deepSponsoredTotal} sponsored · ${deepCosponsoredTotal} cosponsored via Congress.gov)`
          : ''}
        ; platform positions from Ballotpedia where available.
      </p>
      <div className="space-y-2">
        {record.topics.map((group) => (
          <TopicGroupRow
            key={group.topicId}
            group={group}
            bioguideId={bioguideId}
            memberDeep={memberDeep}
            politicianId={politicianId}
            orgVoteLinks={orgVoteLinks}
          />
        ))}
        {memberDeep &&
          RECORD_TOPIC_IDS_ONLY_IN_DEEP(memberDeep, record).map((topicId) => {
            const block = memberDeep.byTopic[topicId];
            if (!block || (block.sponsored.length === 0 && block.cosponsored.length === 0)) {
              return null;
            }
            const label = recordTopicLabel(topicId);
            return (
              <TopicGroupRow
                key={topicId}
                group={{
                  topicId,
                  topicName: label,
                  voteCount: 0,
                  voteSplit: { yea: 0, nay: 0, notVoting: 0, present: 0 },
                  sponsoredCount: block.sponsored.length,
                  examples: [],
                }}
                bioguideId={bioguideId}
                memberDeep={memberDeep}
                politicianId={politicianId}
                orgVoteLinks={orgVoteLinks}
              />
            );
          })}
      </div>
      <p className="text-gray-600 text-[10px] mt-3">
        Record as of {memberDeep?.meta.asOf ?? record.asOf}. {record.totalVotes} integrated roll-call vote
        {record.totalVotes === 1 ? '' : 's'}
        {deepSponsoredTotal > 0
          ? ` · ${deepSponsoredTotal} sponsored bill${deepSponsoredTotal === 1 ? '' : 's'} (Congress.gov)`
          : record.totalSponsored > 0
            ? ` · ${record.totalSponsored} sponsored bill${record.totalSponsored === 1 ? '' : 's'} in bill feed`
            : ''}
        {deepCosponsoredTotal > 0
          ? ` · ${deepCosponsoredTotal} cosponsored bill${deepCosponsoredTotal === 1 ? '' : 's'} (Congress.gov)`
          : ''}
        .
      </p>
    </div>
  );
}

function RECORD_TOPIC_IDS_ONLY_IN_DEEP(
  memberDeep: MemberDeepProfile,
  record: ProfileRecordByTopic,
): string[] {
  const inRecord = new Set(record.topics.map((t) => t.topicId));
  return Object.entries(memberDeep.meta.topicCoverage)
    .filter(([topicId, count]) => count > 0 && !inRecord.has(topicId))
    .map(([topicId]) => topicId);
}
