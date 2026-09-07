import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLobbyingMemberPayload,
  type LobbyingMemberItem,
} from '../ingest-lobbying-member';

const BASE = {
  bioguideId: 'S000033',
  memberName: 'Bernard Sanders',
  asOf: '2026-09-07',
  fetchedAt: '2026-09-07T04:00:00.000Z',
  pagesScanned: 0,
  filingsSeen: 0,
};

const PRIOR_ITEM: LobbyingMemberItem = {
  honoreeName: 'Senator Bernard Sanders',
  amount: 500,
  date: '2025-05-01',
  payeeName: 'Example PAC',
  registrantName: 'Example Registrant',
  filingYear: 2025,
  filingUrl: 'https://lda.senate.gov/filings/public/filing/example/',
};

test('LDA member ingest preserves prior items when refresh has errors and no fresh matches', () => {
  const payload = buildLobbyingMemberPayload({
    ...BASE,
    unique: [],
    errors: ['search Sanders 2025 p1: HTTP 429'],
    prior: { items: [PRIOR_ITEM] },
  });

  assert.equal(payload.status, 'filled');
  assert.deepEqual(payload.items, [PRIOR_ITEM]);
  assert.match(payload.note ?? '', /fetch-failed/);
  assert.match(payload.note ?? '', /prior item\(s\) preserved/);
  assert.deepEqual(payload.errors, ['search Sanders 2025 p1: HTTP 429']);
});

test('LDA member ingest marks fetch-failed when errors prevent a verified empty result', () => {
  const payload = buildLobbyingMemberPayload({
    ...BASE,
    unique: [],
    errors: ['2026 p1: HTTP 500'],
    prior: null,
  });

  assert.equal(payload.status, 'fetch-failed');
  assert.equal(payload.items.length, 0);
  assert.match(payload.note ?? '', /no verified empty record written/);
});

test('LDA member ingest writes honest-gap only after an error-free empty scan', () => {
  const payload = buildLobbyingMemberPayload({
    ...BASE,
    pagesScanned: 29,
    filingsSeen: 725,
    unique: [],
    errors: [],
    prior: null,
  });

  assert.equal(payload.status, 'honest-gap');
  assert.equal(payload.items.length, 0);
  assert.match(payload.note ?? '', /diagnosed empty after scan/);
});
