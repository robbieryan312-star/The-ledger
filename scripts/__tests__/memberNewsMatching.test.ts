/**
 * Build-gated: bare surname must never match; full name / honorific+ln must.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MEMBER_NEWS_MATCH_KNOWN_BAD_BARE_SURNAME,
  MEMBER_NEWS_MATCH_KNOWN_GOOD_FULL_NAME,
  MEMBER_NEWS_MATCH_KNOWN_GOOD_HONORIFIC,
  MEMBER_NEWS_MATCH_SANDERS_LEG,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE,
  MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE,
} from '../../lib/data/__fixtures__/memberNewsMatching.fixture';
import { matchesMemberInText, type LegislatorNewsRow } from '../lib/memberNewsMatching';
import { qualifiesMemberNewsItem } from '../lib/memberNewsQualification';

const emptyDisplay = new Map<string, { name: string; firstName: string; lastName: string }>();
const displayWithBernie = new Map([
  [
    'S000033',
    { name: 'Bernie Sanders', firstName: 'Bernie', lastName: 'Sanders' },
  ],
]);

const leg = MEMBER_NEWS_MATCH_SANDERS_LEG as LegislatorNewsRow;

test('fixture: bare surname "Sanders" alone does NOT match', () => {
  const hit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_BAD_BARE_SURNAME.text,
    leg,
    emptyDisplay,
  );
  assert.equal(hit, MEMBER_NEWS_MATCH_KNOWN_BAD_BARE_SURNAME.expectedMatch);
});

test('fixture: "Sen. Sanders" matches via honorific+lastname', () => {
  const hit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_GOOD_HONORIFIC.text,
    leg,
    emptyDisplay,
  );
  assert.equal(hit, MEMBER_NEWS_MATCH_KNOWN_GOOD_HONORIFIC.expectedMatch);
});

test('fixture: "Bernie Sanders" full name matches', () => {
  const hit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_GOOD_FULL_NAME.text,
    leg,
    displayWithBernie,
  );
  assert.ok(hit, 'expected full-name match');
  assert.match(hit, /Sanders/i);
});

test('Senator Sanders honorific form matches', () => {
  const hit = matchesMemberInText(
    'Senator Sanders questioned the witness about the CDC emails.',
    leg,
    emptyDisplay,
  );
  assert.equal(hit, 'Sen. Sanders');
});

test('fixture: comparison-only mention does NOT qualify', () => {
  const q = qualifiesMemberNewsItem(
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY.headline,
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY.body,
    leg,
    displayWithBernie,
  );
  assert.equal(q.ok, MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY.expectedOk);
  assert.equal(q.reason, MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY.expectedReason);
});

test('fixture: "among those responding" does NOT qualify', () => {
  const q = qualifiesMemberNewsItem(
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING.headline,
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING.body,
    leg,
    displayWithBernie,
  );
  assert.equal(q.ok, MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING.expectedOk);
  assert.equal(
    q.reason,
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING.expectedReason,
  );
});

test('fixture: direct member quote DOES qualify', () => {
  const q = qualifiesMemberNewsItem(
    MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.headline,
    MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.body,
    leg,
    displayWithBernie,
  );
  assert.equal(q.ok, MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.expectedOk);
  assert.equal(q.reason, MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.expectedReason);
});

test('fixture: releaser mention without quote does NOT qualify', () => {
  const q = qualifiesMemberNewsItem(
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE.headline,
    MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE.body,
    leg,
    displayWithBernie,
  );
  assert.equal(q.ok, MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE.expectedOk);
  assert.equal(q.reason, MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE.expectedReason);
});
