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

  it('classifies "healthcare system" + cancer CREC excerpt as healthcare (not health≠healthcare)', () => {
    const text =
      'Mr. SANDERS. Mr. President, in the midst of a broken and dysfunctional healthcare system, ' +
      'we must do everything that we can to find new cures and treatments for pediatric cancer.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'healthcare');
  });

  it('classifies government shutdown / paycheck CREC excerpt as economy-taxes', () => {
    const text =
      'Mr. SANDERS. Mr. President, we are now in the 38th day of a government shutdown. ' +
      'That means that Federal employees all over this country who have to feed their families are not getting paychecks.';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'economy-taxes');
  });

  it('classifies short ambiguous text as legislation (fallback)', () => {
    const text = 'Proceeded to consider';
    assert.strictEqual(classifyTextToRecordTopicId(text), 'legislation');
  });
});
