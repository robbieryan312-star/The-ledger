import { notFound } from 'next/navigation';
import Link from 'next/link';
import { countyByFips, countiesByState } from '@/lib/data/mockCounties';
import OfficialCard from '@/components/counties/OfficialCard';
import FloridaCountyEconomicContext from '@/components/records/FloridaCountyEconomicContext';
import { ArrowLeft, Building2, Calendar, ExternalLink, History, MapPin, Users } from 'lucide-react';

export default async function CountyPage({ params }: { params: Promise<{ fips: string }> }) {
  const { fips } = await params;
  const county = countyByFips[fips];
  if (!county) notFound();

  const siblingCounties = (countiesByState[county.stateCode] ?? []).filter((c) => c.fips !== fips);
  const upcoming = (county.elections ?? []).filter((e) => e.isUpcoming);
  const past = (county.elections ?? []).filter((e) => !e.isUpcoming);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href={`/?state=${county.stateCode}&county=${county.fips}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#c8a951] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to map
      </Link>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <MapPin className="h-4 w-4 text-[#c8a951]" />
              {county.stateName} · FIPS {county.fips}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{county.name} County</h1>
            <p className="text-gray-400 text-sm">
              Local elected officials, election results, and stated policy from official sources
            </p>
          </div>
          {county.website && (
            <a
              href={county.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#c8a951] hover:text-white border border-[#c8a951]/30 rounded-xl px-4 py-2 transition-colors"
            >
              County website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {county.stateCode === 'FL' && (
        <div className="mb-8">
          <FloridaCountyEconomicContext />
        </div>
      )}

      {(county.seat || county.population) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {county.seat && (
            <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <Building2 className="h-3.5 w-3.5" /> County seat
              </div>
              <div className="text-white font-semibold">{county.seat}</div>
            </div>
          )}
          {county.population && (
            <div className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f]">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <Users className="h-3.5 w-3.5" /> Population
              </div>
              <div className="text-white font-semibold">{county.population.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#c8a951]" />
          Elected Officials ({county.officials.length})
        </h2>
        <div className="space-y-3">
          {county.officials.map((official) => (
            <OfficialCard key={official.id} official={official} />
          ))}
        </div>
      </section>

      {(upcoming.length > 0 || past.length > 0) && (
        <section className="mb-10 border-t border-[#1e3a5f] pt-8">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-purple-400" />
            Elections
          </h2>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[#c8a951] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Upcoming
              </h3>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <div key={e.id} className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-white font-medium">{e.title}</div>
                      <span className="text-xs bg-[#c8a951]/20 text-[#c8a951] px-2 py-0.5 rounded-full">Upcoming</span>
                    </div>
                    <div className="text-gray-400 text-xs mb-3">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {e.candidates.map((c) => (
                        <span key={c.name} className="text-xs bg-[#0a1628] text-gray-300 px-2 py-1 rounded-lg">{c.name} ({c.party[0]})</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Past Results</h3>
              <div className="space-y-3">
                {past.map((e) => (
                  <div key={e.id} className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4">
                    <div className="text-white font-medium mb-1">{e.title}</div>
                    <div className="text-gray-500 text-xs mb-3">
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {e.turnout && ` · ${e.turnout}% turnout`}
                    </div>
                    <div className="space-y-1.5">
                      {e.candidates.map((c) => (
                        <div key={c.name} className="flex justify-between text-sm">
                          <span className={c.won ? 'text-white font-medium' : 'text-gray-400'}>
                            {c.won && '✓ '}{c.name}
                          </span>
                          {c.percentage !== undefined && <span className="text-gray-500">{c.percentage}%</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {siblingCounties.length > 0 && (
        <section className="border-t border-[#1e3a5f] pt-8">
          <h2 className="text-white font-bold text-lg mb-4">More counties in {county.stateName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {siblingCounties.map((c) => (
              <Link
                key={c.fips}
                href={`/counties/${c.fips}`}
                className="bg-[#0d1f35] rounded-xl p-4 border border-[#1e3a5f] hover:border-[#c8a951] transition-colors"
              >
                <div className="text-white font-medium">{c.name}</div>
                <div className="text-gray-500 text-xs mt-1">{c.officials.length} officials tracked</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
