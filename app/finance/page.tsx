import { Suspense } from 'react';
import FinanceContent from './FinanceContent';
import Link from 'next/link';
import { mockPoliticians } from '@/lib/data/mockPoliticians';
import { fecFinanceCount, getNationalFecSnapshot, mergeCampaignFinance } from '@/lib/data/fecFinance';

export const metadata = {
  title: 'Follow the Money — The Ledger',
  description:
    'Campaign finance, lobbying disclosures, and PAC activity — sourced from FEC and federal disclosure records where integrated.',
};

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialSearchParams = await searchParams;
  const featuredFinance = mockPoliticians.map((p) => ({
    politician: p,
    merged: mergeCampaignFinance(p.id, p.campaignFinance, p.bioguideId),
  }));
  const totalRaised = featuredFinance.reduce((sum, row) => sum + row.merged.finance.totalRaised, 0);
  const fecBackedFeatured = featuredFinance.filter((row) => !!row.merged.fecEntry).length;
  const nationalFinanceCount = getNationalFecSnapshot().meta.withFinanceData ?? fecFinanceCount();

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* SERVER-SIDE SUMMARY FOR CRAWLERS */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Follow the Money</h1>
          <p className="text-white/60 text-base mb-1">
            Campaign finance records, donor patterns, and disclosure-based funding context before deeper analysis.
          </p>
          <div className="text-white/40 text-sm mt-3 space-y-1">
            <p>
              <strong>{nationalFinanceCount}</strong> officials with campaign finance records ·{' '}
              <strong>{fecBackedFeatured}</strong> featured profiles with official FEC totals
            </p>
            <p>
              Featured-profile total raised: <strong>{formatMoney(totalRaised)}</strong>
            </p>
          </div>
        </div>

        {/* SAMPLE LINKS FOR CRAWLERS */}
        <div className="mb-10">
          <h2 className="text-white text-sm font-bold mb-4 uppercase tracking-wide">Finance Profile Samples</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {featuredFinance.slice(0, 12).map(({ politician, merged }) => (
              <Link
                key={politician.id}
                href={`/politicians/${politician.id}?tab=finance`}
                className="p-3 rounded-lg bg-[#0d1f35] hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]"
              >
                <div className="text-white text-xs font-medium truncate">{politician.name}</div>
                <div className="text-gray-400 text-[10px] truncate">
                  {merged.fecEntry ? `FEC: ${formatMoney(merged.finance.totalRaised)}` : 'No synced FEC total yet'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-gray-500 text-sm">Loading finance…</div>}>
        <FinanceContent initialSearchParams={initialSearchParams} />
      </Suspense>
    </>
  );
}
