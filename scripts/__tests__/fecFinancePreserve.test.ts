import assert from 'node:assert/strict';
import test from 'node:test';
import type { FecFinanceEntry } from '../../lib/data/fecFinance';
import {
  countFecFinanceRows,
  mergeFecFinanceEntries,
} from '../sync-fec-finance';

function row(
  politicianId: string,
  receipts: number,
  asOf = '2026-01-01',
): FecFinanceEntry {
  return {
    politicianId,
    bioguideId: politicianId.toUpperCase(),
    fecCandidateId: `H0${politicianId.slice(0, 2).toUpperCase()}00000`,
    electionYear: 2026,
    receipts,
    disbursements: receipts / 2,
    cashOnHand: receipts / 4,
    individualContributions: receipts,
    pacContributions: 0,
    selfFunding: 0,
    source: {
      name: 'Federal Election Commission (OpenFEC)',
      url: 'https://www.fec.gov/data/',
      tier: 'official',
    },
    asOf,
    fecProfileUrl: 'https://www.fec.gov/data/candidate/H00000000/',
  };
}

test('legacy sync:fec preserves prior rows when a refresh omits skipped or errored profiles', () => {
  const prior = {
    'bernie-sanders': row('bernie-sanders', 100),
    'mitch-mcconnell': row('mitch-mcconnell', 200),
  };
  const fresh = {
    'bernie-sanders': row('bernie-sanders', 300, '2026-09-07'),
  };

  const merged = mergeFecFinanceEntries(prior, fresh);

  assert.equal(Object.keys(merged).length, 2);
  assert.equal(merged['bernie-sanders'].receipts, 300);
  assert.equal(merged['mitch-mcconnell'].receipts, 200);
});

test('legacy sync:fec key-missing path counts real prior rows even when metadata is stale', () => {
  const snapshot = {
    meta: { withFinanceData: 0 },
    byPoliticianId: {
      'bernie-sanders': row('bernie-sanders', 100),
    },
  };

  assert.equal(countFecFinanceRows(snapshot), 1);
});
