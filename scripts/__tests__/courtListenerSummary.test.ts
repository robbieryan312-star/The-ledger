import assert from 'node:assert/strict';
import test from 'node:test';
import {
  courtSummaryFallbackHeadline,
  extractCourtSummaryFromSearchResult,
  pickCourtSourceText,
} from '../lib/courtListenerSummary';

test('pickCourtSourceText returns verbatim syllabus when present', () => {
  const { sourceText, sourceField } = pickCourtSourceText({
    caseName: 'Example v. State',
    syllabus: 'The court held that the trial court erred in admitting certain evidence.',
    opinions: [{ snippet: 'caption only' }],
  });
  assert.equal(sourceField, 'syllabus');
  assert.equal(
    sourceText,
    'The court held that the trial court erred in admitting certain evidence.',
  );
});

test('pickCourtSourceText ignores opinion snippet when no metadata field exists', () => {
  const { sourceText, sourceField } = pickCourtSourceText({
    caseName: 'Dennis Sochor v. State of Florida',
    syllabus: '',
    opinions: [{
      snippet: `Supreme Court of Florida
PER CURIAM.
Over forty-four years ago, Dennis Sochor murdered Patricia Gifford.`,
    }],
  });
  assert.equal(sourceText, null);
  assert.equal(sourceField, null);
});

test('pickCourtSourceText prefers cluster headnotes verbatim', () => {
  const { sourceText, sourceField } = pickCourtSourceText(
    {
      caseName: 'Example v. State',
      opinions: [{ snippet: 'Opening narrative only.' }],
    },
    { cluster: { headnotes: 'The court affirmed the trial court judgment on statutory grounds.' } },
  );
  assert.equal(sourceField, 'headnotes');
  assert.equal(
    sourceText,
    'The court affirmed the trial court judgment on statutory grounds.',
  );
});

test('pickCourtSourceText does not use plain_text or snippet', () => {
  const { sourceText } = pickCourtSourceText(
    {
      opinions: [{ snippet: 'Supreme Court of Florida\nAppellant vs. Appellee.' }],
    },
    { cluster: {} },
  );
  assert.equal(sourceText, null);
});

test('courtSummaryFallbackHeadline uses title and status without inventing', () => {
  assert.equal(
    courtSummaryFallbackHeadline('Foo v. Bar', 'Published'),
    'Foo v. Bar — Published',
  );
});

test('extractCourtSummaryFromSearchResult alias matches pickCourtSourceText', () => {
  const input = {
    syllabus: 'Affirmed.',
    opinions: [{ snippet: 'ignored' }],
  };
  const picked = pickCourtSourceText(input);
  const legacy = extractCourtSummaryFromSearchResult(input);
  assert.deepEqual(legacy, { summary: picked.sourceText, summarySource: picked.sourceField });
});
