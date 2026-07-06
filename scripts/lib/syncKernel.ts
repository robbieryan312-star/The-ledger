/**
 * Unified sync kernel — shared checkpoint, snapshot, and exit contract for all sync scripts.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export type SyncCheckpointStatus = 'ok' | 'fetch-failed' | 'fetch-blocked';

export interface SyncCheckpoint {
  status: SyncCheckpointStatus;
  count?: number;
  error?: string;
}

export interface SyncSummary {
  script: string;
  status: 'ok' | 'partial' | 'fetch-failed';
  failed: string[];
  checkpoint: string;
  log: string;
  preservePrior: boolean;
  at: string;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Default fetch timeout for sync scripts (core-rules §5). */
export const DEFAULT_SYNC_TIMEOUT_MS = 15_000;

export function requireTimeout(ms: number = DEFAULT_SYNC_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

export async function loadPriorSnapshot<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeSnapshotIfChanged<T>(
  filePath: string,
  data: T,
  prior: T | null,
  serialize: (d: T) => string = (d) => `${JSON.stringify(d, null, 2)}\n`,
): Promise<boolean> {
  const next = serialize(data);
  const prev = prior != null ? serialize(prior) : null;
  if (prev === next) return false;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, next, 'utf8');
  return true;
}

export function checkpointSkip(
  checkpoint: Record<string, SyncCheckpoint | boolean | undefined>,
  id: string,
): boolean {
  const entry = checkpoint[id];
  if (entry === true) return true;
  if (entry && typeof entry === 'object' && entry.status === 'ok') return true;
  return false;
}

export function markCheckpointOk(
  checkpoint: Record<string, SyncCheckpoint>,
  id: string,
  count?: number,
): void {
  checkpoint[id] = { status: 'ok', count };
}

export function markCheckpointFailed(
  checkpoint: Record<string, SyncCheckpoint>,
  id: string,
  error: string,
  count?: number,
): void {
  checkpoint[id] = { status: 'fetch-failed', error, count };
}

export async function loadCheckpoint<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

export async function saveCheckpoint<T>(filePath: string, data: T): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true }).catch(() => undefined);
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export function emitSyncSummary(summary: SyncSummary): void {
  console.log(JSON.stringify(summary));
}

export function buildSyncSummary(
  script: string,
  opts: Partial<Omit<SyncSummary, 'script' | 'at'>> & { status: SyncSummary['status'] },
): SyncSummary {
  return {
    script,
    status: opts.status,
    failed: opts.failed ?? [],
    checkpoint: opts.checkpoint ?? '',
    log: opts.log ?? `/tmp/ledger-${script.replace(/^sync[-:]/, 'sync-')}.log`,
    preservePrior: opts.preservePrior ?? true,
    at: new Date().toISOString(),
  };
}
