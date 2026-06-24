'use client';

import type { CampaignFinance, VoteRecord } from '@/lib/types';
import VoteRow from '@/components/politicians/VoteRow';
import { ProfileSectionAccordion } from '@/components/politicians/ProfileSectionAccordion';
import { Vote } from 'lucide-react';

interface Props {
  votes: VoteRecord[];
  finance?: CampaignFinance;
  isFeatured?: boolean;
  maxGroups?: number;
}

export default function PublicActionsAccordion({
  votes,
  finance,
  isFeatured = false,
  maxGroups = 4,
}: Props) {
  if (votes.length === 0) return null;

  const byCategory = votes.reduce<Record<string, VoteRecord[]>>((acc, v) => {
    const cat = v.category || 'Other';
    (acc[cat] ??= []).push(v);
    return acc;
  }, {});

  const groups = Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxGroups);

  return (
    <ProfileSectionAccordion
      title="Votes & public actions"
      subtitle={`${votes.length} recent roll-call vote${votes.length !== 1 ? 's' : ''} — expand for bill summary and party split`}
      icon={Vote}
      defaultOpen={false}
    >
      <div className="space-y-4 pt-1">
        {groups.map(([category, categoryVotes]) => (
          <div key={category}>
            <div className="text-[10px] uppercase tracking-wide text-white/35 font-medium mb-2">{category}</div>
            <div className="space-y-2">
              {categoryVotes.slice(0, 3).map((v) => (
                <VoteRow
                  key={v.id}
                  vote={v}
                  finance={finance}
                  isFeatured={isFeatured}
                  compact
                />
              ))}
            </div>
          </div>
        ))}
        <p className="text-[11px] text-white/25 pt-1">
          Open the Voting Record tab for filters and the full list.
        </p>
      </div>
    </ProfileSectionAccordion>
  );
}
