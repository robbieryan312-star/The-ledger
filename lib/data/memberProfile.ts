/**
 * Per-category profile files for migrated gold-standard members (Phase 17b architecture).
 * One JSON per destination view under lib/data/generated/profiles/{bioguideId}/.
 * Other members continue to read from the topicPositions mega-bundle.
 *
 * Uses static JSON imports (no node:fs) so this module is safe to import from
 * code paths consumed by client components via topicPositions.ts.
 */
import sandersStatements from './generated/profiles/S000033/statements.json';
import sandersPositions from './generated/profiles/S000033/positions.json';
import sandersSaidDid from './generated/profiles/S000033/saidDid.json';
import sandersOrgVoteLinks from './generated/profiles/S000033/orgVoteLinks.json';
import type { OrgVoteTopicLink } from './buildOrgVoteTopicLinks';
import type {
  PlatformPositionEntry,
  SaidDidLinkEntry,
  TopicPositionData,
  TopicStatementEntry,
} from './topicPositions';

/** Members migrated off the topicPositions mega-bundle. */
export const MIGRATED_PROFILE_BIOGUIDES = new Set(['S000033']);

export function usesMemberProfile(bioguideId: string): boolean {
  return MIGRATED_PROFILE_BIOGUIDES.has(bioguideId);
}

interface StatementsFile {
  byTopic: Record<string, { statements: TopicStatementEntry[] }>;
}

interface PositionsFile {
  byTopic: Record<string, { platformPositions: PlatformPositionEntry[] }>;
}

interface SaidDidFile {
  byTopic: Record<string, SaidDidLinkEntry[]>;
}

const PROFILE_DATA: Record<
  string,
  { statements: StatementsFile; positions: PositionsFile; saidDid: SaidDidFile }
> = {
  S000033: {
    statements: sandersStatements as StatementsFile,
    positions: sandersPositions as PositionsFile,
    saidDid: sandersSaidDid as SaidDidFile,
  },
};

/**
 * Reconstruct TopicPositionData map from per-category profile files.
 * Returns null when the member has not been migrated.
 */
export function getMemberProfileTopicPositions(
  bioguideId: string,
): Record<string, TopicPositionData> | null {
  const bundle = PROFILE_DATA[bioguideId];
  if (!bundle) return null;

  const topicIds = new Set<string>([
    ...Object.keys(bundle.statements.byTopic ?? {}),
    ...Object.keys(bundle.positions.byTopic ?? {}),
    ...Object.keys(bundle.saidDid.byTopic ?? {}),
  ]);

  const out: Record<string, TopicPositionData> = {};

  for (const topicId of topicIds) {
    const statements = bundle.statements.byTopic[topicId]?.statements ?? [];
    const platformPositions = bundle.positions.byTopic[topicId]?.platformPositions ?? [];
    const saidDidLinks = bundle.saidDid.byTopic[topicId] ?? [];

    if (
      statements.length === 0 &&
      platformPositions.length === 0 &&
      saidDidLinks.length === 0
    ) {
      continue;
    }

    out[topicId] = {
      statements,
      saidDidLinks,
      ...(platformPositions.length > 0 ? { platformPositions } : {}),
    };
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function getMemberProfileOrgVoteLinks(bioguideId: string): OrgVoteTopicLink[] | null {
  if (bioguideId === 'S000033') {
    return (sandersOrgVoteLinks as { links: OrgVoteTopicLink[] }).links;
  }
  return null;
}
