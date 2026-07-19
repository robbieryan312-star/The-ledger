import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMericPeriodDisplay } from '../../lib/format/mericPeriodDisplay';

test('formatMericPeriodDisplay maps First Quarter raw string to Q1 YYYY', () => {
  assert.equal(
    formatMericPeriodDisplay('Cost of Living-First Quarter 2026'),
    'Q1 2026',
  );
});

test('formatMericPeriodDisplay maps other quarters', () => {
  assert.equal(formatMericPeriodDisplay('Third Quarter 2024'), 'Q3 2024');
  assert.equal(formatMericPeriodDisplay('Second Quarter 2025'), 'Q2 2025');
});
