/**
 * Build-gated: county map reads generated reference data; empty counties are honest-gap.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  COUNTY_MAP_KNOWN_BAD_EMPTY_AS_LIVE,
  COUNTY_MAP_KNOWN_GOOD_REFERENCE,
  COUNTY_MAP_REFERENCE_FIPS,
} from '../../lib/data/__fixtures__/countyMap.fixture';
import { countyByFips, countiesByState, countyMapMeta } from '../../lib/data/countyMap';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('USAMap does not hardcode empty countyByFips = {}', () => {
  const src = readFileSync(path.join(root, 'components/map/USAMap.tsx'), 'utf8');
  const buildSrc = readFileSync(path.join(root, 'lib/data/buildMapProps.ts'), 'utf8');
  assert.match(buildSrc, /from ['"]\.\/countyMap['"]/);
  assert.match(buildSrc, /countyByFips/);
  assert.doesNotMatch(src, /from ['"]@\/lib\/data\/countyMap['"]/);
  assert.doesNotMatch(src, /const countyByFips:\s*Record<string,\s*CountyData>\s*=\s*\{\s*\}/);
  assert.doesNotMatch(src, /const countiesByState:\s*Record<string,\s*CountyData\[\]>\s*=\s*\{\s*\}/);
  for (const phrase of COUNTY_MAP_KNOWN_BAD_EMPTY_AS_LIVE.bannedCopy) {
    assert.equal(
      src.includes(phrase),
      false,
      `banned pending-as-live copy still present: ${phrase}`,
    );
  }
  assert.match(src, /No verified county record available/);
});

test('fixture: reference FIPS Miami-Dade + Liberty are filled with officials', () => {
  assert.deepEqual(countyMapMeta.referenceFips, [
    COUNTY_MAP_REFERENCE_FIPS.liberty,
    COUNTY_MAP_REFERENCE_FIPS.miamiDade,
  ]);
  for (const fips of COUNTY_MAP_KNOWN_GOOD_REFERENCE.fips) {
    const county = countyByFips[fips];
    assert.ok(county, `missing county ${fips}`);
    assert.equal(county.status, 'filled');
    assert.ok(
      county.officials.length >= COUNTY_MAP_KNOWN_GOOD_REFERENCE.minOfficials,
      `${fips} needs officials`,
    );
    assert.ok(county.sources && county.sources.length >= 1, `${fips} needs sources`);
    for (const o of county.officials) {
      assert.ok(o.id.startsWith('fl-co-'), `county official id must be local: ${o.id}`);
      assert.ok(o.name.trim().length > 1);
      assert.ok(o.position.trim().length > 1);
      assert.ok(o.bio.trim().length > 10);
    }
  }
  assert.ok((countiesByState.FL ?? []).length === 2);
});

test('non-reference Florida FIPS are absent (honest-gap, not empty live object)', () => {
  assert.equal(countyByFips['12001'], undefined); // Alachua — not in reference scope
  assert.equal(Object.keys(countyByFips).length, 2);
});
