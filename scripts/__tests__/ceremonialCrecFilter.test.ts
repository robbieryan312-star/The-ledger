/**
 * Build-gated ceremonial CREC filter — tributes/recognitions must not surface as policy positions.
 * Run: npx tsx --test scripts/__tests__/ceremonialCrecFilter.test.ts
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isCeremonialCrecRemark } from '../../lib/data/ceremonialCrecFilter';

describe('ceremonial CREC remark filter', () => {
  test('flags tribute and recognition boilerplate', () => {
    assert.equal(
      isCeremonialCrecRemark(
        'Mr. THUNE. Mr. President, today I rise to recognize Elena Rossi, an intern in my Washington, DC, office, for all of the hard work she has done.',
      ),
      true,
    );
    assert.equal(isCeremonialCrecRemark('I rise to honor our Person of the Year award winner.'), true);
    assert.equal(isCeremonialCrecRemark('We pay tribute to the men and women who served.'), true);
    assert.equal(isCeremonialCrecRemark('I congratulate the championship team from Kentucky.'), true);
  });

  test('passes substantive floor policy remarks', () => {
    assert.equal(
      isCeremonialCrecRemark(
        'Mr. SANDERS. Mr. President, in the United States today, 42 million Americans are drowning in $1.7 trillion in student debt.',
      ),
      false,
    );
    assert.equal(
      isCeremonialCrecRemark(
        'Mr. SANDERS. Mr. President, we are at the beginning of the most profound technological revolution in world history.',
      ),
      false,
    );
  });
});
