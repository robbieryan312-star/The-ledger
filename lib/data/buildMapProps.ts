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
import { sortOfficialsForDisplay } from '@/lib/politicianSearchIndex';
import type { MapExplorerDataProps, MapPoliticianRow } from '@/lib/types/mapProps';
import type { SnapshotSlice } from '@/lib/types/snapshotTypes';

export type { MapExplorerDataProps, MapPoliticianRow } from '@/lib/types/mapProps';

function plainCourtSummary(title: string): string {
  const t = title.trim();
  if (/v\./i.test(t)) return 'Appellate or trial court dispute between named parties';
  if (/appeal/i.test(t)) return 'Appeal from a lower court decision';
  return 'State court matter on the Florida docket';
}

export function buildMapProps(): MapExplorerDataProps {
  const politiciansByState: Record<string, MapPoliticianRow[]> = {};
  for (const state of rosterStates) {
    politiciansByState[state.code] = sortOfficialsForDisplay(
      getPoliticiansForState(state.code).map((p) => ({
        ...p,
        resolvedOffice: resolveOffice(p),
      })),
    );
  }

  const baseCourts = getJudiciaryCourtsSlice();
  const floridaCourtSlice: SnapshotSlice = {
    ...baseCourts,
    records: baseCourts.records.map((row) => ({
      ...row,
      detail: `${row.detail}. Pattern-based context: ${plainCourtSummary(row.title)}`,
    })),
  };

  return {
    rosterStates,
    politiciansByState,
    governorMapFills: GOVERNOR_MAP_FILLS,
    governorPartyByState,
    floridaEconomicSlice: getStateEconomicSlice(),
    floridaCourtSlice,
  };
}
