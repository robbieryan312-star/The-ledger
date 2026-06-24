import Link from 'next/link';
import { ExternalLink, Database, ShieldCheck, CircleSlash } from 'lucide-react';
import type { SourceTier } from '@/lib/types';
import SourceBadge, { TierLegend } from '@/components/ui/SourceBadge';
import indexRaw from '@/lib/data/generated/sourcesIndex.json';

export const metadata = {
  title: 'Records & Sources — The Ledger',
  description: 'Every Florida civic dataset The Ledger has collected, with source, tier, fetch date, and per-record links.',
};

interface SampleRow {
  title: string;
  detail: string;
  date: string;
  link: string;
}
interface SourceEntry {
  id: string;
  label: string;
  category: string;
  file: string;
  source: { name: string; url?: string; tier: SourceTier; description?: string } | null;
  asOf: string | null;
  fetchedAt: string | null;
  fetchedLive: boolean;
  count: number;
  datasetUrl: string | null;
  note: string | null;
  errors: string[] | null;
  sample: SampleRow[];
}
interface SourcesIndex {
  generatedAt: string;
  sourceCount: number;
  sources: SourceEntry[];
}

const index = indexRaw as SourcesIndex;

function fmtTimestamp(iso: string | null): string {
  if (!iso) return 'unknown';
  return iso.length > 10 ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : iso;
}

function SourceCard({ s }: { s: SourceEntry }) {
  const fetched = s.fetchedAt ?? s.asOf;
  const blocked = !s.fetchedLive || s.count === 0;
  const isJournalism = s.source?.tier === 'media';
  const link = s.datasetUrl ?? s.source?.url ?? undefined;

  return (
    <div className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'rgba(11,25,41,0.7)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base">{s.label}</h3>
          <div className="text-white/40 text-xs mt-0.5">{s.source?.name ?? s.id}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {s.source && <SourceBadge source={s.source} />}
          {blocked ? (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-gray-500/30 text-gray-400 bg-gray-500/5">
              <CircleSlash className="h-3 w-3" /> No record
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-green-400/25 text-green-400 bg-green-400/5">
              <ShieldCheck className="h-3 w-3" /> {s.count.toLocaleString('en-US')} records
            </span>
          )}
        </div>
      </div>

      {/* Provenance line — required on every dataset */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-white/45 mb-3 border-l-2 border-[#d4ac52]/25 pl-2.5">
        <span title="When this snapshot was fetched">Fetched {fmtTimestamp(fetched)}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#c8a951]/85 hover:text-[#c8a951]">
            Source dataset <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        {isJournalism && (
          <span className="text-amber-300/90 border border-amber-400/30 bg-amber-400/5 rounded px-1.5 py-0 font-semibold uppercase tracking-wide" title="Tier 3 — corroborate with official records">
            Tier 3 · corroborate
          </span>
        )}
      </div>

      {s.note && <p className="text-white/35 text-xs leading-relaxed mb-3">{s.note}</p>}

      {blocked ? (
        <div className="rounded-lg border border-white/[0.06] p-3 text-sm text-gray-400" style={{ background: 'rgba(5,9,15,0.4)' }}>
          No verified record available.{s.errors && s.errors.length > 0 ? ` (${s.errors[0]})` : ''}
        </div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden" style={{ background: 'rgba(5,9,15,0.4)' }}>
          <div className="divide-y divide-white/[0.05]">
            {s.sample.map((r, i) => (
              <div key={i} className="px-3 py-2 grid grid-cols-[1fr_auto] gap-3 items-baseline">
                <div className="min-w-0">
                  <div className="text-white/85 text-sm truncate">{r.title}</div>
                  {r.detail && <div className="text-white/40 text-xs truncate">{r.detail}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  {r.date && <span className="text-white/40 tabular-nums">{r.date}</span>}
                  {r.link && (
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-[#c8a951]/70 hover:text-[#c8a951]" title="Open primary record">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {s.count > s.sample.length && (
            <div className="px-3 py-1.5 text-[11px] text-white/30 border-t border-white/[0.05]">
              Showing {s.sample.length} of {s.count.toLocaleString('en-US')} records · full snapshot at <code className="text-white/40">{s.file}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SourcesPage() {
  const sources = index.sources;
  const live = sources.filter((s) => s.fetchedLive && s.count > 0);
  const totalRecords = sources.reduce((sum, s) => sum + (s.fetchedLive ? s.count : 0), 0);
  const categories = [...new Set(sources.map((s) => s.category))];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-5 w-5 text-[#d4ac52]" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">Records &amp; Sources</h1>
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-3xl">
          Every Florida civic dataset The Ledger has collected, shown with its source, credibility tier,
          fetch date, and a direct link to each primary record. Figures are presented as the underlying
          records show them — dated, sourced, and linked — not as editorial conclusions.
        </p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div><span className="text-[#d4ac52] font-bold text-lg">{live.length}</span> <span className="text-white/45">live sources</span></div>
          <div><span className="text-[#d4ac52] font-bold text-lg">{totalRecords.toLocaleString('en-US')}</span> <span className="text-white/45">records</span></div>
          <div><span className="text-white/45">snapshot index built {fmtTimestamp(index.generatedAt)}</span></div>
        </div>
        <div className="mt-4"><TierLegend /></div>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="text-[#c8a951] text-sm font-semibold uppercase tracking-wider mb-3">{cat}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sources.filter((s) => s.category === cat).map((s) => <SourceCard key={s.id} s={s} />)}
          </div>
        </section>
      ))}

      <p className="text-white/30 text-xs mt-8 border-t border-white/[0.06] pt-4">
        Low-trust (Tier 3) sources are flagged and should be corroborated with official records. Sources marked
        “No verified record available” are awaiting an API key or a machine-readable feed.{' '}
        <Link href="/" className="text-[#c8a951]/70 hover:text-[#c8a951]">Back to the map</Link>.
      </p>
    </div>
  );
}
