/**
 * Unit tests for official /issues/ accordion extract + topic resolve (no network).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAccordionIssueSections } from '../lib/fetchSenateOfficialIssues';

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
