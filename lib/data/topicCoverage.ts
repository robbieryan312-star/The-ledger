import type { EvidenceItem, Issue } from '../types';

/** Standard policy areas every featured profile should cover with evidence or an honest gap label. */
export interface PolicyTopicDef {
  id: string;
  label: string;
  keywords: string[];
}

export const STANDARD_POLICY_TOPICS: PolicyTopicDef[] = [
  { id: 'abortion', label: 'Abortion', keywords: ['abortion', 'reproductive', 'pro-life', 'pro-choice', 'roe', '6-week', '15-week'] },
  { id: 'guns', label: 'Gun Control', keywords: ['gun', 'firearm', 'second amendment', '2nd amendment', '2a', 'nra', 'carry', 'weapon'] },
  { id: 'healthcare', label: 'Healthcare', keywords: ['healthcare', 'health care', 'medicaid', 'medicare', 'aca', 'obamacare', 'insurance', 'hospital'] },
  { id: 'immigration', label: 'Immigration', keywords: ['immigration', 'border', 'migrants', 'undocumented', 'sanctuary', 'e-verify', 'dreamer', 'daca'] },
  { id: 'economy', label: 'Economy / Taxes', keywords: ['economy', 'tax', 'fiscal', 'budget', 'debt', 'spending', 'esg', 'inflation', 'minimum wage'] },
  { id: 'climate', label: 'Climate / Energy', keywords: ['climate', 'environment', 'energy', 'green', 'carbon', 'fossil', 'everglades', 'drilling', 'renewable'] },
  { id: 'education', label: 'Education', keywords: ['education', 'school', 'learning', 'student', 'teacher', 'curriculum', 'book', 'woke', 'hbcu'] },
  { id: 'foreign', label: 'Foreign Policy', keywords: ['foreign', 'ukraine', 'israel', 'nato', 'war', 'military', 'aid', 'china', 'taiwan', 'cuba', 'venezuela', 'haiti'] },
  { id: 'civil', label: 'Civil Liberties', keywords: ['civil liberties', 'surveillance', 'privacy', 'fisa', 'patriot', '4th amendment', 'speech', 'censorship'] },
  { id: 'criminal', label: 'Criminal Justice', keywords: ['criminal justice', 'sentencing', 'incarceration', 'police reform', 'bail', 'death penalty', 'prison', 'law enforcement'] },
];

export const TOPIC_GAP_LABEL = 'No verified record in integrated data';
export const TOPIC_GAP_DETAIL =
  'No sourced votes, actions, filings, or statements for this topic area are in The Ledger\'s integrated datasets yet. This is not a position statement — only an honest coverage gap.';

export function matchTopic(issues: Issue[], topic: PolicyTopicDef): Issue | null {
  const kw = topic.keywords;
  const byCategory = issues.find((i) =>
    kw.some((k) => i.category.toLowerCase().includes(k) || i.name.toLowerCase().includes(k)),
  );
  if (byCategory) return byCategory;
  return issues.find((i) =>
    kw.some((k) =>
      (i.position?.toLowerCase() || '').includes(k) ||
      (i.detail?.toLowerCase() || '').includes(k) ||
      (i.statement?.toLowerCase() || '').includes(k),
    ),
  ) ?? null;
}

export function topicHasEvidence(issue: Issue): boolean {
  return !!(issue.evidence && issue.evidence.length > 0) || !!issue.source;
}

export function createTopicGapIssue(topic: PolicyTopicDef): Issue {
  return {
    name: topic.label,
    position: TOPIC_GAP_LABEL,
    detail: TOPIC_GAP_DETAIL,
    category: topic.label,
    statement: TOPIC_GAP_DETAIL,
    evidence: [],
  };
}

/** Merge real issues with explicit gap placeholders for uncovered standard topics (featured profiles only). */
export function issuesWithTopicCoverage(issues: Issue[], includeGaps: boolean): Issue[] {
  if (!includeGaps) return issues;
  const merged = [...issues];
  const existing = new Set(issues.map((i) => i.name.toLowerCase()));
  for (const topic of STANDARD_POLICY_TOPICS) {
    const matched = matchTopic(issues, topic);
    if (!matched && !existing.has(topic.label.toLowerCase())) {
      merged.push(createTopicGapIssue(topic));
      existing.add(topic.label.toLowerCase());
    }
  }
  return merged;
}

export function sortEvidenceByDate(items: EvidenceItem[]): EvidenceItem[] {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
