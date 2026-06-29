import { notFound } from 'next/navigation';
import PoliticianProfileClient from '@/components/politicians/PoliticianProfileClient';
import { getPoliticianById } from '@/lib/data/allPoliticians';
import { resolveCurrentOffice } from '@/lib/data/officeResolution';
import { mergeCampaignFinance } from '@/lib/data/fecFinance';
import { mergeVotingRecord } from '@/lib/data/congressVotes';
import { mergeStockTrades } from '@/lib/data/stockTrades';
import { getProfileRecordByTopic } from '@/lib/data/profileRecordByTopic';
import { getMemberDeep } from '@/lib/data/memberDeep';
import { getVoteviewByBioguide } from '@/lib/data/slices/voteview';
import { getNewsFloridaBundle } from '@/lib/data/slices/newsFlorida';
import { findRecordJuxtapositions } from '@/lib/data/recordJuxtapositions';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const politician = getPoliticianById(id);
  if (!politician) notFound();

  const resolvedOffice = resolveCurrentOffice(politician);
  const { finance: displayFinance, fecEntry } = mergeCampaignFinance(
    politician.id,
    politician.campaignFinance,
    politician.bioguideId,
  );
  const { votes: displayVotes, congressEntry, usingOfficialVotes } = mergeVotingRecord(
    politician.id,
    politician.votingRecord,
    politician.recordType,
    politician.bioguideId,
  );
  const {
    trades: displayStockTrades,
    officialEntry: stockEntry,
    usingOfficialTrades,
    demoTradeCount,
  } = mergeStockTrades(politician.id, politician.stockTrades, politician.recordType, politician.bioguideId);

  const isFederalCongress =
    politician.level === 'federal' &&
    (politician.chamber === 'senate' || politician.chamber === 'house');
  const recordByTopic = isFederalCongress
    ? getProfileRecordByTopic(politician.id, politician.bioguideId)
    : null;
  const memberDeep =
    isFederalCongress && politician.bioguideId
      ? getMemberDeep(politician.bioguideId)
      : null;
  const voteviewMember = getVoteviewByBioguide(politician.bioguideId);
  const floridaNewsBundle = politician.stateCode === 'FL' ? getNewsFloridaBundle() : null;
  const isFeatured = politician.recordType !== 'lightweight';
  const recordJuxtapositions =
    isFeatured && usingOfficialVotes && usingOfficialTrades
      ? findRecordJuxtapositions(displayVotes, displayStockTrades)
      : [];

  return (
    <>
      <div className="sr-only">
        <h1>{politician.name}</h1>
        <p>
          {resolvedOffice.label} — {politician.state}
        </p>
        <p>{politician.party}</p>
      </div>
      <PoliticianProfileClient
        politician={politician}
        initialTab={tab}
        resolvedOffice={resolvedOffice}
        displayFinance={displayFinance}
        fecEntry={fecEntry}
        displayVotes={displayVotes}
        congressEntry={congressEntry}
        usingOfficialVotes={usingOfficialVotes}
        displayStockTrades={displayStockTrades}
        stockEntry={stockEntry}
        usingOfficialTrades={usingOfficialTrades}
        demoTradeCount={demoTradeCount}
        recordByTopic={recordByTopic}
        memberDeep={memberDeep}
        voteviewMember={voteviewMember}
        floridaNewsBundle={floridaNewsBundle}
        recordJuxtapositions={recordJuxtapositions}
        isFederalCongress={isFederalCongress}
      />
    </>
  );
}
