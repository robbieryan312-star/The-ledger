'use client';

import { ConsistencyData, Issue } from '@/lib/types';
import ConsistencyScore from '@/components/politicians/ConsistencyScore';
import ExpandableEvidenceRow from '@/components/politicians/ExpandableEvidenceRow';
import EarlierRecordSection from '@/components/politicians/EarlierRecordSection';
import SourceProvenance from '@/components/ui/SourceProvenance';
import { issueEvidenceSections } from '@/lib/data/topicCoverage';
import { Info } from 'lucide-react';

/**
 * Credibility & Consistency — a neutral, dated factual diff of what an official
 * SAID (statements / platform positions) against what the record shows they DID
 * (votes, signatures, executive actions). It composes the existing promise-level
 * Said/Did/Status diff (ConsistencyScore) and adds a position-level section for
 * topics whose sourced record spans more than one period, so users can see how a
 * stance has evolved over time — presented as a timeline with dates, never as a
 * character judgment (per the editorial-voice rules).
 */
export default function CredibilityConsistency({
  data,
  issues,
  name,
}: {
  data: ConsistencyData;
  issues: Issue[];
  name: string;
}) {
  const lastName = name.split(' ').pop() ?? name;
  // Only positions that carry an explicit earlier record qualify as "multi-period".
  const evolving = issues.filter((i) => (i.historicalEvidence?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {/* Neutral framing — required by editorial voice: factual diff, not a judgment */}
      <div className="flex items-start gap-3 rounded-xl border border-[#c8a951]/25 bg-[#c8a951]/5 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c8a951]" />
        <p className="text-xs leading-relaxed text-[#e6cd8a]">
          <strong className="text-white">How to read this.</strong> This view pairs what {lastName} has{' '}
          <span className="text-purple-300">said</span> (public statements, platform positions) with what the
          record shows they <span className="text-blue-300">did</span> (votes, signatures, executive actions) —
          each with its own date and source. Where more recent records differ in emphasis from earlier ones, both
          periods are shown with dates. This is a factual record diff, not a character judgment.
        </p>
      </div>

      {/* Promise-level Said/Did/Status diff + score strip + term-consistency chart */}
      <ConsistencyScore data={data} name={name} />

      {/* Position-level multi-period record */}
      {evolving.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-1">Positions with a multi-period record</h3>
          <p className="text-gray-500 text-xs mb-3">
            Topics where sourced statements or actions span more than one period. The most recent records are shown
            first; earlier records are available for factual comparison, with dates on both sides.
          </p>
          <div className="space-y-3">
            {evolving.map((issue, i) => {
              const { current, historical } = issueEvidenceSections(issue);
              const mostRecent = current[0];
              return (
                <div
                  key={`${issue.name}-${i}`}
                  className="rounded-xl border border-white/[0.08] p-4"
                  style={{ background: 'rgba(5,9,15,0.4)' }}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-white font-medium text-sm">{issue.name}</span>
                    <span className="text-xs text-white/35 px-2 py-0 rounded-full border border-white/[0.07]">
                      {issue.category}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-[#c8a951] border border-[#c8a951]/30 bg-[#c8a951]/5 px-1.5 py-0.5 rounded-full">
                      Record spans multiple periods
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Said */}
                    <div className="rounded-lg border border-purple-400/20 p-3" style={{ background: 'rgba(147,51,234,0.05)' }}>
                      <div className="text-[10px] uppercase tracking-wide text-purple-300/80 font-semibold mb-1.5">
                        Said — stated position
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">{issue.statement ?? issue.position}</p>
                      {issue.source && (
                        <div className="mt-2">
                          <SourceProvenance source={issue.source} size="xs" />
                        </div>
                      )}
                    </div>
                    {/* Did */}
                    <div className="rounded-lg border border-blue-400/20 p-3" style={{ background: 'rgba(59,130,246,0.05)' }}>
                      <div className="text-[10px] uppercase tracking-wide text-blue-300/80 font-semibold mb-1.5">
                        Did — most recent record
                      </div>
                      {mostRecent ? (
                        <>
                          <p className="text-gray-300 text-xs leading-relaxed">{mostRecent.description}</p>
                          <div className="text-gray-500 text-[11px] mt-1">{mostRecent.date}</div>
                          <div className="mt-2">
                            <SourceProvenance source={mostRecent.source} recordDate={mostRecent.date} size="xs" />
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500 text-xs italic">No verified record available.</p>
                      )}
                    </div>
                  </div>

                  {current.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                        Recent records (newest first)
                      </div>
                      {current.map((ev, j) => (
                        <ExpandableEvidenceRow key={j} item={ev} />
                      ))}
                    </div>
                  )}
                  <EarlierRecordSection items={historical} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
