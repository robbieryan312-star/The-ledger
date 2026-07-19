/**
 * Shared helpers for Florida /data/ ingestion scripts.
 * Keys load from .env.local only — never hardcode or log secrets.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source } from '../../lib/types';
import type { DataProvenance } from '../../lib/data/provenance';

export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export const DATA_ROOT = path.join(projectRoot, 'data');

export async function loadEnvLocal(): Promise<void> {
  const envPath = path.join(projectRoot, '.env.local');
  try {
    const content = await readFile(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

export async function appendEnvLocal(entries: Record<string, string>): Promise<void> {
  const envPath = path.join(projectRoot, '.env.local');
  let existing = '';
  try {
    existing = await readFile(envPath, 'utf8');
  } catch {
    // new file
  }
  const lines: string[] = existing.trimEnd() ? [existing.trimEnd(), ''] : [];
  for (const [key, value] of Object.entries(entries)) {
    if (existing.includes(`${key}=`)) continue;
    lines.push(`${key}=${value}`);
  }
  await writeFile(envPath, lines.join('\n') + '\n', 'utf8');
}

export interface DataSnapshotMeta {
  source: Source;
  asOf: string;
  count: number;
  stateCode: 'FL';
  fetchedLive: boolean;
  /** Prefer over boolean fetchedLive alone — see lib/data/provenance.ts */
  provenance?: DataProvenance;
  errors?: string[];
  note?: string;
  datasetUrl?: string;
  /** ISO timestamp of when this snapshot was fetched/generated (UI provenance recency). */
  fetchedAt?: string;
}

export async function writeFloridaSnapshot<T>(
  subdir: string,
  filename: string,
  payload: { meta: DataSnapshotMeta; records: T[] },
): Promise<string> {
  const dir = path.join(DATA_ROOT, 'florida', subdir);
  await mkdir(dir, { recursive: true });
  const outFile = path.join(dir, filename);
  await writeFile(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return outFile;
}

// ─── Data-loss prevention (core-rules §6): never overwrite a live snapshot with empty ───

/** Read a prior snapshot JSON from disk, or null if absent/unreadable/invalid. */
export async function readPriorSnapshot(outFile: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(outFile, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * True when a snapshot payload represents live/verified data worth preserving.
 * Checks the explicit provenance enum first, then legacy boolean/split-live flags.
 */
export function snapshotIsLive(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const meta = (payload as { meta?: Record<string, unknown> }).meta;
  if (!meta || typeof meta !== 'object') return false;
  if (meta.provenance === 'fetched-live' || meta.provenance === 'computed-from-published-tables') {
    return true;
  }
  if (meta.fetchedLive === true) return true;
  return (
    meta.censusFetchedLive === true ||
    meta.blsFetchedLive === true ||
    meta.attainmentFetchedLive === true
  );
}

export type PreserveResult = { action: 'written' | 'preserved-prior'; outFile: string };

/**
 * Write `nextPayload` to `outFile` UNLESS it is a non-live (honest-gap / empty) snapshot that
 * would clobber a prior live one — in which case the prior file is preserved untouched and the
 * fetch failure is surfaced via the caller's non-zero exit. Prevents the DATA-02..05 defect
 * class where a failed re-fetch overwrites verified data with nulls (core-rules §6).
 *
 * Passing `--full-corpus`-style force is intentionally NOT supported: a genuine gap is only
 * written when there is no prior live snapshot to protect.
 */
export async function writeSnapshotPreservingLive(
  outFile: string,
  nextPayload: unknown,
  opts?: { isLive?: (p: unknown) => boolean },
): Promise<PreserveResult> {
  const isLive = opts?.isLive ?? snapshotIsLive;
  if (!isLive(nextPayload)) {
    const prior = await readPriorSnapshot(outFile);
    if (prior && isLive(prior)) {
      console.warn(
        `[preserve] ${path.basename(outFile)}: fetch produced no live data — keeping prior ` +
          `fetched-live snapshot (not overwriting). core-rules §6.`,
      );
      return { action: 'preserved-prior', outFile };
    }
  }
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(nextPayload, null, 2) + '\n', 'utf8');
  return { action: 'written', outFile };
}

/** Florida-subdir wrapper around {@link writeSnapshotPreservingLive}. */
export async function writeFloridaSnapshotPreservingLive<T>(
  subdir: string,
  filename: string,
  payload: { meta: DataSnapshotMeta; records: T[] },
): Promise<PreserveResult> {
  const outFile = path.join(DATA_ROOT, 'florida', subdir, filename);
  return writeSnapshotPreservingLive(outFile, payload);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url.replace(/api_key=[^&]+/i, 'api_key=***')}`);
  }
  return res.json() as Promise<T>;
}

export async function loadFloridaLegislators(): Promise<
  Array<{
    bioguideId: string;
    name: string;
    stateCode: string;
    chamber: string;
    party: string;
    office: string;
    district?: string;
    govtrackId?: number;
    fecIds?: string[];
  }>
> {
  const raw = JSON.parse(
    await readFile(path.join(projectRoot, 'lib/data/generated/currentLegislators.json'), 'utf8'),
  ) as { legislators: Array<Record<string, unknown>> };
  return raw.legislators
    .filter((l) => l.stateCode === 'FL')
    .map((l) => ({
      bioguideId: String(l.bioguideId),
      name: String(l.name),
      stateCode: 'FL',
      chamber: String(l.chamber),
      party: String(l.party),
      office: String(l.office),
      district: l.district != null ? String(l.district) : undefined,
      govtrackId: typeof l.govtrackId === 'number' ? l.govtrackId : undefined,
      fecIds: Array.isArray(l.fecIds) ? (l.fecIds as string[]) : undefined,
    }));
}
