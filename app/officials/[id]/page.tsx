'use client';

import { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { officialById } from '@/lib/data/mockCounties';
import {
  ArrowLeft, Building2, Calendar, ExternalLink, MapPin, Quote, Star, Vote, ChevronRight,
} from 'lucide-react';
import { use } from 'react';

const partyStyle: Record<string, string> = {
  Democrat: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Republican: 'bg-red-500/20 text-red-400 border-red-500/30',
  Independent: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export default function OfficialProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const entry = officialById[id];
  if (!entry) notFound();

  const { official, county } = entry;
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'elections'>('overview');

  const officialElections = (county.elections ?? []).filter((e) =>
    e.office.toLowerCase().includes(official.position.split('(')[0].trim().toLowerCase().split(' ').pop() ?? '') ||
    e.candidates.some((c) => c.name === official.name)
  );

  const relatedElections = officialElections.length > 0
    ? officialElections
    : (county.elections ?? []).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/counties/${county.fips}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#c8a951] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {county.name} County
      </Link>

      {/* Header */}
      <div className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0a1628] border border-[#c8a951]/20 flex items-center justify-center flex-shrink-0">
            {official.imageUrl ? (
              <img src={official.imageUrl} alt={official.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-[#c8a951] font-bold text-2xl">
                {official.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <MapPin className="h-3.5 w-3.5 text-[#c8a951]" />
              {county.name} County, {county.stateName}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{official.name}</h1>
            <p className="text-[#c8a951] font-medium mb-2">{official.position}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${partyStyle[official.party] ?? partyStyle.Independent}`}>
                {official.party}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full ${official.inOffice ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {official.inOffice ? 'In Office' : 'Former'}
              </span>
              {official.termEnd && (
                <span className="text-xs text-gray-500">Term ends {official.termEnd}</span>
              )}
            </div>
          </div>
          {official.website && (
            <a
              href={official.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-[#c8a951] hover:text-white border border-[#c8a951]/30 rounded-xl px-3 py-2 transition-colors flex-shrink-0"
            >
              Official site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0a1628] p-1 rounded-xl border border-[#1e3a5f] w-fit">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'positions', label: 'Key Positions' },
          { id: 'elections', label: 'Elections' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#c8a951] text-[#0a1628]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <section className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-5">
            <h2 className="text-white font-bold mb-3">Biography</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{official.bio}</p>
          </section>

          {official.statements && official.statements.length > 0 && (
            <section className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] p-5">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Quote className="h-5 w-5 text-[#c8a951]" /> On Record
              </h2>
              <div className="space-y-3">
                {official.statements.map((s, i) => (
                  <div key={i} className="border-l-2 border-[#c8a951]/50 pl-4 py-1">
                    <p className="text-gray-200 text-sm italic">&ldquo;{s.quote}&rdquo;</p>
                    <p className="text-gray-500 text-xs mt-1">{s.context} · {s.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'positions' && (
        <section className="space-y-3">
          {(official.topIssues ?? []).map((issue) => (
            <div key={issue.name} className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-[#c8a951]" />
                <span className="text-white font-semibold">{issue.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{issue.category}</span>
              </div>
              <p className="text-[#c8a951] text-sm font-medium mb-1">{issue.position}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{issue.detail}</p>
            </div>
          ))}
          {(official.topIssues ?? []).length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No recorded positions available.</p>
          )}
        </section>
      )}

      {activeTab === 'elections' && (
        <section className="space-y-4">
          {relatedElections.map((election) => (
            <div key={election.id} className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-white font-semibold">{election.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(election.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {election.turnout && <span>· Turnout {election.turnout}%</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  election.isUpcoming ? 'bg-[#c8a951]/20 text-[#c8a951]' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {election.isUpcoming ? 'Upcoming' : 'Past Result'}
                </span>
              </div>
              <div className="space-y-2">
                {election.candidates.map((c) => {
                  const isSubject = c.name === official.name;
                  return (
                    <div
                      key={c.name}
                      className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                        isSubject ? 'bg-[#c8a951]/10 border border-[#c8a951]/30' : 'bg-[#0a1628]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {c.won && !election.isUpcoming && (
                          <Vote className="h-3.5 w-3.5 text-green-400" />
                        )}
                        <span className={`font-medium ${isSubject ? 'text-[#c8a951]' : 'text-white'}`}>{c.name}</span>
                        <span className={`text-xs px-1.5 rounded ${partyStyle[c.party] ?? partyStyle.Independent}`}>
                          {c.party[0]}
                        </span>
                      </div>
                      {!election.isUpcoming && c.percentage !== undefined && (
                        <span className="text-gray-400 text-xs">{c.percentage}% ({c.votes?.toLocaleString()} votes)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {relatedElections.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No election records for this office yet.</p>
          )}
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/?state=${county.stateCode}&county=${county.fips}`}
          className="flex items-center gap-1.5 text-sm bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white px-4 py-2 rounded-xl transition-colors"
        >
          <MapPin className="h-4 w-4" /> View on map
        </Link>
        <Link
          href={`/counties/${county.fips}`}
          className="flex items-center gap-1.5 text-sm text-[#c8a951] hover:text-white px-4 py-2 rounded-xl border border-[#c8a951]/30 transition-colors"
        >
          All {county.name} officials <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
