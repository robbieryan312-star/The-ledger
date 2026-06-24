'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Vote, X } from 'lucide-react';
import PoliticianAvatar from '@/components/ui/PoliticianAvatar';
import { searchPoliticians, resolveOffice } from '@/lib/data/allPoliticians';
import Link from 'next/link';

interface SearchResult {
  type: 'politician' | 'state' | 'election';
  id: string;
  name: string;
  subtitle: string;
  href: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
}

export default function SearchBar({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const politicianResults: SearchResult[] = searchPoliticians(q, 8).map((p) => ({
      type: 'politician' as const,
      id: p.id,
      name: p.name,
      subtitle: `${p.party} · ${resolveOffice(p).label}`,
      href: `/politicians/${p.id}`,
      imageUrl: p.imageUrl,
      firstName: p.firstName,
      lastName: p.lastName,
    }));

    setResults(politicianResults);
    setOpen(true);
  };

  const resultIcon = (result: SearchResult) => {
    if (result.type === 'politician') {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/[0.08]"
             style={{ background: 'linear-gradient(135deg, #0f2236 0%, #07101f 100%)' }}>
          <PoliticianAvatar
            name={result.name}
            firstName={result.firstName}
            lastName={result.lastName}
            imageUrl={result.imageUrl}
            textClassName="text-[#d4ac52] font-bold text-xs"
          />
        </div>
      );
    }
    if (result.type === 'state') return <MapPin className="h-4 w-4 text-blue-400" />;
    return <Vote className="h-4 w-4 text-green-400" />;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className={`relative ${large ? 'max-w-2xl mx-auto' : ''}`}>
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-white/30 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          placeholder={large ? 'Search politicians, states, elections...' : 'Search politicians...'}
          className={`w-full rounded-xl text-white placeholder-white/25 focus:outline-none transition-all
            ${large ? 'pl-12 pr-10 py-4 text-base' : 'pl-10 pr-8 py-2.5 text-sm'}`}
          style={{
            background: 'rgba(11,25,41,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className={large ? 'h-5 w-5' : 'h-4 w-4'} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl shadow-2xl overflow-hidden z-50 border border-white/[0.08]"
             style={{ background: 'rgba(11,25,41,0.97)', backdropFilter: 'blur(20px)' }}>
          {results.map((result) => (
            <Link
              key={result.id}
              href={result.href}
              onClick={() => { setOpen(false); setQuery(''); }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors border-b border-white/[0.05] last:border-0"
            >
              <div className="flex-shrink-0">{resultIcon(result)}</div>
              <div>
                <div className="text-white text-sm font-medium">{result.name}</div>
                <div className="text-white/40 text-xs">{result.subtitle}</div>
              </div>
            </Link>
          ))}
          <Link
            href={`/politicians?q=${query}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/[0.05] transition-colors border-t border-white/[0.05]"
            style={{ color: '#d4ac52' }}
          >
            <Search className="h-4 w-4" />
            See all results for &quot;{query}&quot;
          </Link>
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-2 w-full rounded-xl shadow-2xl p-4 z-50 border border-white/[0.07]"
             style={{ background: 'rgba(11,25,41,0.97)' }}>
          <p className="text-white/35 text-sm text-center">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
