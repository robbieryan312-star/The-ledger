'use client';

import Link from 'next/link';
import { ExternalLink, Info } from 'lucide-react';
import type {
  LegislationBundleSlice,
  NewsBundleSlice,
  SnapshotRecordRow,
  SnapshotSlice,
  SnapshotSliceMeta,
  StateEconomicSlice,
} from '@/lib/data/snapshotTypes';
import SourceProvenance from '@/components/ui/SourceProvenance';

function formatFetchedAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function MetaStrip({ meta, moreHref }: { meta: SnapshotSliceMeta; moreHref?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <SourceProvenance source={meta.source} asOf={meta.asOf} size="sm" />
      {meta.fetchedAt && (
        <span className="text-[10px] text-gray-500">
          Fetched {formatFetchedAt(meta.fetchedAt)}
        </span>
      )}
      {meta.tierFlag && (
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-400/30 text-amber-300/90 bg-amber-400/5 font-semibold uppercase tracking-wide">
          {meta.tierFlag}
        </span>
      )}
      {meta.datasetUrl && (
        <a
          href={meta.datasetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#c8a951] hover:text-white inline-flex items-center gap-0.5"
        >
          Dataset <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
      {moreHref && (
        <Link href={moreHref} className="text-[10px] text-gray-400 hover:text-[#c8a951] ml-auto">
          All sources →
        </Link>
      )}
    </div>
  );
}

function RecordRow({ row }: { row: SnapshotRecordRow }) {
  return (
    <li className="px-4 py-3 hover:bg-[#1e3a5f]/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {row.link ? (
            <a
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white font-medium hover:text-[#c8a951] inline-flex items-center gap-1"
            >
              <span className="truncate">{row.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
            </a>
          ) : (
            <div className="text-sm text-white font-medium truncate">{row.title}</div>
          )}
          {row.detail && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{row.detail}</p>}
          <div className="mt-1.5">
            <SourceProvenance source={row.source} recordDate={row.date} asOf={row.asOf} />
          </div>
        </div>
        {row.date && (
          <span className="text-[10px] text-gray-500 flex-shrink-0 whitespace-nowrap">{row.date}</span>
        )}
      </div>
    </li>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  slice: SnapshotSlice;
  moreHref?: string;
}

export function FloridaRecordPanel({ title, subtitle, slice, moreHref = '/sources' }: PanelProps) {
  if (!slice.records.length) return null;
  return (
    <section className="bg-[#0d1f35] rounded-2xl border border-[#1e3a5f] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0a1628]">
        <h2 className="text-white font-bold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>}
        <p className="text-[10px] text-gray-500 mt-1">
          {slice.meta.totalCount} record{slice.meta.totalCount !== 1 ? 's' : ''} on file
          {slice.records.length < slice.meta.totalCount ? ` · showing ${slice.records.length}` : ''}
        </p>
      </div>
      <div className="px-5 py-3 border-b border-[#1e3a5f]/60">
        <MetaStrip meta={slice.meta} moreHref={moreHref} />
        {slice.meta.note && (
          <p className="text-[10px] text-gray-500 leading-relaxed flex items-start gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-gray-600" />
            {slice.meta.note}
          </p>
        )}
      </div>
      <ul className="divide-y divide-[#1e3a5f]">
        {slice.records.map((row) => (
          <RecordRow key={row.id} row={row} />
        ))}
      </ul>
    </section>
  );
}

export function FloridaStateEconomicPanel({ slice }: { slice: StateEconomicSlice }) {
  if (!slice.indicators.length) return null;
  return (
    <section className="bg-[#0d1f35] rounded-xl border border-[#1e3a5f] p-4 mb-4">
      <h3 className="text-white font-semibold text-sm mb-1">
        {slice.stateName} — official demographics & labor
      </h3>
      <MetaStrip meta={slice.meta} />
      <dl className="grid grid-cols-2 gap-3 mt-2">
        {slice.indicators.map((ind) => (
          <div key={ind.label} className="bg-[#0a1628] rounded-lg p-3 border border-[#1e3a5f]/60">
            <dt className="text-[10px] text-gray-500 uppercase tracking-wide">{ind.label}</dt>
            <dd className="text-white font-bold text-lg mt-0.5">{ind.value}</dd>
            {ind.period && <dd className="text-[10px] text-gray-500">{ind.period}</dd>}
            <dd className="mt-1.5">
              <SourceProvenance source={ind.source} recordDate={ind.period} asOf={ind.asOf} />
            </dd>
            {ind.link && (
              <a
                href={ind.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#c8a951] hover:text-white inline-flex items-center gap-0.5 mt-1"
              >
                Source record <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}

export function FloridaLegislationSections({ bundle }: { bundle: LegislationBundleSlice }) {
  return (
    <div className="space-y-6">
      {bundle.sections.map((section) => (
        <FloridaRecordPanel
          key={section.sourceId}
          title={section.label}
          slice={{ meta: section.meta, records: section.records }}
        />
      ))}
    </div>
  );
}

export function FloridaNewsSections({ bundle }: { bundle: NewsBundleSlice }) {
  return (
    <div className="space-y-6">
      {bundle.sections.map((section) => (
        <FloridaRecordPanel
          key={section.sourceId}
          title={section.label}
          subtitle="Tier 3 journalism — corroborate with official records when possible."
          slice={{ meta: section.meta, records: section.records }}
        />
      ))}
    </div>
  );
}
