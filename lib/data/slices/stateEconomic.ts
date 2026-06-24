import type { StateEconomicSlice } from '../snapshotTypes';
import slice from '../generated/slices/state-economic.json';

export function getStateEconomicSlice(): StateEconomicSlice {
  return slice as StateEconomicSlice;
}
