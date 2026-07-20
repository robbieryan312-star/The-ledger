/**
 * Build-gated: syndicated near-dup headlines are NOT independent corroboration;
 * distinct reporting of the same event is.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEWS_CORROBORATION_KNOWN_BAD_SYNDICATED,
  NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT,
} from '../../lib/data/__fixtures__/newsCorroboration.fixture';
import {
  applyNewsCorroboration,
  isIndependentSameEventReporting,
  isSyndicatedRepublish,
} from '../../lib/data/newsCorroboration';

test('fixture: near-identical syndicated headlines are NOT independent', () => {
  const { a, b, expectIndependent } = NEWS_CORROBORATION_KNOWN_BAD_SYNDICATED;
  assert.equal(isSyndicatedRepublish(a, b), true);
  assert.equal(isIndependentSameEventReporting(a, b), expectIndependent);
  const verified = applyNewsCorroboration([a, b]);
  assert.equal(verified.every((i) => i.isVerified === false), true);
});

test('fixture: distinct reporting of same event IS independent corroboration', () => {
  const { a, b, expectIndependent } = NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT;
  assert.equal(isSyndicatedRepublish(a, b), false);
  assert.equal(isIndependentSameEventReporting(a, b), expectIndependent);
  const verified = applyNewsCorroboration([a, b]);
  assert.equal(verified.every((i) => i.isVerified === true), true);
  assert.equal(verified.every((i) => i.source.tier === 'media'), true);
});

test('unverified media-tier item is demoted to alleged', () => {
  const { a } = NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT;
  const [alone] = applyNewsCorroboration([a]);
  assert.equal(alone.isVerified, false);
  assert.equal(alone.source.tier, 'alleged');
});
