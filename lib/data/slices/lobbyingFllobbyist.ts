import type { SnapshotSlice } from '../snapshotTypes';
import slice from '../generated/slices/lobbying-fllobbyist.json';

export function getLobbyingFllobbyistSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
