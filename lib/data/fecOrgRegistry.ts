/**
 * FEC Schedule A org registry — maps donor entity names to topic buckets for Phase 17 joins.
 * Registry entries are curated; unknown orgs fall back to keyword classification on name/employer.
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
  { name: 'BERNIE', topicIds: ['economy-taxes'], sector: 'Campaign committee' },
  { name: 'SANDERS', topicIds: ['economy-taxes'], sector: 'Campaign committee' },
  { name: 'TEACHER', topicIds: ['education'], sector: 'Education' },
  { name: 'NONPROFIT', topicIds: ['civil-liberties', 'economy-taxes'], sector: 'Nonprofit' },
  { name: 'RETIRED', topicIds: ['healthcare'], sector: 'Individual donor' },
  { name: 'SELF-EMPLOYED', topicIds: ['economy-taxes'], sector: 'Individual donor' },
  { name: 'GOOGLE', topicIds: ['technology'], sector: 'Technology' },
  { name: 'META', topicIds: ['technology'], sector: 'Technology' },
  { name: 'FACEBOOK', topicIds: ['technology'], sector: 'Technology' },
  { name: 'MICROSOFT', topicIds: ['technology'], sector: 'Technology' },
  { name: 'AMAZON', topicIds: ['technology', 'economy-taxes'], sector: 'Technology' },
  { name: 'APPLE', topicIds: ['technology'], sector: 'Technology' },
  { name: 'LOCKHEED', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'BOEING', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'RAYTHEON', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'NORTHROP', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'GENERAL DYNAMICS', topicIds: ['defense-veterans'], sector: 'Defense contractor' },
  { name: 'VETERANS', topicIds: ['defense-veterans'], sector: 'Veterans' },
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

function normalizeOrgKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function classifyOrgText(text: string): string[] {
  const hay = text.toLowerCase();
  const matched = new Set<string>();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    if (
      bucket.keywords.some((k) => {
        const keyword = k.trim().toLowerCase();
        if (!keyword) return false;
        if (/\s/.test(keyword)) return hay.includes(keyword);
        return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hay);
      })
    ) {
      matched.add(bucket.id);
    }
  }
  return [...matched];
}

/** Resolve one or more topic ids for a Schedule A org row. */
export function resolveOrgTopicIds(
  orgName: string,
  employer?: string | null,
  occupation?: string | null,
): string[] {
  const context = normalizeOrgKey([orgName, employer, occupation].filter(Boolean).join(' '));
  const topics = new Set<string>();

  for (const entry of FEC_ORG_REGISTRY) {
    const key = normalizeOrgKey(entry.name);
    if (context.includes(key) || key.includes(context)) {
      for (const id of entry.topicIds) topics.add(id);
    }
  }

  if (topics.size === 0) {
    for (const id of classifyOrgText([orgName, employer, occupation].filter(Boolean).join(' '))) {
      topics.add(id);
    }
  }

  return [...topics];
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

function registrySector(orgName: string): string | undefined {
  const hay = normalizeOrgKey(orgName);
  for (const entry of FEC_ORG_REGISTRY) {
    const key = normalizeOrgKey(entry.name);
    if (hay.includes(key) || key.includes(hay)) return entry.sector;
  }
  return undefined;
}

/** Aggregate itemized Schedule A contributors by normalized org name with registry topic tags. */
export function aggregateScheduleAOrgs(contributors: FecScheduleAContributor[]): AggregatedOrgReceipt[] {
  const byKey = new Map<string, AggregatedOrgReceipt>();

  for (const c of contributors) {
    const orgName = c.name.trim();
    if (!orgName) continue;
    const key = normalizeOrgKey(orgName);
    const topicIds = resolveOrgTopicIds(orgName, c.employer, c.occupation);
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
