import { allPoliticians } from '@/lib/data/allPoliticians';
import { getBills, getLegislationMeta } from '@/lib/data/legislation';
import { getLegislationFloridaBundle } from '@/lib/data/slices/legislationFlorida';
import LegislationContent from './LegislationContent';

export const metadata = {
  title: 'Upcoming Legislation — The Ledger',
  description: 'Federal bills tracked from GovTrack and Congress.gov with neutral process status.',
};

export default function LegislationPage() {
  const sponsorProfileByBioguide: Record<string, string> = {};
  for (const p of allPoliticians) {
    if (p.bioguideId) sponsorProfileByBioguide[p.bioguideId] = p.id;
  }

  return (
    <LegislationContent
      meta={getLegislationMeta()}
      allBills={getBills()}
      floridaLegislation={getLegislationFloridaBundle()}
      sponsorProfileByBioguide={sponsorProfileByBioguide}
    />
  );
}
