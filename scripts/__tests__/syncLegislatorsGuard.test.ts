import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSafeCurrentLegislatorsPayload } from '../sync-legislators';

function rawLegislators(count: number): unknown[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: { bioguide: `T${String(idx).padStart(6, '0')}` },
    name: { first: 'Test', last: `Member${idx}` },
    terms: [
      {
        type: idx % 5 === 0 ? 'sen' : 'rep',
        start: '2025-01-03',
        end: '2027-01-03',
        state: 'CA',
        district: idx + 1,
        party: 'Democrat',
      },
    ],
  }));
}

test('legislator sync refuses a non-array upstream payload', () => {
  assert.throws(
    () => assertSafeCurrentLegislatorsPayload({ legislators: rawLegislators(537) }, 537),
    /upstream payload is not an array/,
  );
});

test('legislator sync refuses a truncated upstream payload before writing', () => {
  assert.throws(
    () => assertSafeCurrentLegislatorsPayload(rawLegislators(17), 537),
    /below safety floor 500/,
  );
});

test('legislator sync refuses a large drop from the prior committed snapshot', () => {
  assert.throws(
    () => assertSafeCurrentLegislatorsPayload(rawLegislators(520), 600),
    /more than 10% below prior count 600/,
  );
});

test('legislator sync accepts a plausible current roster count', () => {
  assert.doesNotThrow(() => assertSafeCurrentLegislatorsPayload(rawLegislators(537), 537));
});
