/**
 * memberDeep.ts — deep per-member Congress.gov snapshots from ingest-member-deep.ts.
 * Reads lib/data/generated/members/{bioguideId}.json at request/build time (server only).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Source, SourceTier } from '../types';
import { getMergedDeepTopicBlock } from './topicAliases';

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

const MEMBERS_DIR = path.join(process.cwd(), 'lib', 'data', 'generated', 'members');

/** Returns null when no generated snapshot exists for this bioguideId. */
export function getMemberDeep(bioguideId: string): MemberDeepProfile | null {
  const filePath = path.join(MEMBERS_DIR, `${bioguideId}.json`);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as MemberDeepProfile;
  } catch {
    return null;
  }
}

export function getMemberDeepTopic(
  bioguideId: string,
  topicId: string,
): MemberDeepTopicBlock | null {
  const profile = getMemberDeep(bioguideId);
  if (!profile) return null;
  return getMergedDeepTopicBlock(profile.byTopic, topicId);
}
