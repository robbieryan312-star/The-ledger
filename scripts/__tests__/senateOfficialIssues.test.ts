/**
 * Unit tests for official /issues/ accordion extract + topic resolve (no network).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAccordionIssueSections } from '../lib/fetchSenateOfficialIssues';
import {
  buildOfficialIssuesPositionsOutput,
  countOfficialPlatformPositions,
} from '../sync-official-issues-positions';

const SAMPLE_HTML = `
<div class="elementor-accordion">
  <div class="elementor-accordion-item">
    <div id="elementor-tab-title-1491" class="elementor-tab-title">
      <a class="elementor-accordion-title" href="">Medicare for All</a>
    </div>
    <div id="elementor-tab-content-1491" class="elementor-tab-content">
      <p>Medicare is the most popular health care program in America. Guaranteeing comprehensive health benefits for Americans over 65 has proven to be enormously successful and popular across the political spectrum.</p>
    </div>
  </div>
  <div class="elementor-accordion-item">
    <div id="elementor-tab-title-1492" class="elementor-tab-title">
      <a class="elementor-accordion-title" href="">Education</a>
    </div>
    <div id="elementor-tab-content-1492" class="elementor-tab-content">
      <p>In an increasingly competitive global economy, we must ensure every student has the opportunity to pursue a quality education without crushing student loan debt.</p>
    </div>
  </div>
</div>
`;

test('extractAccordionIssueSections returns titled verbatim sections', () => {
  const sections = extractAccordionIssueSections(SAMPLE_HTML);
  assert.equal(sections.length, 2);
  assert.equal(sections[0]?.title, 'Medicare for All');
  assert.match(sections[0]?.text ?? '', /Medicare is the most popular/);
  assert.equal(sections[1]?.title, 'Education');
  assert.match(sections[1]?.text ?? '', /quality education/);
});

const TOPIC_IDS = ['healthcare', 'education'];

const PRIOR_POSITIONS = {
  bioguideId: 'S000033',
  status: 'filled' as const,
  note: 'prior filled positions',
  byTopic: {
    healthcare: {
      platformPositions: [
        {
          text: 'Senator Sanders believes every American should have access to safe, effective, and affordable prescription medications.',
          source: 'sanders.senate.gov',
          url: 'https://www.sanders.senate.gov/issues/',
          tier: 'official' as const,
          asOf: '2026-07-25',
        },
      ],
    },
    education: { platformPositions: [] },
  },
};

test('official issues fetch failure preserves prior filled positions', () => {
  const out = buildOfficialIssuesPositionsOutput(
    'S000033',
    {
      byTopic: new Map(),
      pageUrl: 'https://www.sanders.senate.gov/issues/',
      connected: false,
      reached: false,
      rawSectionCount: 0,
      qualifiedCount: 0,
    },
    TOPIC_IDS,
    PRIOR_POSITIONS,
  );

  assert.equal(out.status, 'filled');
  assert.equal(countOfficialPlatformPositions(out), 1);
  assert.match(out.note, /prior official issue stance\(s\) preserved/);
  assert.match(out.note, /fetch-failed/);
  assert.equal(
    out.byTopic.healthcare.platformPositions[0]?.text,
    PRIOR_POSITIONS.byTopic.healthcare.platformPositions[0]?.text,
  );
});

test('official issues fetch failure without prior data records fetch-failed, not honest-gap', () => {
  const out = buildOfficialIssuesPositionsOutput(
    'X000001',
    {
      byTopic: new Map(),
      pageUrl: 'https://example.senate.gov/issues/',
      connected: true,
      reached: false,
      rawSectionCount: 0,
      qualifiedCount: 0,
    },
    TOPIC_IDS,
  );

  assert.equal(out.status, 'fetch-failed');
  assert.equal(countOfficialPlatformPositions(out), 0);
  assert.match(out.note, /connected=true reached=false/);
});

test('reachable official issues page with no qualified sections remains an honest gap', () => {
  const out = buildOfficialIssuesPositionsOutput(
    'X000002',
    {
      byTopic: new Map(),
      pageUrl: 'https://example.senate.gov/issues/',
      connected: true,
      reached: true,
      rawSectionCount: 0,
      qualifiedCount: 0,
    },
    TOPIC_IDS,
    PRIOR_POSITIONS,
  );

  assert.equal(out.status, 'honest-gap');
  assert.equal(countOfficialPlatformPositions(out), 0);
  assert.match(out.note, /Exhausted official issues route/);
});
