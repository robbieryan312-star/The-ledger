import type { EvidenceItem, Issue } from '../types';

/** Standard policy areas every featured profile should cover with evidence or an honest gap label. */
export interface PolicyTopicDef {
  id: string;
  label: string;
  keywords: string[];
}

export const STANDARD_POLICY_TOPICS: PolicyTopicDef[] = [
  {
    id: 'economy-taxes',
    label: 'Economy & Taxes',
    keywords: [
      'economy', 'fiscal', 'budget', 'debt', 'spending', 'inflation', 'jobs', 'wage', 'minimum wage',
      'trade', 'tariff', 'tax', 'taxes', 'corporate', 'irs', 'estate tax', 'capital gains', 'tax cut',
      'antitrust', 'monopoly', 'esg', 'housing', 'rent', 'mortgage', 'homeless', 'affordable housing',
      'zoning', 'eviction', 'community development', 'hud',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    keywords: [
      'healthcare', 'health care', 'medicaid', 'medicare', 'aca', 'obamacare', 'insurance', 'hospital',
      'prescription', 'drug price',
    ],
  },
  {
    id: 'abortion',
    label: 'Abortion & Reproductive Rights',
    keywords: [
      'abortion', 'reproductive', 'pro-life', 'pro-choice', 'roe', '6-week', '15-week', 'contraception',
      'ivf', 'dobbs',
    ],
  },
  {
    id: 'immigration',
    label: 'Immigration & Border',
    keywords: [
      'immigration', 'border', 'migrants', 'undocumented', 'sanctuary', 'e-verify', 'dreamer', 'daca',
      'asylum',
    ],
  },
  {
    id: 'climate',
    label: 'Climate & Energy',
    keywords: [
      'climate', 'environment', 'energy', 'green', 'carbon', 'fossil', 'everglades', 'drilling',
      'renewable', 'emissions', 'paris',
    ],
  },
  {
    id: 'public-safety',
    label: 'Public Safety',
    keywords: [
      'gun', 'firearm', 'second amendment', '2nd amendment', '2a', 'nra', 'carry', 'weapon',
      'assault weapon', 'background check', 'criminal justice', 'sentencing', 'incarceration',
      'police reform', 'bail', 'death penalty', 'prison', 'law enforcement', 'crime',
    ],
  },
  {
    id: 'civil-liberties',
    label: 'Civil Liberties & Regulation',
    keywords: [
      'civil liberties', 'surveillance', 'fisa', 'patriot', '4th amendment', 'speech', 'censorship',
      'voting rights', 'civil rights', 'discrimination', 'lgbt', 'equality', 'judiciary', 'nomination',
    ],
  },
  {
    id: 'defense-veterans',
    label: 'Defense & Veterans',
    keywords: [
      'foreign', 'ukraine', 'israel', 'nato', 'war', 'military', 'aid', 'china', 'taiwan', 'cuba',
      'venezuela', 'haiti', 'defense', 'pentagon', 'troops', 'veteran', 'veterans', 'gi bill',
      'military family', 'service member', 'ptsd', 'tricare', 'va benefits', 'veterans affairs',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    keywords: [
      'education', 'school', 'learning', 'student', 'teacher', 'curriculum', 'book', 'woke', 'hbcu',
      'tuition', 'student loan',
    ],
  },
  {
    id: 'technology',
    label: 'Technology, Privacy & AI',
    keywords: [
      'artificial intelligence', 'section 230', 'data privacy', 'algorithm', 'big tech',
      'content moderation', 'deepfake', 'social media', 'platform', 'tech antitrust',
    ],
  },
];

export const TOPIC_GAP_LABEL = 'No verified record in integrated data';
export const TOPIC_GAP_DETAIL =
  'No sourced votes, actions, filings, or statements for this topic area are in The Ledger\'s integrated datasets yet. This is not a position statement — only an honest coverage gap.';

export const PENDING_INTEGRATION_LABEL = 'Pending integration into verified pipeline';

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

/** Split issue evidence into current (primary) and historical (earlier record) sections. */
export function issueEvidenceSections(issue: Issue): {
  current: EvidenceItem[];
  historical: EvidenceItem[];
} {
  return {
    current: sortEvidenceByDate(issue.evidence ?? []),
    historical: sortEvidenceByDate(issue.historicalEvidence ?? []),
  };
}
