import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NewsItem } from '../../lib/types';
import {
  maxOutletShare,
  normalizeNewsOutletName,
  selectNewsItemsWithOutletCap,
} from '../lib/newsOutletDiversity';

function item(outlet: string, date: string, id: string): NewsItem {
  return {
    id,
    headline: `Headline ${id}`,
    summary: 'Summary',
    date,
    category: 'Congress',
    isOpinion: false,
    isVerified: false,
    url: `https://example.com/${id}`,
    source: {
      name: outlet,
      url: `https://example.com/${id}`,
      tier: 'media',
      date,
    },
  };
}

describe('newsOutletDiversity', () => {
  it('normalizes AP / Hill / Guardian aliases', () => {
    assert.equal(normalizeNewsOutletName('AP News'), 'AP News');
    assert.equal(normalizeNewsOutletName('Associated Press'), 'AP News');
    assert.equal(normalizeNewsOutletName('The Hill News'), 'The Hill');
    assert.equal(normalizeNewsOutletName('The Guardian'), 'The Guardian');
  });

  it('caps any outlet at ≤50% of the selected set', () => {
    const items = [
      ...Array.from({ length: 11 }, (_, i) =>
        item('The Guardian', `2026-07-${String(20 - i).padStart(2, '0')}`, `g${i}`),
      ),
      item('NPR', '2026-06-18', 'n1'),
      item('AP News', '2026-06-17', 'a1'),
      item('AP News', '2026-06-01', 'a2'),
      item('The Hill', '2026-05-01', 'h1'),
    ];
    const selected = selectNewsItemsWithOutletCap(items, 15, 0.5);
    const share = maxOutletShare(selected);
    assert.ok(share.share <= 0.5, `expected ≤50%, got ${share.outlet}=${share.share}`);
    assert.ok(selected.some((i) => normalizeNewsOutletName(i.source.name) === 'AP News'));
    assert.ok(selected.some((i) => normalizeNewsOutletName(i.source.name) === 'NPR'));
  });

  it('shrinks the set when other outlets are exhausted (no >50% monopoly)', () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) =>
        item('The Guardian', `2026-07-${String(20 - i).padStart(2, '0')}`, `g${i}`),
      ),
      item('NPR', '2026-06-18', 'n1'),
      item('AP News', '2026-06-17', 'a1'),
    ];
    const selected = selectNewsItemsWithOutletCap(items, 15, 0.5);
    const share = maxOutletShare(selected);
    assert.ok(share.share <= 0.5, `expected ≤50%, got ${share.outlet}=${share.share}`);
    assert.equal(selected.filter((i) => normalizeNewsOutletName(i.source.name) === 'The Guardian').length, 2);
    assert.equal(selected.length, 4);
  });

  it('keeps newest Guardian items when trimming for share', () => {
    const items = [
      item('The Guardian', '2026-07-01', 'g-old'),
      item('The Guardian', '2026-07-20', 'g-new'),
      item('AP News', '2026-07-19', 'a1'),
    ];
    const selected = selectNewsItemsWithOutletCap(items, 15, 0.5);
    assert.ok(selected.some((i) => i.id === 'g-new'));
    assert.ok(selected.some((i) => i.id === 'a1'));
    assert.ok(!selected.some((i) => i.id === 'g-old'));
  });
});
