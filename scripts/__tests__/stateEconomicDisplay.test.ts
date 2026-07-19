/**
 * Phase 0: exact indicator lookup + unemployment delta sign/color semantics.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deltaVsMonthsAgo,
  findIndicator,
  formatDelta,
  formatPercent,
  formatRank,
  incomeVsUsChipClass,
  indicatorRawValue,
} from '../../lib/format/stateEconomicDisplay';
import type { StateEconomicSlice } from '../../lib/types/snapshotTypes';

const slice = {
  meta: { asOf: '2026-07-18', totalCount: 3 },
  stateCode: 'FL',
  stateName: 'Florida',
  indicators: [
    {
      label: 'Unemployment rate',
      rawValue: 4.4,
      unit: '%',
      source: { name: 'BLS', url: 'https://www.bls.gov', tier: 'official' },
      asOf: '2026-07-18',
      history: [
        { period: 'May 2026', value: 4.4 },
        { period: 'Apr 2026', value: 4.3 },
        { period: 'Mar 2026', value: 4.2 },
        { period: 'Feb 2026', value: 4.1 },
        { period: 'Jan 2026', value: 4.0 },
        { period: 'Dec 2025', value: 4.0 },
        { period: 'Nov 2025', value: 3.9 },
        { period: 'Oct 2025', value: 3.9 },
        { period: 'Sep 2025', value: 3.9 },
        { period: 'Aug 2025', value: 3.9 },
        { period: 'Jul 2025', value: 3.9 },
        { period: 'Jun 2025', value: 3.9 },
        { period: 'May 2025', value: 3.9 },
      ],
    },
    {
      label: 'Employment',
      rawValue: 10_200_000,
      unit: 'persons',
      source: { name: 'BLS', url: 'https://www.bls.gov', tier: 'official' },
      asOf: '2026-07-18',
    },
    {
      label: 'Unemployment level',
      rawValue: 493_000,
      unit: 'persons',
      source: { name: 'BLS', url: 'https://www.bls.gov', tier: 'official' },
      asOf: '2026-07-18',
    },
  ],
} as unknown as StateEconomicSlice;

test('findIndicator exact match: Employment is persons count, not Unemployment rate', () => {
  const emp = findIndicator(slice, 'Employment');
  assert.ok(emp);
  assert.equal(emp!.label, 'Employment');
  assert.equal(emp!.unit, 'persons');
  assert.equal(emp!.rawValue, 10_200_000);
  assert.notEqual(emp!.label, 'Unemployment rate');
});

test('findIndicator exact match: Unemployment rate is not matched by Employment label', () => {
  const rate = findIndicator(slice, 'Unemployment rate');
  const emp = findIndicator(slice, 'Employment');
  assert.notEqual(rate, emp);
  assert.equal(rate!.rawValue, 4.4);
});

test('rising unemployment history ⇒ positive delta and formatDelta shows +', () => {
  const rate = findIndicator(slice, 'Unemployment rate');
  const d = deltaVsMonthsAgo(rate!.history, 12);
  assert.ok(d);
  assert.ok(d!.delta > 0, `expected rising delta, got ${d!.delta}`);
  const formatted = formatDelta(d!.delta, '%');
  assert.match(formatted, /^\+/);
  assert.match(formatted, /pp$/);
});

test('formatDelta does not invert rising unemployment (3.9→4.4 ⇒ +0.5 pp)', () => {
  assert.equal(formatDelta(0.5, '%'), '+0.5 pp');
  assert.equal(formatDelta(-0.5, '%'), '-0.5 pp');
  assert.equal(formatDelta(1, '%'), '+1 pp');
});

test('formatPercent uses max one decimal and strips trailing .0', () => {
  assert.equal(formatPercent(33), '33%');
  assert.equal(formatPercent(33.2), '33.2%');
  assert.match(formatPercent(33.25), /^33\.[23]%$/);
});

test('formatRank emits an integer string', () => {
  assert.equal(formatRank(3), '3');
});

test('FL income below U.S. ⇒ "-$…" delta and negative chip class (true sentiment)', () => {
  const incomeSlice = {
    ...slice,
    indicators: [
      {
        label: 'Median household income',
        rawValue: 71_711,
        unit: 'USD',
        nationalValue: 78_538,
        source: { name: 'Census', url: 'https://api.census.gov', tier: 'official' },
        asOf: '2026-07-18',
      },
    ],
  } as unknown as StateEconomicSlice;
  const income = findIndicator(incomeSlice, 'Median household income');
  assert.ok(income);
  assert.ok(income!.nationalValue != null);
  const delta = indicatorRawValue(income!) - income!.nationalValue!;
  assert.ok(delta < 0, `expected FL below US, got delta=${delta}`);
  const formatted = formatDelta(delta, 'USD');
  assert.match(formatted, /^-/);
  assert.equal(incomeVsUsChipClass(delta), 'text-[var(--negative)]');
  assert.equal(incomeVsUsChipClass(1000), 'text-[var(--positive)]');
});
