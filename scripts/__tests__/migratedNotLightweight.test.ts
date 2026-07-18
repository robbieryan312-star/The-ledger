/**
 * Build-gated guard — migrated profiles must render as integrated, not lightweight placeholders.
 * Salvage of PR #9 / commit 7db9d32 test removed during later refactors.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { allPoliticians } from '../../lib/data/allPoliticians';
import { getFecFinance, mergeCampaignFinance } from '../../lib/data/fecFinance';
import { mergeVotingRecord } from '../../lib/data/congressVotes';
import { totalRaisedForSort } from '../../lib/dashboard/stateRoster';
import {
  MIGRATED_NOT_LIGHTWEIGHT_KNOWN_BAD,
  MIGRATED_NOT_LIGHTWEIGHT_KNOWN_GOOD,
  collectMigratedLightweightViolations,
} from '../../lib/data/__fixtures__/migratedNotLightweight.fixture';
import { MIGRATED_PROFILE_BIOGUIDE_LIST } from '../../lib/data/generated/profiles/index';
import { usesMemberProfile } from '../../lib/data/memberProfile';

function integrationGatesFor(profile: (typeof allPoliticians)[number]) {
  const isLightweight = profile.recordType === 'lightweight';
  const { usingOfficialVotes } = mergeVotingRecord(
    profile.id,
    profile.votingRecord,
    profile.recordType,
    profile.bioguideId,
  );
  const { fecEntry } = mergeCampaignFinance(
    profile.id,
    profile.campaignFinance,
    profile.bioguideId,
  );
  return {
    votesMissingPanel: isLightweight && !usingOfficialVotes,
    financeMissingPanel: isLightweight && !fecEntry,
    trackRecordMissingPanel: isLightweight,
  };
}

test('fixture: known-bad lightweight migrated profile produces violations', () => {
  const violations = collectMigratedLightweightViolations(
    MIGRATED_NOT_LIGHTWEIGHT_KNOWN_BAD.bioguideId!,
    MIGRATED_NOT_LIGHTWEIGHT_KNOWN_BAD,
    {
      votesMissingPanel: true,
      financeMissingPanel: true,
      trackRecordMissingPanel: true,
    },
  );
  assert.ok(violations.length >= 2, `expected multiple violations, got: ${violations.map((v) => v.reason).join('; ')}`);
  assert.ok(violations.some((v) => v.reason.includes('lightweight')));
  assert.ok(violations.some((v) => v.reason.includes('not-yet-integrated')));
});

test('fixture: known-good featured migrated profile passes violation collector', () => {
  const violations = collectMigratedLightweightViolations(
    MIGRATED_NOT_LIGHTWEIGHT_KNOWN_GOOD.bioguideId!,
    MIGRATED_NOT_LIGHTWEIGHT_KNOWN_GOOD,
    {
      votesMissingPanel: false,
      financeMissingPanel: false,
      trackRecordMissingPanel: false,
    },
  );
  assert.equal(violations.length, 0);
});

test('migrated profiles: memberProfile override active and roster recordType is not lightweight', () => {
  const violations: string[] = [];
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDE_LIST) {
    if (!usesMemberProfile(bioguideId)) {
      violations.push(`${bioguideId}: usesMemberProfile returned false`);
      continue;
    }
    const profile = allPoliticians.find((p) => p.bioguideId === bioguideId);
    for (const row of collectMigratedLightweightViolations(
      bioguideId,
      profile,
      profile ? integrationGatesFor(profile) : { votesMissingPanel: true, financeMissingPanel: true, trackRecordMissingPanel: true },
    )) {
      violations.push(`${row.bioguideId}: ${row.reason}`);
    }
    const lightweightDupes = allPoliticians.filter(
      (p) => p.bioguideId === bioguideId && p.recordType === 'lightweight',
    );
    if (lightweightDupes.length > 0) {
      violations.push(`${bioguideId}: ${lightweightDupes.length} lightweight roster duplicate(s)`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `migrated profiles must not be lightweight:\n${violations.join('\n')}`,
  );
});

test('migrated profile aggregate finance sort resolves memberProfile by bioguideId', () => {
  const cruz = allPoliticians.find((p) => p.bioguideId === 'C001098');
  assert.ok(cruz, 'C001098 must be present in the roster');
  assert.notEqual(cruz.id, cruz.bioguideId, 'fixture needs slug id distinct from bioguideId');

  const profileFinance = getFecFinance(cruz.id, cruz.bioguideId);
  assert.ok(profileFinance, 'C001098 profile finance must resolve through bioguideId');
  assert.equal(totalRaisedForSort(cruz), profileFinance.receipts);
});
