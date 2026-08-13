/**
 * Approved-matrix membership helpers for build-gated source wiring checks.
 * Approved matrix owner: docs/OBJECTIVE_SOURCES.md
 */
import type { SourceCatalogEntry } from './sourceCatalog';
import { APPROVED_MATRIX_WIRED_STATUSES } from './__fixtures__/approvedSourceMatrixGuard.fixture';

export type WiredCatalogEntry = Pick<SourceCatalogEntry, 'id' | 'name' | 'status' | 'url'>;

const APPROVED_MATRIX_IDENTITY_PHRASES: Record<string, string[]> = {
  'congress-legislators': ['unitedstates congress legislators'],
  'senate-lis': ['senate gov lis roll call xml'],
  'topic-positions-sync': ['said did pairing', 'sync topic positions'],
  'govinfo-crec': ['govinfo gpo', 'congressional record crec'],
  'congress-gov-deep': ['congress gov api', 'ingest member'],
  'approved-media': ['named outlets verbatim quote use', 'media named outlets'],
  'nga-governors': ['national governors association roster'],
};

export function isWiredCatalogStatus(status: string): boolean {
  return (APPROVED_MATRIX_WIRED_STATUSES as readonly string[]).includes(status);
}

function normalizeMatrixText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedIncludes(haystack: string, phrase: string): boolean {
  const normalizedPhrase = normalizeMatrixText(phrase);
  if (!normalizedPhrase) return false;
  return ` ${haystack} `.includes(` ${normalizedPhrase} `);
}

/** Normalize identity phrases for exact source-presence checks against OBJECTIVE_SOURCES. */
export function matrixMatchTokens(entry: WiredCatalogEntry): string[] {
  const tokens = new Set<string>();
  tokens.add(normalizeMatrixText(entry.id));
  tokens.add(normalizeMatrixText(entry.id.replace(/-/g, ' ')));
  tokens.add(normalizeMatrixText(entry.name));
  tokens.add(normalizeMatrixText(entry.name.replace(/\([^)]*\)/g, '')));
  for (const phrase of APPROVED_MATRIX_IDENTITY_PHRASES[entry.id] ?? []) {
    tokens.add(normalizeMatrixText(phrase));
  }
  return [...tokens];
}

export function entryPresentInApprovedMatrix(
  entry: WiredCatalogEntry,
  objectiveSourcesText: string,
): boolean {
  const hay = normalizeMatrixText(objectiveSourcesText);
  return matrixMatchTokens(entry).some((t) => normalizedIncludes(hay, t));
}

export function wiredEntriesMissingFromMatrix(
  entries: WiredCatalogEntry[],
  objectiveSourcesText: string,
): WiredCatalogEntry[] {
  return entries.filter(
    (e) => isWiredCatalogStatus(e.status) && !entryPresentInApprovedMatrix(e, objectiveSourcesText),
  );
}
