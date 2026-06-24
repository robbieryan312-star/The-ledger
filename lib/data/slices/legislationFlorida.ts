import type { LegislationBundleSlice } from '../snapshotTypes';
import slice from '../generated/slices/legislation-florida.json';

export function getLegislationFloridaBundle(): LegislationBundleSlice {
  return slice as LegislationBundleSlice;
}
