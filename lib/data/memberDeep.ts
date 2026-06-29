/**
 * memberDeep.ts — deep per-member Congress.gov snapshots from ingest-member-deep.ts.
 */
import type { Source, SourceTier } from '../types';

export interface MemberDeepBill {
  topicId: string;
  title: string;
  billNumber: string;
  type?: string;
  congress?: number;
  introducedDate: string;
  latestAction: string | null;
  url: string;
  policyArea: string | null;
  tier: SourceTier;
  role?: 'cosponsor';
}

export interface MemberDeepProfileBlock {
  bioguideId: string;
  officialPhotoUrl: string | null;
  officialWebsite: string | null;
  officeAddress: string | null;
  phone: string | null;
  currentMember: boolean;
  source: Source;
}

export interface MemberDeepTopicBlock {
  sponsored: MemberDeepBill[];
  cosponsored: MemberDeepBill[];
}

export interface MemberDeepProfile {
  meta: {
    bioguideId: string;
    asOf: string;
    source: string;
    totalSponsored: number;
    totalCosponsored: number;
    topicCoverage: Record<string, number>;
  };
  profile: MemberDeepProfileBlock;
  byTopic: Record<string, MemberDeepTopicBlock>;
}

const cache = new Map<string, MemberDeepProfile | null>();

/** Returns null when no generated snapshot exists for this bioguideId. */
export function getMemberDeep(bioguideId: string): MemberDeepProfile | null {
  if (cache.has(bioguideId)) {
    return cache.get(bioguideId) ?? null;
  }

  try {
    // Dynamic require keeps the registry open as new member JSON files are added.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(`./generated/members/${bioguideId}.json`) as MemberDeepProfile;
    cache.set(bioguideId, data);
    return data;
  } catch {
    cache.set(bioguideId, null);
    return null;
  }
}

export function getMemberDeepTopic(
  bioguideId: string,
  topicId: string,
): MemberDeepTopicBlock | null {
  const profile = getMemberDeep(bioguideId);
  if (!profile) return null;
  return profile.byTopic[topicId] ?? null;
}
