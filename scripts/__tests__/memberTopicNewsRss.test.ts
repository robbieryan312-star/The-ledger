/**
 * Member topic/tag RSS slug + discovery helpers.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { memberNewsTopicSlug } from '../lib/memberTopicNewsRss';

test('memberNewsTopicSlug kebab-cases primary display name', () => {
  assert.equal(memberNewsTopicSlug('Bernie Sanders'), 'bernie-sanders');
  assert.equal(memberNewsTopicSlug('  Alexandria Ocasio-Cortez '), 'alexandria-ocasio-cortez');
});
