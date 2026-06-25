import { Suspense } from 'react';
import { allPoliticians, getCoverageStats, resolveOffice } from '@/lib/data/allPoliticians';
import { fecFinanceCount } from '@/lib/data/fecFinance';
import PoliticiansContent from './PoliticiansContent';
import Link from 'next/link';

export const metadata = {
  title: 'Politicians — The Ledger',
  description:
    'Browse every current federal official — Congress, governors, executive branch, and judiciary — with sourced office labels from authoritative records.',
};

export default async function PoliticiansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialSearchParams = await searchParams;
  const stats = getCoverageStats();
  const filedCount = fecFinanceCount();
  const allCount = allPoliticians.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* SERVER-SIDE SUMMARY FOR CRAWLERS */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">The people in power, in plain sight.</h1>
        <p className="text-white/60 text-base mb-1">
          A complete, sourced record for every official — nothing hidden, nothing spun.
        </p>
        <div className="text-white/40 text-sm mt-3 space-y-1">
          <p><strong>{allCount}</strong> politicians indexed · <strong>{filedCount}</strong> with campaign finance data</p>
          <p><strong>{stats.total}</strong> current officials in authoritative roster</p>
          <p>Federal coverage: Congress members, governors, executive branch, judiciary</p>
        </div>
      </div>

      {/* SAMPLE GRID FOR CRAWLERS (first 12 politicians) */}
      <div className="mb-12">
        <h2 className="text-white text-sm font-bold mb-4 uppercase tracking-wide">Featured Officials</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allPoliticians.slice(0, 12).map((p) => (
            <Link
              key={p.id}
              href={`/politicians/${p.id}`}
              className="p-3 rounded-lg bg-[#0d1f35] hover:bg-[#1e3a5f] transition-colors border border-[#1e3a5f]"
            >
              <div className="text-white text-xs font-medium truncate">{p.name}</div>
              <div className="text-gray-400 text-[10px] truncate">{resolveOffice(p).label}</div>
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/politicians" className="text-[#c8a951] text-sm hover:underline">
            View all {allCount} politicians →
          </Link>
        </div>
      </div>

      {/* CLIENT-SIDE INTERACTIVE CONTENT */}
      <Suspense fallback={<div className="text-gray-500 text-sm">Loading politicians...</div>}>
        <PoliticiansContent initialSearchParams={initialSearchParams} />
      </Suspense>
    </div>
  );
}
