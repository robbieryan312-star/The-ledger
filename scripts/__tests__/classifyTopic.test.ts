import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyTextToRecordTopicId } from '../../lib/data/profileRecordByTopic';

describe('classifyTextToRecordTopicId', () => {
  it('classifies housing bill as economy-taxes (not immigration due to "ice" substring)', () => {
    const text = '21st Century ROAD to Housing Act — addressing home prices and affordable housing';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'economy-taxes');
  });

  it('classifies IRS/tax-filing speech as economy-taxes (not defense due to "nato" in "senator")', () => {
    const text =
      'Senator Sanders spoke on the floor about families struggling to file their taxes with the IRS. ' +
      'Tax day is approaching and millions will face penalties for late filing taxes.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'economy-taxes');
  });

  it('classifies judicial confirmation as civil-liberties (not education due to biographical aside)', () => {
    const text =
      'On the Nomination of Jane Smith to be United States District Judge for the Eastern District. ' +
      'The nominee is a former public school teacher who went on to attend law school and serve as a district judge.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'civil-liberties');
  });

  it('classifies climate/Green New Deal speech as climate', () => {
    const text =
      'We must address the climate crisis with bold investments in renewable energy and reducing carbon emissions. ' +
      'The Green New Deal is a framework for conservation and reducing pollution from fossil fuels.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'climate');
  });

  it('classifies Ukraine/military aid speech as defense-veterans', () => {
    const text =
      'We must continue to support Ukraine against Russian aggression. Our military aid ' +
      'and NATO alliance commitments to our armed forces and foreign aid are critical.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'defense-veterans');
  });

  it('classifies Medicare for All / healthcare speech as healthcare', () => {
    const text =
      'Medicare for All would guarantee health insurance coverage for every American. ' +
      'We must lower prescription drug costs and protect Medicaid.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'healthcare');
  });

  it('classifies short ambiguous text as legislation (fallback)', () => {
    const text = 'Proceeded to consider';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'legislation');
  });
});
