import type { SnapshotSlice } from '../snapshotTypes';
import slice from '../generated/slices/judiciary-courts.json';

export function getJudiciaryCourtsSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
