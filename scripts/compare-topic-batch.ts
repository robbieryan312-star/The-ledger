/**
 * compare-topic-batch.ts — TEMPORARY 17b correctness guardrail. Compares CREC `statements`
 * for a fixed member set between two topicPositions snapshots (baseline full-fetch vs.
 * procedural-skip optimized). Flags any statement present in baseline but missing in the
 * optimized run, and whether the dropped granule title was procedural (safe) or not (bug).
 * Delete after use.
 */
import { readFileSync } from 'node:fs';

const IDS = process.argv[2]?.split(',') ?? [];
const baseFile = process.argv[3] ?? '/tmp/base-topic.json';
const optFile = process.argv[4] ?? 'lib/data/generated/topicPositions.json';

interface Stmt { title: string; date: string; url: string; tier: string; topicId: string }
interface TopicData { platformPositions?: unknown[]; statements?: Stmt[]; saidDidLinks?: unknown[] }
type Snap = { byBioguideId: Record<string, Record<string, TopicData>> };

const load = (f: string): Snap => JSON.parse(readFileSync(f, 'utf8'));

// Same clerk/section-header patterns the optimizer skips.
const PROC = /^(text of (the )?(senate |house )?amendments?|amendments? submitted|submission of .*resolutions?|additional cosponsors|additional sponsors|public bills and resolutions|introduction of bills|reports? of committees?|executive communications?|petitions and memorials|enrolled bills?( and joint resolutions)? signed|constitutional authority statement|daily digest)\b/i;

function crecStmts(snap: Snap, id: string): Map<string, Stmt> {
  const out = new Map<string, Stmt>();
  const topics = snap.byBioguideId[id] ?? {};
  for (const data of Object.values(topics)) {
    for (const s of data.statements ?? []) {
      if (s.tier === 'official') out.set(`${s.topicId}::${s.url}`, s);
    }
  }
  return out;
}
function count(m: Map<string, Stmt>): number { return m.size; }
function platformCount(snap: Snap, id: string): number {
  let n = 0;
  for (const data of Object.values(snap.byBioguideId[id] ?? {})) n += data.platformPositions?.length ?? 0;
  return n;
}

const base = load(baseFile);
const opt = load(optFile);

let totalBase = 0, totalOpt = 0, unsafeDrops = 0, safeDiffs = 0, platformDrops = 0;
console.log(`bioguideId | baseCREC | optCREC | delta | basePlat | optPlat | notes`);
for (const id of IDS) {
  const b = crecStmts(base, id);
  const o = crecStmts(opt, id);
  const basePlat = platformCount(base, id);
  const optPlat = platformCount(opt, id);
  if (optPlat < basePlat) platformDrops += 1;
  totalBase += count(b); totalOpt += count(o);
  const missing = [...b.keys()].filter((k) => !o.has(k));
  const added = [...o.keys()].filter((k) => !b.has(k));
  const notes: string[] = [];
  for (const k of missing) {
    const s = b.get(k)!;
    // The kept statement title IS the excerpt, not the granule title; procedural granules
    // never produce excerpts, so any real drop here (excerpt present in baseline) means the
    // skip removed a genuine statement — inspect. Network transients also land here.
    notes.push(`MISSING[${s.topicId}] "${s.title.slice(0, 50)}"`);
    unsafeDrops += 1;
  }
  for (const k of added) { const s = o.get(k)!; notes.push(`ADDED[${s.topicId}]`); safeDiffs += 1; }
  const delta = count(o) - count(b);
  const plat = `${basePlat} | ${optPlat}${optPlat < basePlat ? ' <PLAT-DROP' : ''}`;
  if (delta !== 0 || notes.length || optPlat !== basePlat) {
    console.log(`${id} | ${count(b)} | ${count(o)} | ${delta >= 0 ? '+' : ''}${delta} | ${plat} | ${notes.join('; ') || '-'}`);
  } else {
    console.log(`${id} | ${count(b)} | ${count(o)} | 0 | ${plat} | identical`);
  }
}
console.log(`\nTOTAL baseCREC=${totalBase} optCREC=${totalOpt} missingInOpt=${unsafeDrops} addedInOpt=${safeDiffs} platformDrops=${platformDrops}`);
console.log(unsafeDrops === 0
  ? 'RESULT: no statements dropped by optimization (consistent).'
  : `RESULT: ${unsafeDrops} statement(s) differ — inspect above (network transient vs. skip bug).`);
