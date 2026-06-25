import { Suspense } from 'react';
import PoliticiansContent from './PoliticiansContent';

export const metadata = {
  title: 'Politicians — The Ledger',
  description:
    'Browse every current federal official — Congress, governors, executive branch, and judiciary — with sourced office labels from authoritative records.',
};

export default async function PoliticiansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialSearchParams = await searchParams;
  return (
    <Suspense>
      <PoliticiansContent initialSearchParams={initialSearchParams} />
    </Suspense>
  );
}
