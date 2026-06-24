import type { SnapshotSlice } from '../snapshotTypes';
import slice from '../generated/slices/finance-fldoe.json';

export function getFinanceFldoeSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
