/**
 * Reference catalog — re-exports sourceCatalog for backward compatibility.
 * Prefer lib/data/sourceCatalog.ts and lib/data/SOURCE_LOOKUP.md for agents.
 */
import {
  SOURCE_CATALOG,
  SOURCE_TIER_LABELS,
  DATA_NEED_ROUTING,
  PROFILE_PILOT_BIOGUIDE_ID,
  PILOT_PROFILE_CHECKLIST,
  getCatalogEntry,
  getCatalogByDestination,
  getCatalogByTier,
  getRoutingForNeed,
} from './sourceCatalog';
import type { SourceCatalogEntry, CatalogStatus } from './sourceCatalog';
import type { SourceTier } from '../types';

export type ReferenceTier = 1 | 2 | 3 | 4;

export type ReferenceStatus = 'integrated' | 'candidate' | 'reference';

/** @deprecated Use SourceCatalogEntry from sourceCatalog.ts */
export interface ReferenceSource {
  id: string;
  name: string;
  url: string;
  tier: ReferenceTier;
  category: SourceCatalogEntry['category'];
  status: ReferenceStatus;
  keyRequired: boolean;
  keyVar?: string;
  notes: string;
}

function sourceTierToReference(t: SourceTier): ReferenceTier {
  if (t === 'official') return 1;
  if (t === 'nonpartisan') return 2;
  if (t === 'media') return 2;
  return 3;
}

function catalogStatusToReference(s: CatalogStatus): ReferenceStatus {
  if (s === 'integrated' || s === 'pilot') return 'integrated';
  if (s === 'candidate') return 'candidate';
  return 'reference';
}

export const REFERENCE_SOURCES: ReferenceSource[] = SOURCE_CATALOG.map((e) => ({
  id: e.id,
  name: e.name,
  url: e.url,
  tier: sourceTierToReference(e.sourceTier),
  category: e.category,
  status: catalogStatusToReference(e.status),
  keyRequired: e.keyRequired,
  keyVar: e.keyVar,
  notes: [e.notes, e.lookFor.length ? `Look for: ${e.lookFor.slice(0, 3).join('; ')}` : '', e.deferredReason ? `Deferred: ${e.deferredReason}` : '']
    .filter(Boolean)
    .join(' · '),
}));

export const INTEGRATED_SOURCE_COUNT = SOURCE_CATALOG.filter(
  (s) => s.status === 'integrated' || s.status === 'pilot',
).length;

export {
  SOURCE_CATALOG,
  SOURCE_TIER_LABELS,
  DATA_NEED_ROUTING,
  PROFILE_PILOT_BIOGUIDE_ID,
  PILOT_PROFILE_CHECKLIST,
  getCatalogEntry,
  getCatalogByDestination,
  getCatalogByTier,
  getRoutingForNeed,
};
