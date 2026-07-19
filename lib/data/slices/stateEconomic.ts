import type { StateEconomicSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/state-economic.json';

export function getStateEconomicSlice(): StateEconomicSlice {
  return slice as StateEconomicSlice;
}
