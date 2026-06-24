/**
 * sync-legislation.ts
 *
 * Pulls RECENT congressional bills from GovTrack's public, KEYLESS API
 * (https://www.govtrack.us/api/v2/bill) and writes a normalized local snapshot
 * to `lib/data/generated/legislation.json` for the "Upcoming Legislation"
 * tracker (feature #7).
 *
 * GovTrack is a Tier-2 nonpartisan source (see lib/data/trustedSources.ts). Each
 * bill also gets a constructed Congress.gov (Tier-1 official) deep link.
 *
 * Data-credibility rules honored here:
 *   - No API key required; nothing is fabricated.
 *   - The keyless GovTrack `bill` list feed does NOT return cosponsor counts or a
 *     passage prognosis, so those fields are left undefined (never invented).
 *   - On ANY fetch failure (e.g. network blocked in the sandbox), we still write a
 *     VALID snapshot with an EMPTY bills array and meta explaining that the sync
 *     needs network access — so the build always succeeds with honest data.
 *
 * Run with:  npm run sync:legislation
 *   (re-run with network access if the sandbox blocks govtrack.us)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Bill, BillChamber, BillSponsor, BillStage, Source } from '../lib/types';
import { GOVTRACK, CONGRESS_GOV, toSource } from '../lib/data/trustedSources';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(projectRoot, 'lib', 'data', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'legislation.json');

const API = 'https://www.govtrack.us/api/v2/bill';
const TARGET_CONGRESS = 119;
const PAGE_SIZE = 60;
const MAX_PAGES = 2; // up to 120 of the most-recently-acted bills

// ── Raw GovTrack shapes (subset of fields we consume) ────────────────────────
interface RawSponsor {
  bioguideid?: string | null;
  firstname?: string;
  lastname?: string;
  name?: string;
  link?: string | null;
}
interface RawSponsorRole {
  party?: string | null;
  state?: string | null;
  district?: number | null;
}
interface RawBill {
  bill_type: string;
  bill_type_label?: string;
  congress: number;
  current_chamber?: string | null;
  current_status: string;
  current_status_date: string;
  current_status_description?: string;
  current_status_label: string;
  display_number?: string;
  introduced_date: string;
  is_alive?: boolean;
  link?: string;
  number: number;
  scheduled_consideration_date?: string | null;
  sponsor?: RawSponsor | null;
  sponsor_role?: RawSponsorRole | null;
  title?: string;
  title_without_number?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** English ordinal for a Congress number, e.g. 119 -> "119th", 121 -> "121st". */
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** GovTrack bill_type -> Congress.gov URL slug. */
const CONGRESS_GOV_SLUG: Record<string, string> = {
  house_bill: 'house-bill',
  senate_bill: 'senate-bill',
  house_resolution: 'house-resolution',
  senate_resolution: 'senate-resolution',
  house_concurrent_resolution: 'house-concurrent-resolution',
  senate_concurrent_resolution: 'senate-concurrent-resolution',
  house_joint_resolution: 'house-joint-resolution',
  senate_joint_resolution: 'senate-joint-resolution',
};

function chamberOf(billType: string): BillChamber {
  return billType.startsWith('senate') ? 'senate' : 'house';
}

function congressGovUrl(congress: number, billType: string, num: number): string {
  const slug = CONGRESS_GOV_SLUG[billType] ?? 'house-bill';
  return `https://www.congress.gov/bill/${ordinal(congress)}-congress/${slug}/${num}`;
}

/** Map GovTrack's machine status to a coarse, neutral stage bucket for filters. */
function stageOf(status: string): BillStage {
  const s = status.toLowerCase();
  if (s.startsWith('enacted')) return 'enacted';
  if (s.startsWith('prov_kill') || s.startsWith('fail') || s.startsWith('vetoed') || s.includes('override_fail')) {
    return 'failed';
  }
  if (s === 'passed_bill') return 'passed_both';
  if (s.startsWith('pass_over') || s.startsWith('pass_back') || s.startsWith('conference_passed') || s.startsWith('passed_')) {
    return 'passed_one_chamber';
  }
  if (s.startsWith('reported') || s.startsWith('referred') || s.startsWith('hearings')) return 'committee';
  if (s === 'introduced') return 'introduced';
  return 'other';
}

function billNumberFrom(raw: RawBill): string {
  if (raw.display_number) return raw.display_number.replace(/\s+/g, '');
  return `${raw.bill_type_label ?? ''}${raw.number}`.replace(/\s+/g, '') || String(raw.number);
}

function sponsorFrom(raw: RawBill): BillSponsor | undefined {
  const sp = raw.sponsor;
  if (!sp) return undefined;
  const name =
    [sp.firstname, sp.lastname].filter(Boolean).join(' ').trim() || sp.name?.trim();
  if (!name) return undefined;
  const role = raw.sponsor_role ?? {};
  return {
    name,
    bioguideId: sp.bioguideid ?? undefined,
    party: role.party ?? undefined,
    state: role.state ?? undefined,
    district: role.district != null ? String(role.district) : undefined,
    govTrackUrl: sp.link ?? undefined,
  };
}

function toBill(raw: RawBill, source: Source, asOf: string): Bill | null {
  if (!raw.bill_type || raw.number == null) return null;
  const chamber = chamberOf(raw.bill_type);
  return {
    id: `${raw.congress}-${raw.bill_type}-${raw.number}`,
    congress: raw.congress,
    billNumber: billNumberFrom(raw),
    billType: raw.bill_type,
    chamber,
    title: (raw.title_without_number || raw.title || '').trim() || `Bill ${raw.number}`,
    sponsor: sponsorFrom(raw),
    // cosponsorCount + govTrackPrognosis intentionally omitted — not in the keyless feed.
    introducedDate: raw.introduced_date,
    latestAction: {
      text: raw.current_status_label,
      date: raw.current_status_date,
      detail: raw.current_status_description?.trim() || undefined,
    },
    status: raw.current_status,
    statusLabel: raw.current_status_label,
    stage: stageOf(raw.current_status),
    isAlive: raw.is_alive ?? false,
    scheduledConsiderationDate: raw.scheduled_consideration_date ?? null,
    congressGovUrl: congressGovUrl(raw.congress, raw.bill_type, raw.number),
    govTrackUrl: raw.link ?? `https://www.govtrack.us/congress/bills/${raw.congress}/${raw.bill_type}${raw.number}`,
    source,
    asOf,
  };
}

async function fetchRecentBills(): Promise<RawBill[]> {
  const all: RawBill[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = `${API}?congress=${TARGET_CONGRESS}&sort=-current_status_date&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { objects?: RawBill[] };
    const objects = json.objects ?? [];
    all.push(...objects);
    if (objects.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(150);
  }
  return all;
}

const NEXT_STEPS: string[] = [
  'Cosponsor counts and CBO/JCT cost estimates are not in the keyless GovTrack list feed; integrate the Congress.gov API (CONGRESS_API_KEY) to add them.',
  'GovTrack no longer publishes a passage prognosis via the public API; passage probability stays hidden until a sourced model is wired in (govTrackPrognosis + passageProbabilitySource).',
  'Re-run `npm run sync:legislation` with network access to refresh the snapshot.',
];

async function main(): Promise<void> {
  const asOf = new Date().toISOString().slice(0, 10);
  const source: Source = { ...toSource(GOVTRACK), date: asOf };

  let bills: Bill[] = [];
  let fetchedLive = false;
  let note: string;

  try {
    console.log(`Fetching recent ${ordinal(TARGET_CONGRESS)} Congress bills from GovTrack ...`);
    const raw = await fetchRecentBills();
    bills = raw
      .map((r) => toBill(r, source, asOf))
      .filter((b): b is Bill => b !== null)
      .sort((a, b) => {
        const d = new Date(b.latestAction.date).getTime() - new Date(a.latestAction.date).getTime();
        if (d !== 0) return d;
        return b.congress - a.congress || b.billNumber.localeCompare(a.billNumber);
      });
    fetchedLive = true;
    note =
      `Recent and active bills from the ${ordinal(TARGET_CONGRESS)} Congress via GovTrack's keyless public API ` +
      `(Tier 2, nonpartisan), with constructed Congress.gov (Tier 1) deep links. Sorted by most recent action. ` +
      `Cosponsor counts and passage prognosis are not available from this feed and are omitted rather than estimated.`;
    console.log(`Received ${bills.length} bills.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`GovTrack fetch failed (${msg}). Writing an honest EMPTY snapshot — no rows fabricated.`);
    bills = [];
    fetchedLive = false;
    note =
      `Live GovTrack fetch unavailable when this snapshot was generated (${msg}). ` +
      `No bills are fabricated. Re-run \`npm run sync:legislation\` with network access to populate real records.`;
  }

  const snapshot = {
    meta: {
      source,
      asOf,
      count: bills.length,
      congress: TARGET_CONGRESS,
      fetchedLive,
      datasetUrl: `${API}?congress=${TARGET_CONGRESS}&sort=-current_status_date`,
      officialDeepLinkSource: toSource(CONGRESS_GOV),
      nextSteps: NEXT_STEPS,
      note,
    },
    bills,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUT_FILE}`);
  console.log(`  as-of: ${asOf}`);
  console.log(`  fetchedLive: ${fetchedLive}`);
  console.log(`  bills: ${bills.length}`);
  if (bills.length > 0) {
    const byStage = bills.reduce<Record<string, number>>((acc, b) => {
      acc[b.stage] = (acc[b.stage] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`  by stage: ${JSON.stringify(byStage)}`);
    console.log(`  scheduled for floor: ${bills.filter((b) => b.scheduledConsiderationDate).length}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
