import assert from 'node:assert/strict';
import test from 'node:test';
import {
  courtSummaryFallbackHeadline,
  extractCourtSummaryFromSearchResult,
} from '../lib/courtListenerSummary';

test('extractCourtSummary prefers syllabus when present', () => {
  const { summary, summarySource } = extractCourtSummaryFromSearchResult({
    caseName: 'Example v. State',
    syllabus: 'The court held that the trial court erred in admitting certain evidence.',
    opinions: [{ snippet: 'caption only' }],
  });
  assert.equal(summarySource, 'syllabus');
  assert.match(summary!, /trial court erred/);
});

test('extractCourtSummary uses extractive snippet when syllabus empty', () => {
  const { summary, summarySource } = extractCourtSummaryFromSearchResult({
    caseName: 'Dennis Sochor v. State of Florida',
    syllabus: '',
    opinions: [{
      snippet: `Supreme Court of Florida
No. SC2026-0971
PER CURIAM.
Over forty-four years ago, Dennis Sochor murdered Patricia Gifford. For this crime he was sentenced to death.`,
    }],
  });
  assert.equal(summarySource, 'snippet');
  assert.match(summary!, /Dennis Sochor murdered Patricia/);
});

test('extractCourtSummary returns null when only caption boilerplate exists', () => {
  const { summary } = extractCourtSummaryFromSearchResult({
    caseName: 'Caption Only v. State',
    opinions: [{
      snippet: `Supreme Court of Florida
No. SC2026-0001
Appellant,
vs.
STATE OF FLORIDA,
Appellee.`,
    }],
  });
  assert.equal(summary, null);
});

test('courtSummaryFallbackHeadline uses title and status without inventing', () => {
  assert.equal(
    courtSummaryFallbackHeadline('Foo v. Bar', 'Published'),
    'Foo v. Bar — Published',
  );
});
