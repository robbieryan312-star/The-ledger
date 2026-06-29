/**
 * memberDeep.ts — deep per-member Congress.gov snapshots from ingest-member-deep.ts.
 */
import type { Source, SourceTier } from '../types';
import sandersDeep from './generated/members/S000033.json';

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

const MEMBER_DEEP_REGISTRY: Record<string, MemberDeepProfile> = {
  S000033: sandersDeep as MemberDeepProfile,
};

/** Returns null when no generated snapshot exists for this bioguideId. */
export function getMemberDeep(bioguideId: string): MemberDeepProfile | null {
  return MEMBER_DEEP_REGISTRY[bioguideId] ?? null;
}

export function getMemberDeepTopic(
  bioguideId: string,
  topicId: string,
): MemberDeepTopicBlock | null {
  const profile = getMemberDeep(bioguideId);
  if (!profile) return null;
  return profile.byTopic[topicId] ?? null;
}
