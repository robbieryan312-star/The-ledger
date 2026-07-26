/**
 * Build-gated: no fabricated outlet defaults (M-PROVENANCE-DEFAULTS 2026-07-26).
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  PROVENANCE_FORBIDDEN_DEFAULT_LABELS,
  PROVENANCE_KNOWN_BAD_MEDIA_NO_OUTLET,
  PROVENANCE_KNOWN_GOOD_CREC_URL_DERIVED,
} from '../../lib/data/__fixtures__/provenanceOutletGuard.fixture';
import { resolveRecordedOutlet } from '../../lib/data/resolveRecordedOutlet';
import { buildCrecSaidDidLinks } from '../../lib/data/saidDidVoteContext';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('fixture: statement with no outlet is NOT resolved to a fabricated default label', () => {
  const s = PROVENANCE_KNOWN_BAD_MEDIA_NO_OUTLET.statement;
  const resolved = resolveRecordedOutlet(undefined, s.url);
  assert.equal(resolved, null);
  for (const label of PROVENANCE_FORBIDDEN_DEFAULT_LABELS) {
    assert.notEqual(resolved, label);
  }
});

test('fixture: CREC govinfo URL derives recorded outlet (not invent when host unknown)', () => {
  const s = PROVENANCE_KNOWN_GOOD_CREC_URL_DERIVED.statement;
  assert.equal(resolveRecordedOutlet(undefined, s.url), PROVENANCE_KNOWN_GOOD_CREC_URL_DERIVED.expectedOutlet);
  assert.equal(resolveRecordedOutlet(undefined, 'https://example.com/x'), null);
});

test('buildCrecSaidDidLinks omits pairs when outlet cannot be resolved', () => {
  const byTopic = buildCrecSaidDidLinks(
    {
      climate: {
        statements: [
          {
            title: 'Mr. SANDERS. Mr. President, climate example without resolvable outlet.',
            date: '2024-01-01',
            url: 'https://www.example-unknown.test/not-govinfo',
            tier: 'official',
            topicId: 'climate',
            verbatim: true,
          },
        ],
      },
    },
    [
      {
        id: 'v1',
        billId: 'S.1',
        billTitle: 'Climate Act',
        date: '2024-02-01',
        vote: 'Yea',
        result: 'Passed',
        category: 'Legislation',
        source: { name: 'Senate', url: 'https://www.senate.gov', tier: 'official' },
      } as never,
    ],
  );
  assert.equal(Object.keys(byTopic).length, 0);
});

test('lib/ and scripts/ contain no fabricated provenance ?? defaults', () => {
  // Synthetic DefunctSurveySource stands in for retired survey APIs — pattern only.
  const pattern = String.raw`\?\?\s*'(Journalism|Congressional Record|Recorded position|DefunctSurveySource)'`;
  let out = '';
  try {
    out = execSync(`rg -n --regexp ${JSON.stringify(pattern)} lib/ scripts/ || true`, {
      cwd: projectRoot,
      encoding: 'utf8',
    });
  } catch {
    out = '';
  }
  assert.equal(out.trim(), '', `fabricated provenance defaults still present:\n${out}`);
});

test('S000033 saidDid outlets are recorded or URL-derived — never bare invent labels', () => {
  const saidDid = JSON.parse(
    readFileSync(path.join(projectRoot, 'lib/data/generated/profiles/S000033/saidDid.json'), 'utf8'),
  ) as { byTopic: Record<string, Array<{ saidOutlet?: string; saidUrl?: string }>> };
  for (const [topic, links] of Object.entries(saidDid.byTopic ?? {})) {
    for (const [i, link] of links.entries()) {
      const outlet = (link.saidOutlet ?? '').trim();
      assert.ok(outlet, `${topic}[${i}] missing saidOutlet`);
      assert.notEqual(outlet, 'Journalism');
      assert.notEqual(outlet, 'Recorded position');
      assert.notEqual(outlet, 'DefunctSurveySource');
      // Bare "Congressional Record" without GovInfo qualifier is the deleted invent string.
      assert.notEqual(outlet, 'Congressional Record');
    }
  }
});
