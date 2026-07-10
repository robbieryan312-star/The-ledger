/**
 * Build-gated guard: portrait ↔ bioguideId ↔ name/party/state/office integrity.
 * Scales beyond governors to full roster; freezes DeSantis/Dunn regression — §6.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { allPoliticians, getPoliticianById, isCurrentlyInOffice } from '../../lib/data/allPoliticians';
import {
  IDENTITY_INTEGRITY_KNOWN_BAD,
  IDENTITY_INTEGRITY_KNOWN_GOOD,
  IDENTITY_INTEGRITY_PROFILE_SAMPLES,
} from '../../lib/data/__fixtures__/identityIntegrityGuard.fixture';
import {
  bioguideMatchesCurrentLegislator,
  congressPhotoUrl,
  resolvePoliticianPhotoUrl,
} from '../../lib/data/photos';

test('fixture: DeSantis/Dunn D000628 cross-wire is a known-bad identity case', () => {
  const bad = IDENTITY_INTEGRITY_KNOWN_BAD;
  assert.equal(
    bioguideMatchesCurrentLegislator(bad.bioguideId, { lastName: bad.lastName }),
    false,
  );
  assert.equal(congressPhotoUrl(bad.bioguideId), bad.wrongPhotoUrl);
  assert.notEqual(bad.lastName, bad.wrongLegislatorLastName);
});

test('fixture: DeSantis good identity resolves ron-desantis without Dunn portrait', () => {
  const good = IDENTITY_INTEGRITY_KNOWN_GOOD;
  const fl = getPoliticianById(good.expectedProfileId);
  assert.ok(fl, 'ron-desantis roster entry must exist');
  assert.equal(fl!.stateCode, good.expectedStateCode);
  assert.equal(fl!.party, good.expectedParty);
  assert.notEqual(resolvePoliticianPhotoUrl(fl!), IDENTITY_INTEGRITY_KNOWN_BAD.wrongPhotoUrl);
});

test('every current officeholder: bioguideId last name matches; photo not cross-wired', () => {
  const current = allPoliticians.filter((p) => isCurrentlyInOffice(p));
  assert.ok(current.length > 100, 'expected substantial current roster');

  for (const p of current) {
    if (p.bioguideId) {
      assert.equal(
        bioguideMatchesCurrentLegislator(p.bioguideId, p),
        true,
        `${p.name} (${p.id}): bioguideId ${p.bioguideId} must match last name ${p.lastName}`,
      );
    }

    const photo = resolvePoliticianPhotoUrl(p);
    if (photo && p.bioguideId) {
      const legislatorPhoto = congressPhotoUrl(p.bioguideId);
      if (!bioguideMatchesCurrentLegislator(p.bioguideId, p)) {
        assert.notEqual(photo, legislatorPhoto, `${p.name}: must not use mismatched legislator photo`);
      }
    }

    if (p.chamber === 'governor') {
      assert.ok(p.stateCode, `${p.name}: governor must have stateCode`);
    }
  }
});

test('sample migrated profiles: bioguideId joins match path identity', () => {
  for (const sample of IDENTITY_INTEGRITY_PROFILE_SAMPLES) {
    const p = allPoliticians.find((row) => row.bioguideId === sample.bioguideId);
    assert.ok(p, `bioguideId ${sample.bioguideId} must exist in roster`);
    assert.equal(p!.lastName, sample.lastName);
    assert.equal(bioguideMatchesCurrentLegislator(sample.bioguideId, p!), true);
  }
});
