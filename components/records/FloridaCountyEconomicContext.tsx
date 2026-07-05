'use client';

import { FloridaStateEconomicPanel } from '@/components/records/FloridaRecordPanel';
import type { StateEconomicSlice } from '@/lib/types/snapshotTypes';

/** State-level Census + BLS indicators for Florida county pages. */
export default function FloridaCountyEconomicContext({
  slice,
}: {
  slice: StateEconomicSlice;
}) {
  return <FloridaStateEconomicPanel slice={slice} />;
}
