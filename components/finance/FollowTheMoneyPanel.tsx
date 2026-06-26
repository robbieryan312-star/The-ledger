'use client';

import Link from 'next/link';
import { ExternalLink, Info } from 'lucide-react';
import type { FecFinanceEntry } from '@/lib/data/fecFinance';
import type { CongressVoteEntry } from '@/lib/data/congressVotes';
import { getScheduleAForBioguide } from '@/lib/data/fecScheduleA';
import SourceProvenance from '@/components/ui/SourceProvenance';

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export default function FollowTheMoneyPanel({
  bioguideId,
  politicianId,
  politicianName,
  fecEntry,
  congressEntry,
  showDomesticForeignNote = true,
}: {
  bioguideId?: string;
  politicianId: string;
  politicianName: string;
  fecEntry?: FecFinanceEntry;
  congressEntry?: CongressVoteEntry;
  showDomesticForeignNote?: boolean;
}) {
  const scheduleA = getScheduleAForBioguide(bioguideId);
  const votes = congressEntry?.votes ?? [];

  if (!fecEntry && !scheduleA && votes.length === 0) {
    return (
      <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-4 text-sm text-gray-500">
        No verified FEC Schedule A or roll-call linkage on file for this profile.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-[#c8a951]/25 bg-[#c8a951]/5 px-3 py-2">
        <Info className="h-4 w-4 text-[#c8a951] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#e6cd8a] leading-relaxed">
          Follow the Money shows separate official records — itemized FEC contributions and roll-call
          votes — side by side for {politicianName.split(' ').pop()}. These are factual disclosures only;
          no causal link between a donor and a vote is stated or implied.
        </p>
      </div>

      {scheduleA && scheduleA.contributors.length > 0 && (
        <div className="rounded-xl border border-green-400/20 bg-[#0d1f35] p-4">
          <h3 className="text-white font-semibold text-sm mb-1">Schedule A — committee-scoped itemized receipts</h3>
          <p className="text-gray-500 text-xs mb-3">Tier 1 · OpenFEC receipts for authorized candidate committees</p>
          <div className="space-y-2">
            {scheduleA.contributors.slice(0, 10).map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="text-gray-200 truncate">{c.name}</div>
                  {(c.employer || c.occupation) && (
                    <div className="text-gray-500 text-xs truncate">
                      {[c.occupation, c.employer].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-green-400 font-medium">{formatMoney(c.amount)}</div>
                  <div className="text-gray-500 text-xs">{c.date}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <SourceProvenance
              source={scheduleA.source}
              recordDate={scheduleA.asOf}
              asOf={scheduleA.asOf}
              showCompleteness={false}
            />
            <a
              href={scheduleA.fecUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#c8a951] mt-2 hover:underline"
            >
              FEC candidate profile <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {showDomesticForeignNote && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-gray-400">
          <span className="text-yellow-400/90 font-medium">Lobbying registration labels: </span>
          Domestic lobbying disclosures (Senate LDA) are Tier 1 official records when integrated.
          Foreign Agents Registration Act (FARA) registrants are labeled separately as foreign lobbying
          where DOJ eFile data is available — no verified FARA Florida snapshot on file yet.
        </div>
      )}

      {fecEntry && (
        <p className="text-gray-600 text-[10px]">
          Headline totals: {formatMoney(fecEntry.receipts)} raised ({fecEntry.electionYear} cycle).{' '}
          <Link href={`/politicians/${politicianId}`} className="text-[#c8a951] hover:underline">
            Full profile
          </Link>
        </p>
      )}
    </div>
  );
}
