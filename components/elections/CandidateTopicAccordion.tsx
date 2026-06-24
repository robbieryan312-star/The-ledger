'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Issue } from '@/lib/types';
import ExpandableEvidenceRow from '@/components/politicians/ExpandableEvidenceRow';
import SourceProvenance from '@/components/ui/SourceProvenance';
import {
  CAMPAIGN_ONLY_NOTICE,
  mergeCandidateIssues,
  type MergedCandidateIssue,
} from '@/lib/data/candidateIssues';
import { sortEvidenceByDate } from '@/lib/data/topicCoverage';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

interface Props {
  issues: Issue[];
  profileIssues?: Issue[];
  hasProfile?: boolean;
  profileId?: string | null;
  candidateName: string;
}

export default function CandidateTopicAccordion({
  issues,
  profileIssues,
  hasProfile = false,
  profileId,
  candidateName,
}: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const merged = mergeCandidateIssues(issues, profileIssues, hasProfile);

  if (merged.length === 0) return null;

  const lastName = candidateName.split(' ').pop() ?? candidateName;

  return (
    <div className="space-y-1.5 mb-3">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">Key topics</div>
      {merged.map((issue, i) => (
        <TopicRow
          key={`${issue.name}-${i}`}
          issue={issue}
          open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          lastName={lastName}
          profileId={profileId}
        />
      ))}
    </div>
  );
}

function TopicRow({
  issue,
  open,
  onToggle,
  lastName,
  profileId,
}: {
  issue: MergedCandidateIssue;
  open: boolean;
  onToggle: () => void;
  lastName: string;
  profileId?: string | null;
}) {
  const evidence = issue.evidence ?? [];
  const evidenceCount = evidence.length;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        open ? 'border-[#c8a951]/40' : 'border-[#1e3a5f]'
      }`}
      style={{ background: open ? 'rgba(200,169,81,0.04)' : 'rgba(10,22,40,0.5)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#1e3a5f]/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-white font-medium">{issue.name}</span>
            <span className="text-[10px] text-gray-500 px-1.5 py-0 rounded border border-[#1e3a5f]">
              {issue.category}
            </span>
            {evidenceCount > 0 && (
              <span className="text-[10px] text-[#c8a951]/70 border border-[#c8a951]/20 px-1.5 py-0 rounded-full">
                {evidenceCount} record{evidenceCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#c8a951] mt-0.5 line-clamp-2">{issue.position}</div>
        </div>
        {open
          ? <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />
          : <ChevronRight className="h-3 w-3 text-gray-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 border-t border-[#1e3a5f] pt-2 space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed italic border-l-2 border-[#c8a951]/30 pl-2.5">
            {issue.statement ??
              `Available evidence suggests ${lastName} ${issue.detail.charAt(0).toLowerCase()}${issue.detail.slice(1)}`}
          </p>

          {issue.profileMatched && issue.profileIssueName && (
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Congressional record merged from profile topic &ldquo;{issue.profileIssueName}&rdquo;.
              {profileId && (
                <>
                  {' '}
                  <Link
                    href={`/politicians/${profileId}`}
                    className="text-[#c8a951] hover:text-white inline-flex items-center gap-0.5"
                  >
                    Full record <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </>
              )}
            </p>
          )}

          {evidenceCount > 0 ? (
            <div className="space-y-1.5">
              {sortEvidenceByDate(evidence).map((item, j) => (
                <ExpandableEvidenceRow key={`${item.type}-${item.date}-${j}`} item={item} />
              ))}
            </div>
          ) : issue.source ? (
            <SourceProvenance source={issue.source} />
          ) : null}

          {issue.campaignOnly && (
            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-2.5 text-[11px] text-yellow-100/75 leading-relaxed">
              {CAMPAIGN_ONLY_NOTICE}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
