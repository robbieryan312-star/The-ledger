import type { SnapshotSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/lobbying-fllobbyist.json';

export function getLobbyingFllobbyistSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
