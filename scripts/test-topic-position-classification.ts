import assert from 'node:assert/strict';
import { buildTopicConsistencyTimeline } from '../lib/data/buildTopicConsistencyTimeline';
import {
  RECORD_TOPIC_BUCKETS,
  classifyTextToRecordTopicId,
} from '../lib/data/profileRecordByTopic';
import { getTopicPositions } from '../lib/data/topicPositions';
import { bestTopicIdForText, keywordMatchesText } from '../lib/data/topicKeywordMatch';

const topicBuckets = RECORD_TOPIC_BUCKETS.filter((bucket) => bucket.id !== 'legislation');

assert.equal(keywordMatchesText('Hire More Heroes Act of 2015', 'roe'), false);
assert.equal(keywordMatchesText('Roe v. Wade', 'roe'), true);

assert.equal(
  classifyTextToRecordTopicId('Hire More Heroes Act of 2015 vote on the Iran nuclear deal'),
  'defense-veterans',
);

assert.equal(
  bestTopicIdForText(
    'During my time in Congress, I cosponsored bills to preserve the 2nd Amendment, oppose universal background checks, and improve mental health services.',
    topicBuckets,
  ),
  'public-safety',
);

assert.equal(
  bestTopicIdForText(
    'As a retired Air Force Reservist, Roger supports rebuilding the military, supporting veterans, and giving former service members more healthcare choices.',
    topicBuckets,
  ),
  'defense-veterans',
);

assert.equal(getTopicPositions('S000033', 'abortion'), null);

const wickerDefense = getTopicPositions('W000437', 'defense-veterans');
assert.ok(wickerDefense?.platformPositions?.some((position) => /Air Force Reservist/.test(position.text)));

const timeline = buildTopicConsistencyTimeline(
  'TEST',
  'defense-veterans',
  {
    statements: [
      {
        title: 'Defense statement',
        date: '2026-01-01',
        url: 'https://www.govinfo.gov/',
        tier: 'official',
        topicId: 'defense',
      },
    ],
    saidDidLinks: [],
  },
  'test-politician',
);
assert.equal(timeline.length, 1);
assert.equal(timeline[0].kind, 'SAID');

console.log('topic position classification regression checks passed');
