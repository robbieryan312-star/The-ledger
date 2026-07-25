/**
 * Approved-matrix membership helpers for build-gated source wiring checks.
 * Approved matrix owner: docs/OBJECTIVE_SOURCES.md
 */
import type { SourceCatalogEntry } from './sourceCatalog';
import { APPROVED_MATRIX_WIRED_STATUSES } from './__fixtures__/approvedSourceMatrixGuard.fixture';

export type WiredCatalogEntry = Pick<SourceCatalogEntry, 'id' | 'name' | 'status' | 'url'>;

export function isWiredCatalogStatus(status: string): boolean {
  return (APPROVED_MATRIX_WIRED_STATUSES as readonly string[]).includes(status);
}

/** Normalize for substring presence checks against the OBJECTIVE_SOURCES matrix text. */
export function matrixMatchTokens(entry: WiredCatalogEntry): string[] {
  const tokens = new Set<string>();
  tokens.add(entry.id.toLowerCase());
  tokens.add(entry.id.replace(/-/g, ' ').toLowerCase());
  for (const part of entry.name.toLowerCase().split(/[^a-z0-9.]+/)) {
    if (part.length >= 4) tokens.add(part);
  }
  try {
    const host = new URL(entry.url).hostname.replace(/^www\./, '').toLowerCase();
    if (host) tokens.add(host);
    const hostRoot = host.split('.').slice(-2).join('.');
    if (hostRoot.length >= 4) tokens.add(hostRoot);
  } catch {
    /* ignore invalid URL */
  }
  return [...tokens];
}

export function entryPresentInApprovedMatrix(
  entry: WiredCatalogEntry,
  objectiveSourcesText: string,
): boolean {
  const hay = objectiveSourcesText.toLowerCase();
  return matrixMatchTokens(entry).some((t) => hay.includes(t));
}

export function wiredEntriesMissingFromMatrix(
  entries: WiredCatalogEntry[],
  objectiveSourcesText: string,
): WiredCatalogEntry[] {
  return entries.filter(
    (e) => isWiredCatalogStatus(e.status) && !entryPresentInApprovedMatrix(e, objectiveSourcesText),
  );
}
