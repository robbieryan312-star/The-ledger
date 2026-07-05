import { allPoliticians } from '@/lib/data/allPoliticians';
import { mergeCampaignFinance, getFecFinanceSnapshot } from '@/lib/data/fecFinance';
import CompareContent from './CompareContent';

export const metadata = {
  title: 'Compare — The Ledger',
  description: 'Side-by-side comparison of politicians on finance, voting, and issue positions.',
};

export default function ComparePage() {
  const politicians = allPoliticians.map((p) => {
    const { finance, fecEntry } = mergeCampaignFinance(p.id, p.campaignFinance, p.bioguideId);
    return { ...p, campaignFinance: finance, fecEntry };
  });
  const fecMeta = getFecFinanceSnapshot().meta;

  return <CompareContent politicians={politicians} fecMeta={fecMeta} />;
}
