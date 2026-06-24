'use client';

import { ExternalLink } from 'lucide-react';
import type { VoteviewMemberSlice } from '@/lib/data/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';

interface Props {
  member: VoteviewMemberSlice;
}

/** DW-NOMINATE roll-call ideology scores — sourced nonpartisan metric, not an editorial label. */
export default function VoteviewIdeologyPanel({ member }: Props) {
  const econLabel = member.nominateEconomic >= 0 ? 'positive' : 'negative';
  const socialLabel = member.nominateSocial >= 0 ? 'positive' : 'negative';

  return (
    <section className="mt-6 rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(11,25,41,0.7)' }}>
      <h2 className="text-white font-bold mb-1">Congressional roll-call ideology (DW-NOMINATE)</h2>
      <p className="text-gray-500 text-xs mb-4 leading-relaxed">
        {member.congress}th Congress · {member.chamber}
        {member.district ? ` · District ${member.district}` : ''}. Scores are a nonpartisan political-science
        measure from roll-call votes (roughly −1 to +1 on economic and social dimensions) — not a moral or character label.
      </p>
      <dl className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60">
          <dt className="text-[10px] text-gray-500 uppercase tracking-wide">Economic dimension</dt>
          <dd className="text-white font-bold text-xl mt-0.5">{member.nominateEconomic.toFixed(3)}</dd>
          <dd className="text-[10px] text-gray-500 mt-0.5">{econLabel} on redistribution axis</dd>
        </div>
        <div className="bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60">
          <dt className="text-[10px] text-gray-500 uppercase tracking-wide">Social dimension</dt>
          <dd className="text-white font-bold text-xl mt-0.5">{member.nominateSocial.toFixed(3)}</dd>
          <dd className="text-[10px] text-gray-500 mt-0.5">{socialLabel} on social-policy axis</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <SourceProvenance source={member.source} asOf={member.asOf} size="sm" />
        <a
          href={member.voteviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#c8a951] hover:text-white inline-flex items-center gap-1"
        >
          Voteview profile <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}
