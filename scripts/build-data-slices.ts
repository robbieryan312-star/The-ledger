/**
 * build-data-slices.ts — compile compact per-page JSON slices from /data snapshots.
 * Output: lib/data/generated/slices/*.json (imported by client pages; keep small).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Source } from '../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(projectRoot, 'data', 'florida');
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

export interface BundleSection {
  sourceId: string;
  label: string;
  meta: Record<string, unknown>;
  records: Record<string, unknown>[];
}

interface ExistingBundle {
  asOf?: string;
  fetchedAt?: string;
  sections?: BundleSection[];
}

async function loadSnapshot(rel: string): Promise<RawSnapshot | null> {
  try {
    const raw = await readFile(path.join(DATA, rel), 'utf8');
    return JSON.parse(raw) as RawSnapshot;
  } catch {
    return null;
  }
}

async function loadExistingBundle(fileName: string): Promise<ExistingBundle | null> {
  try {
    const raw = await readFile(path.join(OUT_DIR, fileName), 'utf8');
    const parsed = JSON.parse(raw) as ExistingBundle;
    return Array.isArray(parsed.sections) ? parsed : null;
  } catch {
    return null;
  }
}

export function mergeSectionsPreservingMissing(
  freshSections: BundleSection[],
  existingSections: BundleSection[],
  orderedSourceIds: string[],
): BundleSection[] {
  const freshById = new Map(freshSections.map((section) => [section.sourceId, section]));
  const existingById = new Map(existingSections.map((section) => [section.sourceId, section]));
  const emitted = new Set<string>();
  const merged: BundleSection[] = [];

  for (const sourceId of orderedSourceIds) {
    const section = freshById.get(sourceId) ?? existingById.get(sourceId);
    if (section) {
      merged.push(section);
      emitted.add(sourceId);
    }
  }

  for (const section of existingSections) {
    if (!emitted.has(section.sourceId)) {
      merged.push(section);
      emitted.add(section.sourceId);
    }
  }

  for (const section of freshSections) {
    if (!emitted.has(section.sourceId)) {
      merged.push(section);
      emitted.add(section.sourceId);
    }
  }

  return merged;
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
  const skip = new Set([...TITLE_FIELDS, ...DATE_FIELDS, ...LINK_FIELDS, 'source', 'asOf', 'tierFlag', 'stateCode', 'bioguideId', 'summary', 'summarySource', 'summaryFallback', 'officialTitle']);
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
  officialTitle?: string;
  summary?: string;
  summarySource?: string;
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

function toCourtRow(rec: Record<string, unknown>, id: string) {
  const source = (rec.source && typeof rec.source === 'object' ? rec.source : {}) as Source;
  const caseName = String(rec.caseName ?? 'No record on file');
  const status = String(rec.status ?? '');
  const sourceText = String(rec.summary ?? '').trim();
  const docket = String(rec.docketNumber ?? '');
  const court = String(rec.court ?? '');
  const detailParts = [court, docket, status].filter((p) => p && p !== 'No record on file');
  return {
    id,
    title: caseName,
    officialTitle: caseName,
    summary: sourceText || undefined,
    summarySource: rec.summarySource ? String(rec.summarySource) : undefined,
    detail: detailParts.join(' · ') || undefined,
    date: pick(rec, DATE_FIELDS) || undefined,
    link: pick(rec, LINK_FIELDS) || source.url,
    source,
    asOf: String(rec.asOf ?? source.date ?? ''),
  };
}

function toLegiscanRow(rec: Record<string, unknown>, id: string) {
  const source = (rec.source && typeof rec.source === 'object' ? rec.source : {}) as Source;
  const billNumber = String(rec.billNumber ?? '');
  const officialTitle = String(rec.title ?? 'No record on file');
  const summary = String(rec.summary ?? '').trim();
  const headline = summary || (billNumber ? `${billNumber}: ${officialTitle}` : officialTitle);
  const statusDate = String(rec.statusDate ?? '');
  const currentBody = rec.currentBody ? String(rec.currentBody) : '';
  const detailParts = [billNumber, statusDate, currentBody].filter(Boolean);
  return {
    id,
    title: headline,
    officialTitle,
    summary: summary || undefined,
    detail: detailParts.join(' · ') || undefined,
    date: statusDate || undefined,
    link: pick(rec, LINK_FIELDS) || source.url,
    source,
    asOf: String(rec.asOf ?? source.date ?? ''),
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
  const cpi = await loadSnapshot('bls/florida-cpi.json');
  const growth = await loadSnapshot('bls/florida-employment-growth.json');
  const education = await loadSnapshot('bls/florida-education-labor.json');
  const benchmarks = await loadSnapshot('bls/florida-national-benchmarks.json');
  const occupations = await loadSnapshot('bls/florida-occupations.json');
  if (!census && !bls) return;

  type HistoryPoint = { period: string; value: number };
  type EducationTier = {
    educationLevel: string;
    unemploymentRate: number | null;
    unemploymentPeriod: string | null;
    unemploymentGapReason?: string;
    medianWeeklyEarnings: number | null;
    medianAnnualEarnings: number | null;
    earningsPeriod: string | null;
    earningsUnit: string;
    annualEarningsNote?: string;
    note?: string;
    source: Source;
    link?: string;
  };
  type Indicator = {
    label: string;
    rawValue: number;
    unit: string;
    period?: string;
    link?: string;
    source: Source;
    asOf: string;
    history?: HistoryPoint[];
    nationalValue?: number;
    nationalLabel?: string;
    note?: string;
    tenYearGrowthPct?: number | null;
    geography?: string;
  };

  const indicators: Indicator[] = [];
  const educationTiers: EducationTier[] = [];
  const honestGaps: string[] = [];
  const primary = census ?? bls!;
  const cRec = census?.records[0];

  const nationalByFloridaLabel = new Map<string, number>();
  for (const b of benchmarks?.records ?? []) {
    const match = String(b.matchesFloridaIndicator ?? '');
    const val = b.latestValue;
    if (!match || val == null) continue;
    const n = Number.parseFloat(String(val).replace(/,/g, ''));
    if (Number.isFinite(n)) nationalByFloridaLabel.set(match, n);
  }

  function parseHistory(recent: unknown): HistoryPoint[] | undefined {
    if (!Array.isArray(recent)) return undefined;
    const points: HistoryPoint[] = [];
    for (const row of recent) {
      if (!row || typeof row !== 'object') continue;
      const period = String((row as { period?: string }).period ?? '');
      const raw = (row as { value?: string | number }).value;
      if (raw === '-' || raw == null || raw === '') continue;
      const value = Number.parseFloat(String(raw).replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;
      points.push({ period, value });
    }
    return points.length > 0 ? points : undefined;
  }

  function pushBlsRecord(b: Record<string, unknown>, blsMeta: RawSnapshot) {
    const latestRaw = b.latestValue;
    const value =
      latestRaw === '-' || latestRaw == null
        ? NaN
        : Number.parseFloat(String(latestRaw).replace(/,/g, ''));
    if (!Number.isFinite(value)) return;
    const label = String(b.indicator);
    const matchKey = label;
    indicators.push({
      label,
      rawValue: value,
      unit: String(b.unit ?? ''),
      period: String(b.latestPeriod ?? ''),
      link: String(b.blsUrl ?? blsMeta.meta.datasetUrl ?? ''),
      source: b.source as Source,
      asOf: String(b.asOf),
      history: parseHistory(b.recent),
      nationalValue: nationalByFloridaLabel.get(matchKey),
      nationalLabel: nationalByFloridaLabel.has(matchKey) ? 'US avg' : undefined,
      note: b.note ? String(b.note) : undefined,
      tenYearGrowthPct:
        b.tenYearGrowthPct != null ? Number(b.tenYearGrowthPct) : undefined,
      geography: b.geography ? String(b.geography) : undefined,
    });
  }

  if (cRec) {
    indicators.push({
      label: 'Population',
      rawValue: Number(cRec.population),
      unit: 'count',
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? census!.meta.datasetUrl ?? ''),
      source: cRec.source as Source,
      asOf: String(cRec.asOf),
    });
    indicators.push({
      label: 'Median household income',
      rawValue: Number(cRec.medianHouseholdIncome),
      unit: 'USD',
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? ''),
      source: cRec.source as Source,
      asOf: String(cRec.asOf),
    });
    indicators.push({
      label: 'Median home value',
      rawValue: Number(cRec.medianHomeValue),
      unit: 'USD',
      period: String(cRec.survey ?? ''),
      link: String(cRec.censusApiUrl ?? ''),
      source: cRec.source as Source,
      asOf: String(cRec.asOf),
    });
  }

  if (bls) {
    for (const b of bls.records) pushBlsRecord(b, bls);
  }

  if (cpi) {
    const flCpi = cpi.records.find((r) => r.geography === 'FL');
    if (flCpi) {
      pushBlsRecord(flCpi, cpi);
    } else {
      honestGaps.push('Florida-specific Consumer Price Index');
      const usRef = cpi.records.find((r) => r.geography === 'US');
      if (usRef) pushBlsRecord(usRef, cpi);
    }
  }

  if (growth) {
    for (const g of growth.records) pushBlsRecord(g, growth);
  }

  for (const tier of education?.records ?? []) {
    educationTiers.push({
      educationLevel: String(tier.educationLevel),
      unemploymentRate:
        tier.unemploymentRate != null ? Number(tier.unemploymentRate) : null,
      unemploymentPeriod: tier.unemploymentPeriod ? String(tier.unemploymentPeriod) : null,
      unemploymentGapReason: tier.unemploymentGapReason
        ? String(tier.unemploymentGapReason)
        : undefined,
      medianWeeklyEarnings:
        tier.medianWeeklyEarnings != null ? Number(tier.medianWeeklyEarnings) : null,
      medianAnnualEarnings:
        tier.medianAnnualEarnings != null
          ? Number(tier.medianAnnualEarnings)
          : tier.medianWeeklyEarnings != null
            ? Math.round(Number(tier.medianWeeklyEarnings) * 52)
            : null,
      earningsPeriod: tier.earningsPeriod ? String(tier.earningsPeriod) : null,
      earningsUnit: String(tier.earningsUnit ?? 'USD/week'),
      annualEarningsNote: tier.annualEarningsNote
        ? String(tier.annualEarningsNote)
        : 'Annualized (weekly × 52)',
      note: tier.note ? String(tier.note) : undefined,
      source: tier.source as Source,
      link: tier.blsUrl ? String(tier.blsUrl) : undefined,
    });
  }

  if (occupations && occupations.records.length === 0) {
    honestGaps.push('Fastest-growing occupations (BLS projections not in v1 API)');
  }

  const out = {
    meta: {
      source: primary.meta.source,
      asOf: primary.meta.asOf,
      fetchedAt: primary.meta.fetchedAt,
      totalCount: indicators.length,
      note: 'Florida Census ACS demographics, BLS labor/CPI/growth, US CPS education reference, national benchmarks.',
      honestGaps: honestGaps.length ? honestGaps : undefined,
      educationNote: education?.meta.note,
    },
    stateCode: 'FL',
    stateName: String(cRec?.stateName ?? 'Florida'),
    indicators,
    educationTiers,
  };
  await writeFile(path.join(OUT_DIR, 'state-economic.json'), JSON.stringify(out, null, 2));
}

async function buildJudiciaryCourts() {
  const snap = await loadSnapshot('courts/florida-court-opinions.json');
  if (!snap) return;
  const out = {
    meta: sliceMeta(snap),
    records: snap.records.slice(0, 15).map((r, i) => toCourtRow(r, `court-${i}`)),
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
  const outFile = 'legislation-florida.json';
  const existing = await loadExistingBundle(outFile);
  const sections: BundleSection[] = [];
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
      records: snap.records.slice(0, src.limit).map((r, i) =>
        src.id === 'legiscan' ? toLegiscanRow(r, `${src.id}-${i}`) : toRow(r, `${src.id}-${i}`),
      ),
    });
  }
  if (!sections.length) return;
  const mergedSections = mergeSectionsPreservingMissing(
    sections,
    existing?.sections ?? [],
    sources.map((src) => src.id),
  );
  await writeFile(
    path.join(OUT_DIR, outFile),
    JSON.stringify(
      { asOf: asOf || existing?.asOf || '', fetchedAt: fetchedAt ?? existing?.fetchedAt, sections: mergedSections },
      null,
      2,
    ),
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
  const outFile = 'news-florida.json';
  const existing = await loadExistingBundle(outFile);
  const sections: BundleSection[] = [];
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
  const mergedSections = mergeSectionsPreservingMissing(
    sections,
    existing?.sections ?? [],
    sources.map((src) => src.id),
  );
  await writeFile(
    path.join(OUT_DIR, outFile),
    JSON.stringify(
      { asOf: asOf || existing?.asOf || '', fetchedAt: fetchedAt ?? existing?.fetchedAt, sections: mergedSections },
      null,
      2,
    ),
  );
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

const isDirectRun =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
