/**
 * Build-gated guard: governor roster cards must not show another person's congressional portrait.
 * Regression for ron-desantis / D000628 (Neal P. Dunn) identity bleed — §6 fixture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { allPoliticians, getPoliticiansForState } from '../../lib/data/allPoliticians';
import { currentGovernors } from '../../lib/data/governors';
import {
  GOVERNOR_IDENTITY_KNOWN_BAD,
  GOVERNOR_IDENTITY_KNOWN_GOOD,
} from '../../lib/data/__fixtures__/governorIdentityGuard.fixture';
import {
  bioguideMatchesCurrentLegislator,
  congressPhotoUrl,
  resolvePoliticianPhotoUrl,
} from '../../lib/data/photos';

test('fixture: mismatched bioguideId does not match current legislator last name', () => {
  const bad = GOVERNOR_IDENTITY_KNOWN_BAD;
  assert.equal(
    bioguideMatchesCurrentLegislator(bad.bioguideId, { lastName: bad.lastName }),
    false,
  );
  assert.equal(congressPhotoUrl(bad.bioguideId), bad.wrongPhotoUrl);
});

test('fixture: resolvePoliticianPhotoUrl never returns another person portrait for governor mismatch', () => {
  const bad = GOVERNOR_IDENTITY_KNOWN_BAD;
  const url = resolvePoliticianPhotoUrl({
    id: bad.id,
    bioguideId: bad.bioguideId,
    lastName: bad.lastName,
    chamber: bad.chamber,
  });
  assert.notEqual(url, bad.wrongPhotoUrl);
});

test('every sitting governor: profile id matches gov-{stateCode} or featured slug; photo not another legislator', () => {
  const governors = allPoliticians.filter((p) => p.chamber === 'governor' && p.stateCode);
  assert.ok(governors.length >= currentGovernors.length, 'expected governor roster entries');

  for (const gov of governors) {
    const expectedGovId = `gov-${gov.stateCode.toLowerCase()}`;
    const featuredForState = governors.filter((g) => g.stateCode === gov.stateCode);
    assert.ok(
      gov.id === expectedGovId || featuredForState.some((g) => g.id === gov.id),
      `${gov.name}: id ${gov.id} must be ${expectedGovId} or state featured slug`,
    );

    if (gov.bioguideId) {
      assert.equal(
        bioguideMatchesCurrentLegislator(gov.bioguideId, gov),
        true,
        `${gov.name}: bioguideId ${gov.bioguideId} must match current legislator last name or be absent`,
      );
    }

    const photo = resolvePoliticianPhotoUrl(gov);
    if (photo && gov.bioguideId) {
      const legislatorPhoto = congressPhotoUrl(gov.bioguideId);
      if (!bioguideMatchesCurrentLegislator(gov.bioguideId, gov)) {
        assert.notEqual(photo, legislatorPhoto, `${gov.name}: must not use mismatched legislator photo`);
      }
    }
  }
});

test('Florida governor DeSantis: link id ron-desantis, no Neal Dunn portrait', () => {
  const fl = getPoliticiansForState('FL').find((p) => p.chamber === 'governor' && p.name.includes('DeSantis'));
  assert.ok(fl, 'DeSantis should appear in FL roster');
  assert.equal(fl!.id, GOVERNOR_IDENTITY_KNOWN_GOOD.expectedProfileId);
  assert.notEqual(resolvePoliticianPhotoUrl(fl!), GOVERNOR_IDENTITY_KNOWN_BAD.wrongPhotoUrl);
  if (fl!.bioguideId) {
    assert.equal(bioguideMatchesCurrentLegislator(fl!.bioguideId, fl!), true);
  }
});
