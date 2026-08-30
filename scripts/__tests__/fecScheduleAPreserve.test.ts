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
import { preserveScheduleARowOnFailure, seedScheduleARows } from '../lib/fecScheduleAPreserve';

test('preserveScheduleARowOnFailure keeps prior targeted row on scoped fetch exception', () => {
  const bad = FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE;
  const byBioguideId: Record<string, (typeof bad.priorByBioguideId)['S000033']> = {
    ...bad.outgoingByBioguideId,
  };
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  const preserved = preserveScheduleARowOnFailure({
    byBioguideId,
    priorByBioguideId: bad.priorByBioguideId,
    bioguideId: bad.targetBioguideId,
    failures,
    reason: bad.thrownReason,
    fetchFailed: true,
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

test('preserveScheduleARowOnFailure keeps prior row on non-throw member failure', () => {
  const bad = FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE;
  const byBioguideId: Record<string, (typeof bad.priorByBioguideId)['S000033']> = {};
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  const preserved = preserveScheduleARowOnFailure({
    byBioguideId,
    priorByBioguideId: bad.priorByBioguideId,
    bioguideId: bad.targetBioguideId,
    failures,
    reason: 'no itemized receipts found for authorized committees',
  });

  assert.equal(preserved, true);
  assert.equal(byBioguideId.S000033.contributors[0].name, 'NATIONAL NURSES UNITED PAC');
  assert.equal(
    failures[0].reason,
    'no itemized receipts found for authorized committees (prior Schedule A row preserved)',
  );
});

test('preserveScheduleARowOnFailure records fetch-failed when no prior row exists', () => {
  const byBioguideId: Record<string, unknown> = {};
  const failures: Array<{ bioguideId: string; reason: string }> = [];

  const preserved = preserveScheduleARowOnFailure({
    byBioguideId,
    priorByBioguideId: {},
    bioguideId: 'X000001',
    failures,
    reason: 'OpenFEC request failed: HTTP 503 Service Unavailable',
    fetchFailed: true,
  });

  assert.equal(preserved, false);
  assert.deepEqual(byBioguideId, {});
  assert.equal(failures[0].reason, 'fetch-failed: OpenFEC request failed: HTTP 503 Service Unavailable');
});

test('seedScheduleARows starts full-corpus output from prior rows', () => {
  const bad = FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE;
  const seeded = seedScheduleARows(bad.priorByBioguideId);

  assert.notEqual(seeded, bad.priorByBioguideId);
  assert.equal(seeded.S000033.contributors[0].name, 'NATIONAL NURSES UNITED PAC');
});
