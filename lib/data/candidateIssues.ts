import type { EvidenceItem, Issue } from '../types';
import { sortEvidenceByDate } from './topicCoverage';

const TOPIC_ALIASES: Record<string, string[]> = {
  economy: ['economy', 'fiscal', 'tax', 'budget', 'spending', 'debt'],
  immigration: ['immigration', 'border', 'sanctuary', 'e-verify'],
  education: ['education', 'school', 'teacher', 'parental'],
  healthcare: ['healthcare', 'health', 'medicaid', 'medicare', 'abortion', 'reproductive'],
  environment: ['climate', 'environment', 'energy', 'green'],
  'foreign policy': ['foreign', 'ukraine', 'israel', 'nato', 'china'],
};

function evidenceKey(item: EvidenceItem): string {
  return `${item.type}|${item.date}|${item.description}`;
}

/** Votes, legislation, and official-tier filings — not campaign statements alone. */
function isOfficialRecordEvidence(item: EvidenceItem): boolean {
  if (item.source.tier === 'official') return true;
  return item.type === 'vote' || item.type === 'legislation';
}

function dedupeEvidence(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = evidenceKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function topicBucket(issue: Issue): string {
  const text = `${issue.name} ${issue.category} ${issue.position}`.toLowerCase();
  for (const [bucket, keywords] of Object.entries(TOPIC_ALIASES)) {
    if (keywords.some((kw) => text.includes(kw))) return bucket;
  }
  return issue.category.toLowerCase() || issue.name.toLowerCase();
}

/** Match an election issue to a politician profile issue by name or topic bucket. */
export function findProfileIssueMatch(electionIssue: Issue, profileIssues: Issue[]): Issue | null {
  const exact = profileIssues.find(
    (p) => p.name.toLowerCase() === electionIssue.name.toLowerCase(),
  );
  if (exact) return exact;

  const bucket = topicBucket(electionIssue);
  return (
    profileIssues.find((p) => topicBucket(p) === bucket) ??
    profileIssues.find((p) => p.category.toLowerCase() === electionIssue.category.toLowerCase()) ??
    null
  );
}

export interface MergedCandidateIssue extends Issue {
  profileMatched?: boolean;
  profileIssueName?: string;
  campaignOnly?: boolean;
}

/** Merge election mock issues with politician profile evidence when a profile resolves. */
export function mergeCandidateIssues(
  electionIssues: Issue[],
  profileIssues?: Issue[],
  hasProfile = false,
): MergedCandidateIssue[] {
  return electionIssues.map((issue) => {
    const profileMatch = profileIssues?.length
      ? findProfileIssueMatch(issue, profileIssues)
      : null;

    const electionEvidence = issue.evidence ?? [];
    const profileEvidence = profileMatch?.evidence ?? [];
    const mergedEvidence = sortEvidenceByDate(
      dedupeEvidence([...electionEvidence, ...profileEvidence]),
    );

    const campaignOnly =
      !hasProfile &&
      (mergedEvidence.length === 0 || !mergedEvidence.some(isOfficialRecordEvidence));

    return {
      ...issue,
      evidence: mergedEvidence.length > 0 ? mergedEvidence : issue.evidence,
      profileMatched: Boolean(profileMatch && profileEvidence.length > 0),
      profileIssueName: profileMatch?.name,
      campaignOnly,
    };
  });
}

export const CAMPAIGN_ONLY_NOTICE =
  'No verified record beyond campaign statements in The Ledger datasets.';
