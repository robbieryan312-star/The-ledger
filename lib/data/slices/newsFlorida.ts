import type { NewsBundleSlice } from '../../types/snapshotTypes';
import slice from '../generated/slices/news-florida.json';

export function getNewsFloridaBundle(): NewsBundleSlice {
  return slice as NewsBundleSlice;
}
