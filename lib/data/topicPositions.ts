/**
 * topicPositions.ts — platform positions, VoteSmart NPAT stated positions, and
 * Said→Did vote links keyed by bioguideId. Produced by sync-topic-positions.ts.
 */
import type { SourceTier, VoteChoice } from '../types';
import snapshot from './generated/topicPositions.json';
import { getMemberProfileTopicPositions } from './memberProfile';
import { clean } from './displaySummary';
import { decodeHtmlEntities } from './htmlEntities';
import { isDisqualifiedPlatformPosition } from './sourceIntegrity';

export interface PlatformPositionEntry {
  text: string;
  source: string;
  url: string;
  tier: SourceTier;
  asOf: string;
}

export interface TopicStatementCorroboratingSource {
  url: string;
  outlet?: string;
  date?: string;
  tier?: SourceTier;
}

export interface TopicStatementEntry {
  title: string;
  date: string;
  url: string;
  tier: SourceTier;
  topicId: string;
  /** UI display excerpt — CREC opener stripped; raw title kept for verbatim integrity. */
  displayText?: string;
  /** Required true for tier 'media' or 'alleged' (build-gated). Official CREC floor remarks: true. */
  verbatim?: boolean;
  outlet?: string;
  corroboratingSources?: TopicStatementCorroboratingSource[];
}

export interface StatedPositionSourceEntry {
  tier: SourceTier;
  source: string;
  url: string;
}

export interface SaidDidLinkEntry {
  topicId?: string;
  statedPositionDate: string | null;
  /** Verbatim CREC / sourced Said quote (required for official CREC pairs). */
  saidQuote?: string;
  /** GovInfo/CREC (or sourced) URL for the Said side. */
  saidUrl?: string;
  saidOutlet?: string;
  voteDate: string;
  billTitle: string;
  billNumber: string;
  congressGovUrl: string;
  voteChoice: VoteChoice;
  tier: 'official';
}

export interface TopicPositionData {
  platformPositions?: PlatformPositionEntry[];
  statedPosition?: string;
  statedPositionSource?: StatedPositionSourceEntry;
  statements: TopicStatementEntry[];
  saidDidLinks: SaidDidLinkEntry[];
}

export interface TopicPositionsSnapshotMeta {
  asOf: string;
  source: string;
  totalMembers: number;
  membersWithData: number;
  membersWithPlatformPositions: number;
  membersWithStatedPosition: number;
  membersWithSaidDidLinks: number;
  perTopicCoverage: Record<string, number>;
  votesmartConfigured: boolean;
  note?: string;
}

export interface TopicPositionsSnapshot {
  meta: TopicPositionsSnapshotMeta;
  byBioguideId: Record<string, Record<string, TopicPositionData>>;
}

const data = snapshot as TopicPositionsSnapshot;

function sanitizePlatformPosition(p: PlatformPositionEntry): PlatformPositionEntry | null {
  const text = decodeHtmlEntities(p.text);
  if (isDisqualifiedPlatformPosition(text)) return null;
  return { ...p, text };
}

function sanitizeTopicData(topic: TopicPositionData): TopicPositionData | null {
  const platformPositions = (topic.platformPositions ?? [])
    .map(sanitizePlatformPosition)
    .filter((p): p is PlatformPositionEntry => p !== null);

  const statedRaw = topic.statedPosition ? decodeHtmlEntities(topic.statedPosition) : undefined;
  const statedPosition =
    statedRaw && !isDisqualifiedPlatformPosition(statedRaw) ? statedRaw : undefined;

  const statements = (topic.statements ?? []).map((s) => {
    const title = decodeHtmlEntities(s.title);
    return {
      ...s,
      title,
      displayText: s.displayText !== undefined ? clean(title) : s.displayText,
    };
  }).filter((s) => !isDisqualifiedPlatformPosition(s.title));

  const saidDidLinks = topic.saidDidLinks ?? [];

  if (
    platformPositions.length === 0 &&
    statements.length === 0 &&
    !statedPosition &&
    saidDidLinks.length === 0
  ) {
    return null;
  }

  return {
    ...topic,
    platformPositions: platformPositions.length > 0 ? platformPositions : undefined,
    statedPosition,
    statements,
    saidDidLinks,
  };
}

function sanitizeMemberTopics(
  member: Record<string, TopicPositionData>,
): Record<string, TopicPositionData> {
  const out: Record<string, TopicPositionData> = {};
  for (const [topicId, topic] of Object.entries(member)) {
    const sanitized = sanitizeTopicData(topic);
    if (sanitized) out[topicId] = sanitized;
  }
  return out;
}

export function getTopicPositions(
  bioguideId: string,
  topicId: string,
): TopicPositionData | null {
  const member = getMemberTopicPositions(bioguideId);
  if (!member) return null;
  return member[topicId] ?? null;
}

export function getMemberTopicPositions(bioguideId: string): Record<string, TopicPositionData> | null {
  const profile = getMemberProfileTopicPositions(bioguideId);
  const raw = profile ?? data.byBioguideId[bioguideId] ?? null;
  if (!raw) return null;
  const sanitized = sanitizeMemberTopics(raw);
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export function countMembersWithTopicPositions(): number {
  return data.meta.membersWithData;
}

export function getTopicPositionsMeta(): TopicPositionsSnapshotMeta {
  return data.meta;
}
