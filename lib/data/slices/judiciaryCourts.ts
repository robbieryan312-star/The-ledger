import type { SnapshotSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/judiciary-courts.json';

export function getJudiciaryCourtsSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
