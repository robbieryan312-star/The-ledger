import MapExplorer from '@/components/map/MapExplorer';
import { MapNavigationProvider } from '@/lib/context/MapNavigationContext';
import HomeSearchBar from '@/components/search/HomeSearchBar';
import Link from 'next/link';
import { ArrowRight, Shield, Vote, DollarSign, BarChart2 } from 'lucide-react';

const quickLinks = [
  { icon: Vote, label: 'Voting Records', href: '/politicians', color: 'text-blue-400' },
  { icon: DollarSign, label: 'Campaign Finance', href: '/finance', color: 'text-[#c8a951]' },
  { icon: BarChart2, label: 'Compare Candidates', href: '/compare', color: 'text-purple-400' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#06101e]">
      <MapNavigationProvider>
        <section className="relative overflow-visible bg-[#06101e] px-4 pt-8 pb-6 sm:pt-10 sm:pb-8">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 55% at 50% 20%, rgba(12, 35, 64, 0.9) 0%, rgba(6, 16, 30, 0.65) 45%, rgba(3, 8, 16, 0) 100%)',
            }}
          />
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/[0.08] rounded-full px-3 py-1 mb-3">
                <Shield className="h-3.5 w-3.5 text-[#c8a951]" />
                <span className="text-[11px] text-white/60 tracking-wide uppercase">Official Records · Every Source Verified</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 drop-shadow-lg">
                The record speaks for itself.
              </h1>
              <p className="text-sm text-white/45 max-w-lg mx-auto">
                Click any state to zoom in · Select a county · Search by ZIP, politician, or county name
              </p>
            </div>
            <HomeSearchBar />
          </div>
        </section>

        <section className="relative z-0 bg-[#06101e] px-4 pb-8">
          <div className="max-w-4xl mx-auto rounded-2xl border border-white/[0.1] bg-[#08152a]/92 p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <Shield className="h-6 w-6 text-[#c8a951] flex-shrink-0 mt-0.5" />
              <div className="space-y-3">
                <p className="text-white text-base sm:text-lg font-semibold leading-snug">
                  Every vote, every dollar, every promise — sourced, dated, and yours to judge.
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Know who really represents you. The Ledger puts every politician&apos;s record, funding, and public statements in one place. Nonpartisan. Verified. No spin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Interactive map ── */}
        <section className="relative min-h-[620px] sm:min-h-[720px] border-y border-[#1e3a5f]/70">
          <MapExplorer />
        </section>
      </MapNavigationProvider>

      {/* ── Compact footer strip ── */}
      <section className="bg-[#0a1628] border-t border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-center md:text-left">
              <Shield className="h-5 w-5 text-[#c8a951] flex-shrink-0" />
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">The Ledger</span> — objective political records from FEC.gov, Congress.gov, and official county sources.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 text-sm ${link.color} hover:text-white transition-colors`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                  </Link>
                );
              })}
              <Link href="/dashboard" className="text-sm text-[#c8a951] hover:text-white transition-colors font-medium">
                My Ledger →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
