/**
 * YoY % for BLS metro CPI — 13-month window; short series → null (honest gap).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { yoyPctFromMonthlyPoints, type BLSDataPoint } from '../lib/bls-api';

function monthlySeries(latestYear: number, latestMonth: number, months: number, base = 100): BLSDataPoint[] {
  const points: BLSDataPoint[] = [];
  let y = latestYear;
  let m = latestMonth;
  for (let i = 0; i < months; i++) {
    const period = `M${String(m).padStart(2, '0')}`;
    const names = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    // Rising ~0.1 per month so YoY ≈ 1.2% after 12 months of growth from prior-year same month.
    const value = (base + (months - 1 - i) * 0.1).toFixed(3);
    points.push({
      year: String(y),
      period,
      periodName: names[m],
      value,
    });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return points;
}

test('yoyPctFromMonthlyPoints: 13 months with prior-year match computes YoY', () => {
  // Latest June 2026 = 101.2; June 2025 = 100.0 → +1.2%
  const points = monthlySeries(2026, 6, 13, 100);
  // monthlySeries puts newest first: index 0 = June 2026 at base+(12)*0.1 = 101.2
  // index 12 = June 2025 at base = 100
  assert.equal(points.length, 13);
  assert.equal(points[0].period, 'M06');
  assert.equal(points[0].year, '2026');
  assert.equal(points[12].period, 'M06');
  assert.equal(points[12].year, '2025');
  const yoy = yoyPctFromMonthlyPoints(points);
  assert.ok(yoy != null);
  assert.ok(Math.abs(yoy! - 1.2) < 0.01, `expected ~1.2, got ${yoy}`);
});

test('yoyPctFromMonthlyPoints: short series (<13 months) returns null — honest gap', () => {
  const points = monthlySeries(2026, 6, 8, 100);
  assert.equal(yoyPctFromMonthlyPoints(points), null);
});

test('yoyPctFromMonthlyPoints: empty/undefined returns null', () => {
  assert.equal(yoyPctFromMonthlyPoints(undefined), null);
  assert.equal(yoyPctFromMonthlyPoints([]), null);
});
