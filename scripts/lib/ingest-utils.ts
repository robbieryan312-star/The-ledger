/**
 * Shared helpers for Florida /data/ ingestion scripts.
 * Keys load from .env.local only — never hardcode or log secrets.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Source } from '../../lib/types';

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
  const dir = path.join(DATA_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const outFile = path.join(dir, filename);
  await writeFile(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return outFile;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
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
