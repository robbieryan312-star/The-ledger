/**
 * build-data-slices.ts — compile compact per-page JSON slices from /data snapshots.
 * Output: lib/data/generated/slices/*.json (imported by client pages; keep small).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source } from '../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(projectRoot, 'data');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated', 'slices');

const TITLE_FIELDS = ['title', 'caseName', 'recipient', 'company', 'indicator', 'name', 'billNumber'];
const DATE_FIELDS = ['date', 'dateFiled', 'publicationDate', 'dateIssued', 'statusDate', 'filingDate', 'publishedAt', 'latestPeriod'];
const LINK_FIELDS = ['opinionUrl', 'documentUrl', 'filingUrl', 'legiscanUrl', 'voteviewUrl', 'govinfoUrl', 'openstatesUrl', 'url', 'sourceUrl', 'blsUrl'];

interface RawSnapshot {
  meta: {
    source: Source;
    asOf: string;
    fetchedAt?: string;
    count: number;
    datasetUrl?: string;
    note?: string;
    tierFlag?: string;
  };
  records: Record<string, unknown>[];
}

async function loadSnapshot(rel: string): Promise<RawSnapshot | null> {
  try {
    const raw = await readFile(path.join(DATA, rel), 'utf8');
    return JSON.parse(raw) as RawSnapshot;
  } catch {
    return null;
  }
}

function pick(rec: Record<string, unknown>, fields: string[]): string {
  for (const f of fields) {
    const v = rec[f];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

function detailOf(rec: Record<string, unknown>): string {
  const parts: string[] = [];
  const skip = new Set([...TITLE_FIELDS, ...DATE_FIELDS, ...LINK_FIELDS, 'source', 'asOf', 'tierFlag', 'stateCode', 'bioguideId']);
  for (const [k, v] of Object.entries(rec)) {
    if (skip.has(k) || v == null || v === '' || typeof v === 'object') continue;
    let val = String(v);
    if (typeof v === 'number' && /amount|income|value|population/i.test(k)) {
      val = v >= 1000 ? v.toLocaleString('en-US') : String(v);
      if (/amount|income|value/i.test(k)) val = `$${val}`;
    }
    parts.push(val);
    if (parts.length >= 3) break;
  }
  return parts.join(' · ');
}

function toRow(rec: Record<string, unknown>, id: string): {
  id: string;
  title: string;
  detail?: string;
  date?: string;
  link?: string;
  source: Source;
  asOf: string;
  tierFlag?: string;
} {
  const source = (rec.source && typeof rec.source === 'object' ? rec.source : {}) as Source;
  const link = pick(rec, LINK_FIELDS) || source.url;
  return {
    id,
    title: pick(rec, TITLE_FIELDS) || 'Record',
    detail: detailOf(rec) || undefined,
    date: pick(rec, DATE_FIELDS) || undefined,
    link: link || undefined,
    source,
    asOf: String(rec.asOf ?? source.date ?? ''),
    tierFlag: rec.tierFlag ? String(rec.tierFlag) : undefined,
  };
}

function sliceMeta(snap: RawSnapshot, totalCount?: number) {
  return {
    source: snap.meta.source,
    asOf: snap.meta.asOf,
    fetchedAt: snap.meta.fetchedAt,
    totalCount: totalCount ?? snap.meta.count,
    datasetUrl: snap.meta.datasetUrl,
    note: snap.meta.note,
    tierFlag: snap.meta.tierFlag,
  };
}

async function buildFinanceFldoe() {
  const snap = await loadSnapshot('fldoe/florida-contributions.json');
  if (!snap) return;
  const sorted = [...snap.records].sort(
    (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0),
  );
  const out = {
    meta: sliceMeta(snap),
    records: sorted.slice(0, 25).map((r, i) => toRow(r, `fldoe-${i}`)),
  };
  await writeFile(path.join(OUT_DIR, 'finance-fldoe.json'), JSON.stringify(out, null, 2));
}

async function buildProfilesVoteview() {
  const snap = await loadSnapshot('voteview/florida-ideology.json');
  if (!snap) return;
  const byBioguideId: Record<string, unknown> = {};
  for (const rec of snap.records) {
    const id = String(rec.bioguideId ?? '');
    if (!id) continue;
    byBioguideId[id] = {
      bioguideId: id,
      name: rec.name,
      chamber: rec.chamber,
      party: rec.party,
      district: rec.district,
      nominateEconomic: rec.nominateEconomic,
      nominateSocial: rec.nominateSocial,
      congress: rec.congress,
      source: rec.source,
      asOf: rec.asOf,
      voteviewUrl: rec.voteviewUrl,
    };
  }
  const out = { meta: sliceMeta(snap), byBioguideId };
  await writeFile(path.join(OUT_DIR, 'profiles-voteview.json'), JSON.stringify(out, null, 2));
}

async function buildStateEconomic() {
  const census = await loadSnapshot('census/florida-demographics.json');
  const bls = await loadSnapshot('bls/florida-labor.json');
  if (!census && !bls) return;

  const indicators: Record<string, unknown>[] = [];
  const primary = census ?? bls!;
  const cRec = census?.records[0];
  if (cRec) {
    indicators.push({
      label: 'Population',
      value: Number(cRec.population).toLocaleString('en-US'),
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? census!.meta.datasetUrl ?? ''),
      source: cRec.source,
      asOf: String(cRec.asOf),
    });
    indicators.push({
      label: 'Median household income',
      value: `$${Number(cRec.medianHouseholdIncome).toLocaleString('en-US')}`,
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? ''),
      source: cRec.source,
      asOf: String(cRec.asOf),
    });
    indicators.push({
      label: 'Median home value',
      value: `$${Number(cRec.medianHomeValue).toLocaleString('en-US')}`,
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? ''),
      source: cRec.source,
      asOf: String(cRec.asOf),
    });
  }
  for (const b of bls?.records ?? []) {
    indicators.push({
      label: String(b.indicator),
      value: `${b.latestValue}${b.unit ? ` ${b.unit}` : ''}`,
      period: String(b.latestPeriod ?? ''),
      link: String(b.blsUrl ?? bls!.meta.datasetUrl ?? ''),
      source: b.source,
      asOf: String(b.asOf),
    });
  }

  const out = {
    meta: {
      source: primary.meta.source,
      asOf: primary.meta.asOf,
      fetchedAt: primary.meta.fetchedAt,
      totalCount: indicators.length,
      note: 'Florida state-level Census ACS demographics and BLS labor statistics.',
    },
    stateCode: 'FL',
    stateName: String(cRec?.stateName ?? 'Florida'),
    indicators,
  };
  await writeFile(path.join(OUT_DIR, 'state-economic.json'), JSON.stringify(out, null, 2));
}

async function buildJudiciaryCourts() {
  const snap = await loadSnapshot('courts/florida-court-opinions.json');
  if (!snap) return;
  const out = {
    meta: sliceMeta(snap),
    records: snap.records.slice(0, 15).map((r, i) => toRow(r, `court-${i}`)),
  };
  await writeFile(path.join(OUT_DIR, 'judiciary-courts.json'), JSON.stringify(out, null, 2));
}

async function buildLegislationBundle() {
  const sources: { id: string; label: string; path: string; limit: number }[] = [
    { id: 'legiscan', label: 'LegiScan — Florida bills', path: 'legiscan/florida-legislation.json', limit: 12 },
    { id: 'openstates', label: 'OpenStates — Florida legislators', path: 'openstates/florida-legislators.json', limit: 12 },
    { id: 'govinfo', label: 'GovInfo — Florida documents', path: 'govinfo/florida-legislative-docs.json', limit: 10 },
    { id: 'fedregister', label: 'Federal Register — Florida', path: 'fedregister/florida-documents.json', limit: 10 },
  ];
  const sections = [];
  let asOf = '';
  let fetchedAt: string | undefined;
  for (const src of sources) {
    const snap = await loadSnapshot(src.path);
    if (!snap) continue;
    asOf = snap.meta.asOf;
    fetchedAt = snap.meta.fetchedAt ?? fetchedAt;
    sections.push({
      sourceId: src.id,
      label: src.label,
      meta: sliceMeta(snap),
      records: snap.records.slice(0, src.limit).map((r, i) => toRow(r, `${src.id}-${i}`)),
    });
  }
  if (!sections.length) return;
  await writeFile(
    path.join(OUT_DIR, 'legislation-florida.json'),
    JSON.stringify({ asOf, fetchedAt, sections }, null, 2),
  );
}

async function buildFilingsSec() {
  const snap = await loadSnapshot('secedgar/florida-filings.json');
  if (!snap) return;
  const out = {
    meta: sliceMeta(snap),
    records: snap.records.slice(0, 20).map((r, i) => toRow(r, `edgar-${i}`)),
  };
  await writeFile(path.join(OUT_DIR, 'filings-secedgar.json'), JSON.stringify(out, null, 2));
}

async function buildLobbyingFl() {
  const snap = await loadSnapshot('fllobbyist/florida-lobbying-firm-directories.json');
  if (!snap) return;
  const out = {
    meta: sliceMeta(snap),
    records: snap.records.slice(0, 20).map((r, i) => toRow(r, `fllobby-${i}`)),
  };
  await writeFile(path.join(OUT_DIR, 'lobbying-fllobbyist.json'), JSON.stringify(out, null, 2));
}

async function buildNewsBundle() {
  const sources: { id: string; label: string; path: string; limit: number }[] = [
    { id: 'newsapi', label: 'NewsAPI — Florida coverage', path: 'news/florida-coverage.json', limit: 12 },
    { id: 'gdelt', label: 'GDELT — Florida coverage', path: 'gdelt/florida-coverage.json', limit: 12 },
  ];
  const sections = [];
  let asOf = '';
  let fetchedAt: string | undefined;
  for (const src of sources) {
    const snap = await loadSnapshot(src.path);
    if (!snap) continue;
    asOf = snap.meta.asOf;
    fetchedAt = snap.meta.fetchedAt ?? fetchedAt;
    sections.push({
      sourceId: src.id,
      label: src.label,
      meta: { ...sliceMeta(snap), tierFlag: snap.meta.tierFlag ?? 'Tier 3 — corroborate with official records' },
      records: snap.records.slice(0, src.limit).map((r, i) => toRow(r, `${src.id}-${i}`)),
    });
  }
  if (!sections.length) return;
  await writeFile(path.join(OUT_DIR, 'news-florida.json'), JSON.stringify({ asOf, fetchedAt, sections }, null, 2));
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    buildFinanceFldoe(),
    buildProfilesVoteview(),
    buildStateEconomic(),
    buildJudiciaryCourts(),
    buildLegislationBundle(),
    buildFilingsSec(),
    buildLobbyingFl(),
    buildNewsBundle(),
  ]);
  console.log('Wrote data slices to lib/data/generated/slices/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
