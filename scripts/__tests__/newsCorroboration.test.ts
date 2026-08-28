/**
 * Build-gated: syndicated near-dup headlines are NOT independent corroboration;
 * distinct reporting of the same event is; name-only overlap is NOT.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NEWS_CORROBORATION_KNOWN_BAD_LEGAL_NAME_ONLY_UNRELATED,
  NEWS_CORROBORATION_KNOWN_BAD_NAME_ONLY_UNRELATED,
  NEWS_CORROBORATION_KNOWN_BAD_SYNDICATED,
  NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT,
  NEWS_CORROBORATION_KNOWN_GOOD_SAME_EVENT_NON_NAME,
} from '../../lib/data/__fixtures__/newsCorroboration.fixture';
import { memberProfileNewsNameTokensForBioguide } from '../../lib/data/memberProfile';
import {
  applyNewsCorroboration,
  isIndependentSameEventReporting,
  isSyndicatedRepublish,
  tokensFromMemberNames,
} from '../../lib/data/newsCorroboration';

test('fixture: near-identical syndicated headlines are NOT independent', () => {
  const { a, b, expectIndependent } = NEWS_CORROBORATION_KNOWN_BAD_SYNDICATED;
  assert.equal(isSyndicatedRepublish(a, b), true);
  assert.equal(isIndependentSameEventReporting(a, b), expectIndependent);
  const verified = applyNewsCorroboration([a, b]);
  assert.equal(verified.every((i) => i.isVerified === false), true);
});

test('fixture: distinct reporting of same event IS independent corroboration', () => {
  const { a, b, expectIndependent, memberNameTokens } = NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT;
  const nameTokens = tokensFromMemberNames(memberNameTokens);
  assert.equal(isSyndicatedRepublish(a, b), false);
  assert.equal(isIndependentSameEventReporting(a, b, nameTokens), expectIndependent);
  const verified = applyNewsCorroboration([a, b], nameTokens);
  assert.equal(verified.every((i) => i.isVerified === true), true);
  assert.equal(verified.every((i) => i.source.tier === 'media'), true);
});

test('fixture: unrelated same-member articles sharing only name tokens are NOT verified', () => {
  const { a, b, expectIndependent, expectVerified, memberNameTokens } =
    NEWS_CORROBORATION_KNOWN_BAD_NAME_ONLY_UNRELATED;
  const nameTokens = tokensFromMemberNames(memberNameTokens);
  assert.equal(isSyndicatedRepublish(a, b), false);
  assert.equal(isIndependentSameEventReporting(a, b, nameTokens), expectIndependent);
  // Without name exclusion this pair would falsely corroborate (bernie+sanders).
  assert.equal(isIndependentSameEventReporting(a, b), true);
  const verified = applyNewsCorroboration([a, b], nameTokens);
  assert.equal(verified.every((i) => i.isVerified === expectVerified), true);
});

test('fixture: display corroboration excludes legal-name tokens from current legislators', () => {
  const { a, b, expectVerified, memberBioguideId, rosterOnlyTokens } =
    NEWS_CORROBORATION_KNOWN_BAD_LEGAL_NAME_ONLY_UNRELATED;
  const rosterOnly = tokensFromMemberNames(rosterOnlyTokens);
  assert.equal(isIndependentSameEventReporting(a, b, rosterOnly), true);

  const fullIdentityTokens = memberProfileNewsNameTokensForBioguide(memberBioguideId);
  assert.equal(fullIdentityTokens.has('bernard'), true);
  assert.equal(isIndependentSameEventReporting(a, b, fullIdentityTokens), false);

  const verified = applyNewsCorroboration([a, b], fullIdentityTokens);
  assert.equal(verified.every((i) => i.isVerified === expectVerified), true);
  assert.equal(verified.every((i) => i.source.tier === 'media'), true);
});

test('fixture: genuine same-event pair with ≥2 non-name tokens IS verified', () => {
  const { a, b, expectIndependent, expectVerified, memberNameTokens } =
    NEWS_CORROBORATION_KNOWN_GOOD_SAME_EVENT_NON_NAME;
  const nameTokens = tokensFromMemberNames(memberNameTokens);
  assert.equal(isSyndicatedRepublish(a, b), false);
  assert.equal(isIndependentSameEventReporting(a, b, nameTokens), expectIndependent);
  const verified = applyNewsCorroboration([a, b], nameTokens);
  assert.equal(verified.every((i) => i.isVerified === expectVerified), true);
  assert.equal(verified.every((i) => i.source.tier === 'media'), true);
});

test('unverified media-tier listing keeps media tier (not demoted to alleged)', () => {
  const { a, memberNameTokens } = NEWS_CORROBORATION_KNOWN_GOOD_DISTINCT;
  const [alone] = applyNewsCorroboration([a], tokensFromMemberNames(memberNameTokens));
  assert.equal(alone.isVerified, false);
  assert.equal(alone.source.tier, 'media');
});
