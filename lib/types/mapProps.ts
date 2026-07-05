import type { Politician, ResolvedOffice } from '@/lib/types';
import type { SnapshotSlice, StateEconomicSlice } from '@/lib/types/snapshotTypes';

export type GovernorPartyKey = 'democrat' | 'republican' | 'independent' | 'unknown';

export interface MapPoliticianRow extends Politician {
  resolvedOffice: ResolvedOffice;
}

export interface MapExplorerDataProps {
  rosterStates: Array<{ code: string; name: string; activePoliticians: number }>;
  politiciansByState: Record<string, MapPoliticianRow[]>;
  governorMapFills: Record<
    GovernorPartyKey,
    { base: string; hover: string; stroke: string; strokeHover: string }
  >;
  governorPartyByState: Record<string, GovernorPartyKey>;
  floridaEconomicSlice: StateEconomicSlice;
  floridaCourtSlice: SnapshotSlice;
}
