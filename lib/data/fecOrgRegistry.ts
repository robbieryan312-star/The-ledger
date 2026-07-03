/**
 * FEC Schedule A org registry — maps donor entity names to topic buckets for Phase 17 joins.
 * Registry entries are curated; ONLY non-individual contributors whose name matches a
 * curated org/PAC entry qualify for org→topic→vote joins.
 */
import { RECORD_TOPIC_BUCKETS } from './profileRecordByTopic';
import type { FecScheduleAContributor } from './fecClient';

export interface FecOrgRegistryEntry {
  /** Display name or normalized match key (uppercase). */
  name: string;
  topicIds: string[];
  sector?: string;
}

/** Curated PAC/committee/employer → topic mappings (official FEC entity names). */
export const FEC_ORG_REGISTRY: FecOrgRegistryEntry[] = [
  { name: 'NEA', topicIds: ['education'], sector: 'Education unions' },
  { name: 'NATIONAL EDUCATION ASSOCIATION', topicIds: ['education'], sector: 'Education unions' },
  { name: 'AFT', topicIds: ['education'], sector: 'Education unions' },
  { name: 'AMERICAN FEDERATION OF TEACHERS', topicIds: ['education'], sector: 'Education unions' },
  { name: 'SEIU', topicIds: ['healthcare', 'economy-taxes'], sector: 'Labor union' },
  { name: 'SERVICE EMPLOYEES INTERNATIONAL UNION', topicIds: ['healthcare', 'economy-taxes'], sector: 'Labor union' },
  { name: 'EMILY', topicIds: ['abortion'], sector: 'Reproductive rights PAC' },
  { name: 'PLANNED PARENTHOOD', topicIds: ['abortion', 'healthcare'], sector: 'Healthcare' },
  { name: 'NARAL', topicIds: ['abortion'], sector: 'Reproductive rights' },
  { name: 'NRDC', topicIds: ['climate'], sector: 'Environment' },
  { name: 'LEAGUE OF CONSERVATION VOTERS', topicIds: ['climate'], sector: 'Environment' },
  { name: 'SIERRA CLUB', topicIds: ['climate'], sector: 'Environment' },
  { name: 'NEXTGEN', topicIds: ['climate'], sector: 'Climate PAC' },
  { name: 'AFL-CIO', topicIds: ['economy-taxes'], sector: 'Labor federation' },
  { name: 'IBEW', topicIds: ['economy-taxes', 'climate'], sector: 'Trade union' },
  { name: 'UAW', topicIds: ['economy-taxes'], sector: 'Auto workers union' },
  { name: 'TEAMSTERS', topicIds: ['economy-taxes'], sector: 'Trade union' },
  { name: 'UNITE HERE', topicIds: ['economy-taxes'], sector: 'Hospitality union' },
  { name: 'CARPENTERS', topicIds: ['economy-taxes'], sector: 'Construction union' },
  { name: 'LIUNA', topicIds: ['economy-taxes'], sector: 'Laborers union' },
  { name: 'ACTBLUE', topicIds: ['economy-taxes'], sector: 'Conduit' },
  { name: 'ACTBLUE LLC', topicIds: ['economy-taxes'], sector: 'Conduit' },
  { name: 'GOOGLE', topicIds: ['technology'], sector: 'Technology' },
  { name: 'META', topicIds: ['technology'], sector: 'Technology' },
  { name: 'FACEBOOK', topicIds: ['technology'], sector: 'Technology' },
  { name: 'MICROSOFT', topicIds: ['technology'], sector: 'Technology' },
  { name: 'AMAZON', topicIds: ['technology', 'economy-taxes'], sector: 'Technology' },
  { name: 'APPLE', topicIds: ['technology'], sector: 'Technology' },
  { name: 'LOCKHEED', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'LOCKHEED MARTIN', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'BOEING', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'RAYTHEON', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'NORTHROP GRUMMAN', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'GENERAL DYNAMICS', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'VETERANS OF FOREIGN WARS', topicIds: ['defense-veterans'], sector: 'Veterans' },
  { name: 'AMVETS', topicIds: ['defense-veterans'], sector: 'Veterans' },
  { name: 'NAACP', topicIds: ['civil-liberties'], sector: 'Civil rights' },
  { name: 'ACLU', topicIds: ['civil-liberties'], sector: 'Civil liberties' },
  { name: 'HUMAN RIGHTS CAMPAIGN', topicIds: ['civil-liberties'], sector: 'LGBTQ rights' },
  { name: 'BRADY', topicIds: ['public-safety'], sector: 'Gun policy' },
  { name: 'GIFFORDS', topicIds: ['public-safety'], sector: 'Gun policy' },
  { name: 'EVERYTOWN', topicIds: ['public-safety'], sector: 'Gun policy' },
  { name: 'NRA', topicIds: ['public-safety'], sector: 'Gun rights' },
  { name: 'AIPAC', topicIds: ['defense-veterans'], sector: 'Foreign policy' },
  { name: 'J STREET', topicIds: ['defense-veterans'], sector: 'Foreign policy' },
];

/** FEC Schedule A personal-name pattern: "LAST, FIRST" (individual itemized contributor). */
const INDIVIDUAL_NAME_RE = /^[A-Z][A-Za-z\-']+,\s+[A-Z][A-Za-z\s.\-']+$/;

/** Org-name signals that override a LAST, FIRST-shaped committee/PAC label. */
const ORG_NAME_SIGNAL_RE =
  /\b(PAC|COMMITTEE|LLC|INC|CORP|UNION|ASSOCIATION|FEDERATION|PARTY|FUND|ACTION|COALITION|COUNCIL|LEAGUE|FOUNDATION)\b/i;

function normalizeOrgKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * True when a Schedule A row is an individual donor — never eligible for org→topic joins.
 * Uses FEC entity type when present, otherwise the "LAST, FIRST" personal-name pattern.
 */
export function isIndividualScheduleAContributor(
  contributor: Pick<FecScheduleAContributor, 'name'> & { entityType?: string | null },
): boolean {
  const entity = contributor.entityType?.trim().toUpperCase();
  if (entity === 'IND' || entity === 'INDIVIDUAL') return true;

  const name = contributor.name.trim();
  if (!INDIVIDUAL_NAME_RE.test(name)) return false;
  if (ORG_NAME_SIGNAL_RE.test(name)) return false;
  return true;
}

/** Match contributor org name against a curated registry entry (exact or org-name substring). */
function matchesCuratedRegistryEntry(orgName: string, entry: FecOrgRegistryEntry): boolean {
  const name = normalizeOrgKey(orgName);
  const key = normalizeOrgKey(entry.name);
  if (name === key) return true;
  // Require a minimum key length so short tokens cannot match inside personal surnames.
  if (key.length >= 5 && name.includes(key)) return true;
  return false;
}

/** Resolve topic ids for a curated org/PAC contributor name only. */
export function resolveCuratedOrgTopicIds(orgName: string): string[] {
  const topics = new Set<string>();
  for (const entry of FEC_ORG_REGISTRY) {
    if (matchesCuratedRegistryEntry(orgName, entry)) {
      for (const id of entry.topicIds) topics.add(id);
    }
  }
  return [...topics];
}

function registrySector(orgName: string): string | undefined {
  for (const entry of FEC_ORG_REGISTRY) {
    if (matchesCuratedRegistryEntry(orgName, entry)) return entry.sector;
  }
  return undefined;
}

/**
 * @deprecated Use resolveCuratedOrgTopicIds on non-individual org names only.
 * Kept for callers that pass explicit org entity names (not personal names).
 */
export function resolveOrgTopicIds(
  orgName: string,
  employer?: string | null,
  occupation?: string | null,
): string[] {
  void employer;
  void occupation;
  if (isIndividualScheduleAContributor({ name: orgName })) return [];
  return resolveCuratedOrgTopicIds(orgName);
}

export interface AggregatedOrgReceipt {
  orgName: string;
  totalAmount: number;
  receiptCount: number;
  topicIds: string[];
  employer?: string;
  occupation?: string;
  sector?: string;
}

/** Aggregate itemized Schedule A contributors by curated org name with registry topic tags. */
export function aggregateScheduleAOrgs(contributors: FecScheduleAContributor[]): AggregatedOrgReceipt[] {
  const byKey = new Map<string, AggregatedOrgReceipt>();

  for (const c of contributors) {
    if (isIndividualScheduleAContributor(c)) continue;

    const orgName = c.name.trim();
    if (!orgName) continue;

    const topicIds = resolveCuratedOrgTopicIds(orgName);
    if (topicIds.length === 0) continue;

    const key = normalizeOrgKey(orgName);
    const existing = byKey.get(key);
    if (existing) {
      existing.totalAmount += c.amount;
      existing.receiptCount += 1;
      for (const id of topicIds) {
        if (!existing.topicIds.includes(id)) existing.topicIds.push(id);
      }
    } else {
      byKey.set(key, {
        orgName,
        totalAmount: c.amount,
        receiptCount: 1,
        topicIds,
        employer: c.employer ?? undefined,
        occupation: c.occupation ?? undefined,
        sector: registrySector(orgName),
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}
