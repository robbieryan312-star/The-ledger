'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink, FileText } from 'lucide-react';
import type { ProfileRecordByTopic, TopicRecordGroup } from '@/lib/data/profileRecordByTopic';
import type { MemberDeepBill, MemberDeepProfile } from '@/lib/data/memberDeep';
import { getTopicPositions } from '@/lib/data/topicPositions';
import SourceBadge from '@/components/ui/SourceBadge';

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
}: {
  group: TopicRecordGroup;
  bioguideId?: string;
  memberDeep?: MemberDeepProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const topicPositions = bioguideId ? getTopicPositions(bioguideId, group.topicId) : null;
  const deepTopic = memberDeep?.byTopic[group.topicId];
  const deepSponsored = deepTopic?.sponsored ?? [];
  const deepCosponsored = deepTopic?.cosponsored ?? [];
  const deepSponsoredCount = deepSponsored.length;
  const deepCosponsoredCount = deepCosponsored.length;

  const exampleBillKeys = new Set(
    group.examples
      .map((ex) => (ex.billNumber ?? ex.title).toLowerCase().trim())
      .filter(Boolean),
  );
  const additionalBills =
    topicPositions?.bills.filter((bill) => {
      const key = (bill.billNumber || bill.title).toLowerCase().trim();
      return key && !exampleBillKeys.has(key);
    }) ?? [];

  const hasOnTheRecord =
    Boolean(topicPositions?.statedPosition) ||
    (topicPositions?.statements.length ?? 0) > 0 ||
    additionalBills.length > 0;

  const hasLegislation = deepSponsoredCount > 0 || deepCosponsoredCount > 0;
  const hasExpandable = group.examples.length > 0 || hasOnTheRecord || hasLegislation;
  const displaySponsoredCount = Math.max(group.sponsoredCount, deepSponsoredCount);

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
            {group.voteCount > 0 && displaySponsoredCount > 0 && <span> · </span>}
            {displaySponsoredCount > 0 && (
              <span>
                {displaySponsoredCount} sponsored bill{displaySponsoredCount === 1 ? '' : 's'}
              </span>
            )}
            {displaySponsoredCount > 0 && deepCosponsoredCount > 0 && <span> · </span>}
            {deepCosponsoredCount > 0 && (
              <span>
                {deepCosponsoredCount} cosponsored bill{deepCosponsoredCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </button>

      {open && hasExpandable && (
        <div className="border-t border-white/[0.06] px-4 py-3 space-y-3">
          {group.examples.map((ex, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {ex.role === 'vote' && ex.vote && (
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
                  {ex.role === 'sponsor' && (
                    <span className="text-[#c8a951] font-medium">Sponsored</span>
                  )}
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

          {hasLegislation && memberDeep && (
            <div className="text-xs border-t border-white/[0.06] pt-3 space-y-3">
              <div className="text-gray-400 font-medium">Legislation — Congress.gov</div>
              {deepSponsored.slice(0, 5).map((bill, idx) => (
                <LegislationBillRow key={`s-${idx}`} bill={bill} label="Sponsored" />
              ))}
              {deepCosponsored.slice(0, 5).map((bill, idx) => (
                <LegislationBillRow key={`c-${idx}`} bill={bill} label="Cosponsored" />
              ))}
              {(deepSponsoredCount > 5 || deepCosponsoredCount > 5) && (
                <p className="text-gray-600 text-[10px]">
                  Showing up to 5 sponsored and 5 cosponsored bills per topic. Full record:{' '}
                  {deepSponsoredCount + deepCosponsoredCount} bills as of {memberDeep.meta.asOf}.
                </p>
              )}
            </div>
          )}

          {hasOnTheRecord && topicPositions && (
            <div className="text-xs border-t border-white/[0.06] pt-3 space-y-3">
              <div className="text-gray-400 font-medium">On The Record</div>

              {topicPositions.statedPosition && (
                <div>
                  <div className="text-gray-500 mb-1">Stated position</div>
                  <p className="text-gray-300 leading-relaxed">{topicPositions.statedPosition}</p>
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
                        VoteSmart <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {topicPositions.statements.map((statement, idx) => (
                <div key={idx} className="flex items-start gap-2">
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
                    <Link
                      href={statement.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-white mt-0.5 leading-snug transition-colors inline-flex items-start gap-1"
                    >
                      {truncateTitle(statement.title)} <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    </Link>
                  </div>
                </div>
              ))}

              {additionalBills.map((bill, idx) => (
                <div key={idx} className="flex items-start gap-2">
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
}: {
  record: ProfileRecordByTopic;
  bioguideId?: string;
  memberDeep?: MemberDeepProfile | null;
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
        ; stated positions from VoteSmart; Congressional Record statements from GovInfo.
      </p>
      <div className="space-y-2">
        {record.topics.map((group) => (
          <TopicGroupRow
            key={group.topicId}
            group={group}
            bioguideId={bioguideId}
            memberDeep={memberDeep}
          />
        ))}
        {memberDeep &&
          RECORD_TOPIC_IDS_ONLY_IN_DEEP(memberDeep, record).map((topicId) => {
            const block = memberDeep.byTopic[topicId];
            if (!block || (block.sponsored.length === 0 && block.cosponsored.length === 0)) {
              return null;
            }
            const label =
              TOPIC_LABELS[topicId] ?? topicId.charAt(0).toUpperCase() + topicId.slice(1);
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

const TOPIC_LABELS: Record<string, string> = {
  healthcare: 'Healthcare',
  immigration: 'Immigration & Border',
  defense: 'Defense & Foreign Policy',
  economy: 'Economy & Budget',
  environment: 'Environment & Energy',
  education: 'Education',
  crime: 'Crime & Public Safety',
  civil: 'Civil Rights & Liberties',
  judiciary: 'Judiciary & Nominations',
  legislation: 'Federal Legislation',
};

function RECORD_TOPIC_IDS_ONLY_IN_DEEP(
  memberDeep: MemberDeepProfile,
  record: ProfileRecordByTopic,
): string[] {
  const inRecord = new Set(record.topics.map((t) => t.topicId));
  return Object.entries(memberDeep.meta.topicCoverage)
    .filter(([topicId, count]) => count > 0 && !inRecord.has(topicId))
    .map(([topicId]) => topicId);
}
