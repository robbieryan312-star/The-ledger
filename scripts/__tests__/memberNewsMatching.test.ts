/**
 * Build-gated: bare surname must never match; full name / honorific+ln must.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC,
  MEMBER_NEWS_MATCH_KNOWN_BAD_BARE_SURNAME,
  MEMBER_NEWS_MATCH_KNOWN_GOOD_AMBIGUOUS_FULL_NAME,
  MEMBER_NEWS_MATCH_KNOWN_GOOD_FULL_NAME,
  MEMBER_NEWS_MATCH_KNOWN_GOOD_HONORIFIC,
  MEMBER_NEWS_MATCH_SANDERS_LEG,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY,
  MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE,
  MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE,
} from '../../lib/data/__fixtures__/memberNewsMatching.fixture';
import {
  buildSameChamberLastNameCounts,
  matchesMemberInText,
  type LegislatorNewsRow,
} from '../lib/memberNewsMatching';
import { qualifiesMemberNewsItem } from '../lib/memberNewsQualification';

const emptyDisplay = new Map<string, { name: string; firstName: string; lastName: string }>();
const displayWithBernie = new Map([
  [
    'S000033',
    { name: 'Bernie Sanders', firstName: 'Bernie', lastName: 'Sanders' },
  ],
]);

const leg = MEMBER_NEWS_MATCH_SANDERS_LEG as LegislatorNewsRow;
const rickScottLeg: LegislatorNewsRow = {
  bioguideId: 'S001217',
  name: 'Rick Scott',
  firstName: 'Rick',
  lastName: 'Scott',
  chamber: 'senate',
};
const timScottLeg: LegislatorNewsRow = {
  bioguideId: 'S001184',
  name: 'Tim Scott',
  firstName: 'Tim',
  lastName: 'Scott',
  chamber: 'senate',
};
const homonymDisplay = new Map([
  [
    'S001217',
    { name: 'Rick Scott', firstName: 'Rick', lastName: 'Scott' },
  ],
  [
    'S001184',
    { name: 'Tim Scott', firstName: 'Tim', lastName: 'Scott' },
  ],
]);
const homonymMatchOptions = {
  sameChamberLastNameCounts: buildSameChamberLastNameCounts([rickScottLeg, timScottLeg]),
};

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

test('fixture: ambiguous honorific+lastname does NOT match same-chamber homonyms', () => {
  const rickHit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC.text,
    rickScottLeg,
    homonymDisplay,
    homonymMatchOptions,
  );
  const timHit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC.text,
    timScottLeg,
    homonymDisplay,
    homonymMatchOptions,
  );

  assert.equal(rickHit, MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC.expectedMatch);
  assert.equal(timHit, MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC.expectedMatch);
});

test('fixture: full name still matches a same-chamber homonym', () => {
  const rickHit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_GOOD_AMBIGUOUS_FULL_NAME.text,
    rickScottLeg,
    homonymDisplay,
    homonymMatchOptions,
  );
  const timHit = matchesMemberInText(
    MEMBER_NEWS_MATCH_KNOWN_GOOD_AMBIGUOUS_FULL_NAME.text,
    timScottLeg,
    homonymDisplay,
    homonymMatchOptions,
  );

  assert.match(rickHit ?? '', /Rick Scott/i);
  assert.equal(timHit, null);
});

test('fixture: ambiguous honorific headline does NOT qualify as profile news for homonyms', () => {
  const q = qualifiesMemberNewsItem(
    MEMBER_NEWS_MATCH_KNOWN_BAD_AMBIGUOUS_HONORIFIC.text,
    '',
    rickScottLeg,
    homonymDisplay,
    homonymMatchOptions,
  );

  assert.equal(q.ok, false);
  assert.equal(q.reason, 'no-member-match');
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
