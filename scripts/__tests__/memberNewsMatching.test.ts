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
import {
  memberNewsEntryAfterRefresh,
  nationalArticlesToNewsItems,
  type MemberNewsArticle,
} from '../../lib/data/newsNational';

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

test('national GDELT news conversion rejects unqualified member mentions', () => {
  const articles: MemberNewsArticle[] = [
    {
      title: MEMBER_NEWS_QUALIFY_KNOWN_BAD_COMPARISON_ONLY.headline,
      outlet: 'theguardian.com',
      publishedDate: '2026-01-01',
      url: 'https://www.theguardian.com/us-news/2026/jan/01/comparison-only',
    },
    {
      title: MEMBER_NEWS_QUALIFY_KNOWN_BAD_AMONG_THOSE_RESPONDING.headline,
      outlet: 'theguardian.com',
      publishedDate: '2026-01-02',
      url: 'https://www.theguardian.com/us-news/2026/jan/02/among-those',
    },
    {
      title: MEMBER_NEWS_QUALIFY_KNOWN_BAD_RELEASER_NO_QUOTE.headline,
      outlet: 'npr.org',
      publishedDate: '2026-01-03',
      url: 'https://www.npr.org/2026/01/03/cdc-emails',
    },
    {
      title: MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.headline,
      outlet: 'theguardian.com',
      publishedDate: '2026-01-04',
      url: 'https://www.theguardian.com/us-news/2026/jan/04/direct-quote',
    },
  ];

  const items = nationalArticlesToNewsItems('S000033', articles, {
    leg,
    displayByBio: displayWithBernie,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.headline, MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.headline);
});

test('national news refresh preserves prior articles on zero-result success', () => {
  const prior = {
    bioguideId: 'S000033',
    name: 'Bernie Sanders',
    feed: 'gdelt' as const,
    articles: [
      {
        title: MEMBER_NEWS_QUALIFY_KNOWN_GOOD_DIRECT_QUOTE.headline,
        outlet: 'theguardian.com',
        publishedDate: '2026-01-04',
        url: 'https://www.theguardian.com/us-news/2026/jan/04/direct-quote',
      },
    ],
  };

  const result = memberNewsEntryAfterRefresh(
    { bioguideId: 'S000033', name: 'Bernie Sanders' },
    [],
    prior,
  );

  assert.equal(result.preservedPrior, true);
  assert.equal(result.entry.articles.length, 1);
  assert.equal(result.entry.articles[0]?.url, prior.articles[0]?.url);
});
