'use client';

import { FloridaStateEconomicPanel } from '@/components/records/FloridaRecordPanel';
import { getStateEconomicSlice } from '@/lib/data/slices/stateEconomic';

/** State-level Census + BLS indicators for Florida county pages. */
export default function FloridaCountyEconomicContext() {
  return <FloridaStateEconomicPanel slice={getStateEconomicSlice()} />;
}
