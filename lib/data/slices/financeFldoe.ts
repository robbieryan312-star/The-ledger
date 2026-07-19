import type { SnapshotSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/finance-fldoe.json';

export function getFinanceFldoeSlice(): SnapshotSlice {
  return slice as SnapshotSlice;
}
