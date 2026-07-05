'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Vote, X, Building2 } from 'lucide-react';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { lookupZip } from '@/lib/zipLookup';
import { filterPoliticianHits } from '@/lib/politicianSearchIndex';
import type { PoliticianSearchHit, StateRosterEntry } from '@/lib/types/searchIndex';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useMapNavigationOptional } from '@/lib/context/MapNavigationContext';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'zip' | 'state' | 'politician' | 'election' | 'county' | 'official';
  id: string;
  label: string;
  sublabel: string;
  href?: string;
  stateCode?: string;
  countyFips?: string;
  zipCode?: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
}

interface HomeSearchBarProps {
  politicianHits: PoliticianSearchHit[];
  states: StateRosterEntry[];
  /** Optional roster with activePolitician counts for state sublabels */
  rosterStates?: Array<{ code: string; name: string; activePoliticians?: number }>;
}

export default function HomeSearchBar({
  politicianHits,
  states,
  rosterStates,
}: HomeSearchBarProps) {
  const stateMeta = rosterStates ?? states.map((s) => ({ ...s, activePoliticians: 0 }));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { setLocation } = useUserProfile();
  const mapNav = useMapNavigationOptional();

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    const lower = q.toLowerCase().trim();
    const out: SearchResult[] = [];

    if (/^\d{3,5}$/.test(q)) {
      const fullZip = lookupZip(q);
      if (fullZip) {
        out.push({
          type: 'zip', id: `zip-${q}`,
          label: `ZIP ${q} — ${fullZip.city}`,
          sublabel: fullZip.countyName
            ? `${fullZip.countyName} County · local officials & elections`
            : `${fullZip.state} · View on map`,
          stateCode: fullZip.code,
          countyFips: fullZip.countyFips,
          zipCode: q,
        });
      } else if (q.length === 5) {
        out.push({
          type: 'zip', id: `zip-${q}`,
          label: `ZIP Code ${q}`,
          sublabel: 'Search on map',
          zipCode: q,
        });
      }
    }

    stateMeta.filter((s) =>
      s.name.toLowerCase().includes(lower) || s.code.toLowerCase() === lower,
    ).slice(0, 3).forEach((s) => {
      out.push({
        type: 'state', id: `state-${s.code}`,
        label: s.name,
        sublabel: s.activePoliticians
          ? `${s.activePoliticians} officials tracked`
          : 'View on map',
        stateCode: s.code,
      });
    });

    filterPoliticianHits(politicianHits, lower, 5).forEach((p) => {
      out.push({
        type: 'politician', id: `pol-${p.id}`,
        label: p.name,
        sublabel: `${p.party} · ${p.officeLabel}`,
        href: p.href,
        stateCode: p.stateCode,
        imageUrl: p.imageUrl,
        firstName: p.firstName,
        lastName: p.lastName,
      });
    });

    const seen = new Set<string>();
    const deduped = out.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    setResults(deduped.slice(0, 10));
    setOpen(deduped.length > 0);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');

    if (mapNav && result.stateCode && (result.type === 'zip' || result.type === 'county' || result.type === 'state' || result.type === 'official')) {
      const state = stateMeta.find((s) => s.code === result.stateCode);
      if (state && (result.type === 'zip' || result.type === 'county')) {
        setLocation(result.stateCode, state.name, result.zipCode ?? '');
      }
      mapNav.navigateTo({
        stateCode: result.stateCode,
        countyFips: result.countyFips,
        zip: result.zipCode,
      });
      if (result.type === 'official' && result.href) {
        router.push(result.href);
      }
      return;
    }

    if (result.type === 'zip' && result.stateCode) {
      const state = stateMeta.find((s) => s.code === result.stateCode);
      if (state) setLocation(result.stateCode, state.name, result.zipCode ?? '');
    }

    if (result.href) router.push(result.href);
    else if (result.stateCode && mapNav) {
      mapNav.navigateTo({ stateCode: result.stateCode, countyFips: result.countyFips });
    }
  };

  const iconForType = (result: SearchResult) => {
    if (result.type === 'politician') {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.08] bg-[#0a1628]">
          <PoliticianAvatar
            name={result.label}
            firstName={result.firstName}
            lastName={result.lastName}
            imageUrl={result.imageUrl}
            textClassName="text-[#c8a951] font-bold text-xs"
          />
        </div>
      );
    }
    if (result.type === 'zip') return <MapPin className="h-4 w-4 text-green-400" />;
    if (result.type === 'county') return <Building2 className="h-4 w-4 text-teal-400" />;
    if (result.type === 'official') return <MapPin className="h-4 w-4 text-cyan-400" />;
    if (result.type === 'state') return <MapPin className="h-4 w-4 text-blue-400" />;
    return <Vote className="h-4 w-4 text-purple-400" />;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#c8a951]/20 via-[#4a7ab5]/20 to-[#c8a951]/20 rounded-2xl blur opacity-60 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => query.length >= 2 && setOpen(true)}
            placeholder="Search ZIP code, county, politician, or state..."
            className="w-full bg-[#0a1628]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl pl-12 pr-10 py-3.5 text-white text-base placeholder-gray-500 focus:outline-none focus:border-[#c8a951]/60 focus:ring-2 focus:ring-[#c8a951]/15 shadow-2xl"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[#0d1f35]/98 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0 text-left"
            >
              <div className="flex-shrink-0">{iconForType(result)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{result.label}</div>
                <div className="text-gray-400 text-xs truncate">{result.sublabel}</div>
              </div>
              {(result.type === 'zip' || result.type === 'county') && (
                <span className="text-xs bg-green-400/15 text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                  Map
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
