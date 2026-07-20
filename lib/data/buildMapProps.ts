/**
 * Server-only: assemble map explorer props from generated datasets.
 */
import {
  rosterStates,
  getPoliticiansForState,
  resolveOffice,
} from './allPoliticians';
import { GOVERNOR_MAP_FILLS, governorPartyByState } from './governorMapColors';
import { getStateEconomicSlice } from './slices/stateEconomic';
import { getJudiciaryCourtsSlice } from './slices/judiciaryCourts';
import { countyByFips, countiesByState } from './countyMap';
import { comparePoliticiansByOffice } from '@/lib/politicianSort';
import type { MapExplorerDataProps, MapPoliticianRow } from '@/lib/types/mapProps';
import type { SnapshotSlice } from '@/lib/types/snapshotTypes';

export type { MapExplorerDataProps, MapPoliticianRow } from '@/lib/types/mapProps';

export function buildMapProps(): MapExplorerDataProps {
  const politiciansByState: Record<string, MapPoliticianRow[]> = {};
  for (const state of rosterStates) {
    politiciansByState[state.code] = getPoliticiansForState(state.code)
      .map((p) => ({
        ...p,
        resolvedOffice: resolveOffice(p),
      }))
      .sort(comparePoliticiansByOffice);
  }

  const floridaCourtSlice: SnapshotSlice = getJudiciaryCourtsSlice();

  return {
    rosterStates,
    politiciansByState,
    governorMapFills: GOVERNOR_MAP_FILLS,
    governorPartyByState,
    floridaEconomicSlice: getStateEconomicSlice(),
    floridaCourtSlice,
    countyByFips,
    countiesByState,
  };
}
