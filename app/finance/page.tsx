import { Suspense } from 'react';
import FinanceContent from './FinanceContent';

export const metadata = {
  title: 'Follow the Money — The Ledger',
  description:
    'Campaign finance, lobbying disclosures, and PAC activity — sourced from FEC and federal disclosure records where integrated.',
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const initialSearchParams = await searchParams;
  return (
    <Suspense>
      <FinanceContent initialSearchParams={initialSearchParams} />
    </Suspense>
  );
}
