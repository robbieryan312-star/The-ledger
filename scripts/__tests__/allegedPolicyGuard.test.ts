/**
 * Build-gated: alleged-policy (data-policy 2026-07-26).
 * (A) banned sections never carry tier alleged
 * (C) fixtures: missing verbatim / paraphrase fail; outcome+verbatim pass; banned-section alleged fails
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  ALLEGED_BANNED_SECTIONS,
  ALLEGED_KNOWN_BAD_BANNED_SECTION,
  ALLEGED_KNOWN_BAD_MISSING_VERBATIM,
  ALLEGED_KNOWN_BAD_PARAPHRASE,
  ALLEGED_KNOWN_BAD_SINGLE_OUTLET,
  ALLEGED_KNOWN_GOOD_WITH_OUTCOME,
} from '../../lib/data/__fixtures__/allegedPolicyGuard.fixture';
import {
  bannedSectionHasAllegedTier,
  validateAllegedControversy,
} from '../../lib/data/allegedPolicy';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profilesRoot = path.join(projectRoot, 'lib/data/generated/profiles');

test('fixture (i): alleged item WITHOUT verbatim quote+url → FAILS', () => {
  const r = validateAllegedControversy(ALLEGED_KNOWN_BAD_MISSING_VERBATIM);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /verbatimQuote/i.test(x)));
  assert.ok(r.reasons.some((x) => /URL/i.test(x)));
});

test('fixture (ii): alleged item with paraphrased text → FAILS', () => {
  const r = validateAllegedControversy(ALLEGED_KNOWN_BAD_PARAPHRASE);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /paraphrase/i.test(x)));
});

test('fixture (iii): alleged item with one independent outlet → FAILS', () => {
  const r = validateAllegedControversy(ALLEGED_KNOWN_BAD_SINGLE_OUTLET);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /reportedByOutletCount/i.test(x)));
  assert.ok(r.reasons.some((x) => /independent source/i.test(x)));
});

test('fixture (iv): alleged item with outcome + verbatim + two outlets → PASSES', () => {
  const r = validateAllegedControversy(ALLEGED_KNOWN_GOOD_WITH_OUTCOME);
  assert.equal(r.ok, true, r.reasons.join('; '));
});

test('fixture (v): alleged tier in a banned section → FAILS', () => {
  const text = JSON.stringify(ALLEGED_KNOWN_BAD_BANNED_SECTION.payload);
  assert.equal(bannedSectionHasAllegedTier(text), true);
  assert.ok(ALLEGED_BANNED_SECTIONS.includes(ALLEGED_KNOWN_BAD_BANNED_SECTION.section));
});

test('live migrated profiles: no banned section carries tier alleged', () => {
  const ids = readdirSync(profilesRoot).filter((d) =>
    existsSync(path.join(profilesRoot, d, 'manifest.json')),
  );
  const violations: string[] = [];
  for (const id of ids) {
    for (const section of ALLEGED_BANNED_SECTIONS) {
      const file = path.join(profilesRoot, id, `${section}.json`);
      if (!existsSync(file)) continue;
      const text = readFileSync(file, 'utf8');
      if (bannedSectionHasAllegedTier(text)) violations.push(`${id}/${section}.json`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `banned sections carry alleged:\n${violations.map((v) => `  ${v}`).join('\n')}`,
  );
});

test('live controversies: unverified items satisfy verbatim+url+outcome+two-source floor', () => {
  const ids = readdirSync(profilesRoot).filter((d) =>
    existsSync(path.join(profilesRoot, d, 'controversies.json')),
  );
  const violations: string[] = [];
  for (const id of ids) {
    const file = path.join(profilesRoot, id, 'controversies.json');
    const data = JSON.parse(readFileSync(file, 'utf8')) as {
      items?: Array<{
        id: string;
        isVerified: boolean;
        verbatimQuote?: string;
        outcome?: string;
        sources?: Array<{ url?: string }>;
      }>;
    };
    for (const item of data.items ?? []) {
      if (item.isVerified) continue;
      const r = validateAllegedControversy(item);
      if (!r.ok) violations.push(`${id}/${item.id}: ${r.reasons.join('; ')}`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `alleged controversies incomplete:\n${violations.map((v) => `  ${v}`).join('\n')}`,
  );
});

test('S000033 news listings are not alleged-by-failed-corroboration', () => {
  const newsPath = path.join(profilesRoot, 'S000033', 'news.json');
  assert.ok(existsSync(newsPath), 'S000033 news.json must exist');
  const data = JSON.parse(readFileSync(newsPath, 'utf8')) as {
    items: Array<{ tier?: string; source?: { tier?: string } }>;
  };
  const allegedListings = (data.items ?? []).filter(
    (i) => (i.tier || i.source?.tier) === 'alleged',
  );
  assert.equal(allegedListings.length, 0, `news listings still alleged: ${allegedListings.length}`);
});
