/**
 * Fixture test for FEC org→topic→vote join — rejects individual surname collisions.
 * Run: npm run test:org-join
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateScheduleAOrgs, isIndividualScheduleAContributor, resolveCuratedOrgTopicIds } from '../../lib/data/fecOrgRegistry';
import {
  ORG_JOIN_KNOWN_BAD,
  ORG_JOIN_KNOWN_GOOD,
} from '../../lib/data/__fixtures__/fecOrgJoin.fixture';

test('known-bad individual donors are excluded from org aggregation', () => {
  for (const { label, contributor } of ORG_JOIN_KNOWN_BAD) {
    assert.equal(
      isIndividualScheduleAContributor(contributor),
      true,
      `expected "${label}" to be classified as individual`,
    );
    assert.deepEqual(
      resolveCuratedOrgTopicIds(contributor.name),
      [],
      `expected "${label}" curated org topics to be empty`,
    );
  }

  const aggregated = aggregateScheduleAOrgs(ORG_JOIN_KNOWN_BAD.map((c) => c.contributor));
  assert.equal(
    aggregated.length,
    0,
    `expected no org aggregates from known-bad fixtures, got: ${aggregated.map((o) => o.orgName).join(', ')}`,
  );
});

test('known-good curated org match still resolves', () => {
  for (const { label, contributor } of ORG_JOIN_KNOWN_GOOD) {
    assert.equal(
      isIndividualScheduleAContributor(contributor),
      false,
      `expected "${label}" NOT to be classified as individual`,
    );
    assert.ok(
      resolveCuratedOrgTopicIds(contributor.name).length > 0,
      `expected "${label}" to resolve curated org topics`,
    );
  }

  const aggregated = aggregateScheduleAOrgs(ORG_JOIN_KNOWN_GOOD.map((c) => c.contributor));
  assert.equal(aggregated.length, 1);
  assert.equal(aggregated[0].orgName, 'ACTBLUE LLC');
  assert.ok(aggregated[0].topicIds.includes('economy-taxes'));
  assert.equal(aggregated[0].sector, 'Conduit');
});
