import Link from 'next/link';
import { Scale, ExternalLink } from 'lucide-react';

const dataSources = [
  { name: 'Federal Election Commission', url: 'https://www.fec.gov', description: 'Campaign finance data' },
  { name: 'ProPublica Congress API', url: 'https://projects.propublica.org/api-docs/congress-api/', description: 'Voting records & bills' },
  { name: 'OpenSecrets', url: 'https://www.opensecrets.org', description: 'Lobbying & donor data' },
  { name: 'Congress.gov', url: 'https://www.congress.gov', description: 'Official legislative records' },
  { name: 'Senate Stock Watcher', url: 'https://senatestockwatcher.com', description: 'Senator stock disclosures' },
  { name: 'House Stock Watcher', url: 'https://housestockwatcher.com', description: 'Representative stock disclosures' },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.06]" style={{ background: 'rgba(5,9,15,0.9)' }}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #d4ac52 0%, #b8922f 100%)' }}>
                <Scale className="h-4 w-4 text-[#05090f]" />
              </div>
              <span className="text-white font-bold text-base tracking-tight">The Ledger</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Objective, fact-based information about politicians at every level of government.
              All data sourced from official government records and non-partisan organizations.
            </p>
            <div className="mt-5 p-4 rounded-xl border border-white/[0.06]" style={{ background: 'rgba(212,172,82,0.05)' }}>
              <p className="text-xs text-[#d4ac52]/80 font-semibold mb-1 tracking-wide uppercase">Non-Partisan Commitment</p>
              <p className="text-xs text-white/35">
                The Ledger presents verified facts only. No opinion, no editorial bias.
                All politicians are evaluated using the same objective criteria.
              </p>
            </div>
            <div className="mt-3 p-4 rounded-xl border border-blue-400/15" style={{ background: 'rgba(59,130,246,0.05)' }}>
              <p className="text-xs text-blue-300/80 font-semibold mb-1 tracking-wide uppercase">Demo Data Notice</p>
              <p className="text-xs text-white/35">
                Demo current as of 2026-06 where modeled. Federal and state profiles use comprehensive sourced demo records;
                local profiles show action-record coverage only. Missing topics are labeled as limited demo coverage.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-white/80 font-semibold mb-4 text-sm tracking-wide uppercase">Data Sources</h3>
            <ul className="space-y-3">
              {dataSources.map((source) => (
                <li key={source.name} className="flex items-start gap-2.5">
                  <ExternalLink className="h-3 w-3 text-[#d4ac52]/60 mt-0.5 flex-shrink-0" />
                  <div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/60 hover:text-[#d4ac52] transition-colors font-medium"
                    >
                      {source.name}
                    </a>
                    <p className="text-xs text-white/25 mt-0.5">{source.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white/80 font-semibold mb-4 text-sm tracking-wide uppercase">Navigate</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Map', '/'],
                ['Browse Politicians', '/politicians'],
                ['Upcoming Elections', '/elections'],
                ['Compare Candidates', '/compare'],
                ['Campaign Finance', '/finance'],
                ['Stock Trades', '/congress'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-white/40 hover:text-[#d4ac52] transition-colors text-sm">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.05] mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">
            © 2026 The Ledger. All data sourced from public government records. For informational purposes only.
          </p>
          <p className="text-white/25 text-xs">
            Not affiliated with any political party, candidate, or government agency.
          </p>
        </div>
      </div>
    </footer>
  );
}
