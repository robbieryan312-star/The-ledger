import type { SnapshotSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/filings-secedgar.json';

export function getFilingsSecedgarSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
