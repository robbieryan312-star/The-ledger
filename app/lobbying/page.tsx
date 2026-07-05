'use client';

import Link from 'next/link';
import { Building2, ExternalLink } from 'lucide-react';
import { FloridaRecordPanel } from '@/components/records/FloridaRecordPanel';
import { getLobbyingFllobbyistSlice } from '@/lib/data/slices/lobbyingFllobbyist';

export default function LobbyingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/finance" className="text-sm text-white/35 hover:text-[#d4ac52] transition-colors">
          Money & Donors / Lobbying Profiles
        </Link>
        <div className="mt-2">
          <h1 className="text-3xl font-bold text-white mb-2">Lobbying & Advocacy Groups</h1>
          <p className="text-white/40 max-w-3xl">
            Objective group profiles with disclosed spending patterns, stated issue priorities, history, and source links.
          </p>
        </div>
      </div>

      <div className="text-center py-16">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-lg text-white/60 font-medium">No verified data yet</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Lobbying group profiles will be populated when real pipelines are integrated from
          LDA, FARA, and FEC disclosure records.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mt-6 text-sm">
          <a href="https://www.opensecrets.org/federal-lobbying" target="_blank" rel="noopener noreferrer"
             className="text-[#c8a951] hover:text-white flex items-center gap-1 transition-colors">
            OpenSecrets <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://lda.senate.gov/filings/public/filing/search/" target="_blank" rel="noopener noreferrer"
             className="text-[#c8a951] hover:text-white flex items-center gap-1 transition-colors">
            Senate LDA Filings <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <Link href="/finance" className="inline-block mt-6 text-sm text-gray-500 hover:text-white transition-colors">
          ← Back to Money & Donors
        </Link>
      </div>

      <div className="mt-10">
        <FloridaRecordPanel
          title="Florida lobbying firm directories (official PDF index)"
          subtitle="Official Florida Commission on Ethics lobbyist registration directories — PDF links from the public search portal."
          slice={getLobbyingFllobbyistSlice()}
        />
      </div>
    </div>
  );
}
