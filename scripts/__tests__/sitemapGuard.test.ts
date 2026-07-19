/**
 * Build-gated guard (W3b): the sitemap must enumerate every crawlable route — all static routes,
 * every migrated state page, and every politician profile from the roster. Freezes the "sitemap
 * silently shrank to a single-URL stub" defect: the count must equal static + states + roster.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import sitemap, { STATIC_ROUTES } from '../../app/sitemap';
import { allPoliticians } from '../../lib/data/allPoliticians';
import { SUPPORTED_STATE_CODES } from '../../lib/data/supportedStates';

test('sitemap enumerates static routes + every state page + every politician profile', () => {
  const entries = sitemap();
  const expected = STATIC_ROUTES.length + SUPPORTED_STATE_CODES.length + allPoliticians.length;
  assert.equal(
    entries.length,
    expected,
    `sitemap has ${entries.length} entries; expected ${expected} (static ${STATIC_ROUTES.length} + states ${SUPPORTED_STATE_CODES.length} + roster ${allPoliticians.length})`,
  );
});

test('sitemap is not a stub — roster is substantial and every profile is present', () => {
  const entries = sitemap();
  assert.ok(allPoliticians.length >= 50, `roster too small (${allPoliticians.length}) — check accessor`);
  const urls = new Set(entries.map((e) => e.url));
  for (const p of allPoliticians) {
    assert.ok(
      urls.has(`https://the-ledger-s4dn.vercel.app/politicians/${p.id}`),
      `missing sitemap entry for politician ${p.id}`,
    );
  }
  for (const code of SUPPORTED_STATE_CODES) {
    assert.ok(
      urls.has(`https://the-ledger-s4dn.vercel.app/states/${code}`),
      `missing sitemap entry for state ${code}`,
    );
  }
});

test('every sitemap url is an absolute https production URL', () => {
  for (const e of sitemap()) {
    assert.match(e.url, /^https:\/\/[^/]+\//, `non-absolute sitemap url: ${e.url}`);
  }
});
