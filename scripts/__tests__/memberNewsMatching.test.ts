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
} from '../../lib/data/__fixtures__/memberNewsMatching.fixture';
import { matchesMemberInText, type LegislatorNewsRow } from '../lib/memberNewsMatching';

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
