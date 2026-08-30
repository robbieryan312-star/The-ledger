/**
 * Core-rules §6 guard: a scoped Schedule A refresh failure must not remove
 * a committed member row from data/national/fec/schedule-a.json.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE,
  FEC_SCHEDULE_A_KNOWN_GOOD_SCOPED_FAILURE_PRESERVE,
} from '../../lib/data/__fixtures__/fecScheduleAPreserve.fixture';
import { preserveScheduleARowOnFetchFailure } from '../lib/fecScheduleAPreserve';

test('preserveScheduleARowOnFetchFailure keeps prior targeted row on scoped fetch failure', () => {
  const bad = FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE;
  const byBioguideId: Record<string, (typeof bad.priorByBioguideId)['S000033']> = {
    ...bad.outgoingByBioguideId,
  };
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  const preserved = preserveScheduleARowOnFetchFailure({
    byBioguideId,
    priorByBioguideId: bad.priorByBioguideId,
    bioguideId: bad.targetBioguideId,
    failures,
    reason: bad.thrownReason,
  });

  assert.equal(preserved, true);
  const preservedRow = byBioguideId[bad.targetBioguideId];
  assert.equal(
    preservedRow.contributors[0].name,
    FEC_SCHEDULE_A_KNOWN_GOOD_SCOPED_FAILURE_PRESERVE.expectedContributorName,
  );
  assert.equal(failures.length, 1);
  assert.equal(failures[0].bioguideId, bad.targetBioguideId);
  assert.match(
    failures[0].reason,
    new RegExp(`^${FEC_SCHEDULE_A_KNOWN_GOOD_SCOPED_FAILURE_PRESERVE.expectedFailurePrefix}`),
  );
  assert.match(failures[0].reason, /prior Schedule A row preserved/);
});

test('preserveScheduleARowOnFetchFailure records fetch-failed when no prior row exists', () => {
  const byBioguideId: Record<string, unknown> = {};
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  const preserved = preserveScheduleARowOnFetchFailure({
    byBioguideId,
    priorByBioguideId: {},
    bioguideId: 'X000001',
    failures,
    reason: 'OpenFEC request failed: HTTP 503 Service Unavailable',
  });

  assert.equal(preserved, false);
  assert.deepEqual(byBioguideId, {});
  assert.equal(failures[0].reason, 'fetch-failed: OpenFEC request failed: HTTP 503 Service Unavailable');
});
