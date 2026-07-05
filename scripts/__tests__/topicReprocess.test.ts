import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  sanitizeTopicBundleSnapshot,
  type BundleSnapshot,
} from '../reprocess-topic-positions-bundle';

test('topic bundle reprocess keeps CREC statements reclassified into newly created topic buckets', () => {
  const snapshot: BundleSnapshot = {
    meta: {},
    byBioguideId: {
      T000001: {
        legislation: {
          statements: [
            {
              title:
                'Ms. EXAMPLE. Mr. President, I rise today to support Medicare and prescription drug affordability for seniors.',
              date: '2026-01-01',
              url: 'https://www.govinfo.gov/app/details/CREC-2026-01-01',
              tier: 'official',
              topicId: 'legislation',
              verbatim: true,
            },
          ],
          saidDidLinks: [],
        },
      },
    },
  };

  const report = sanitizeTopicBundleSnapshot(snapshot);
  const topics = snapshot.byBioguideId.T000001;

  assert.equal(report.reclassified, 1);
  assert.equal(topics.legislation, undefined);
  assert.equal(topics.healthcare.statements.length, 1);
  assert.equal(topics.healthcare.statements[0].topicId, 'healthcare');
  assert.match(topics.healthcare.statements[0].displayText ?? '', /Medicare/);
});
