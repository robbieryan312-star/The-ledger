/**
 * Validates Florida dashboard JSON: official/nonpartisan numeric payloads must carry
 * provenance 'fetched-live' or 'computed-from-published-tables' (with citation + computedAt).
 * 'honest-gap' requires null/empty payload. Counties: audit stateSummary ∪ records;
 * accept split censusFetchedLive / blsFetchedLive / attainmentFetchedLive flags.
 */
import { readFileSync } from 'node:fs';
import { isDataProvenance, type DataProvenance } from '../../lib/data/provenance';

type Tier = 'official' | 'nonpartisan' | string;

export type CredibilityViolation = {
  path: string;
  reason: string;
};

type SectionAudit = {
  key: string;
  tier: Tier;
  provenance: DataProvenance | undefined;
  citation?: string;
  computedAt?: string;
  payload: unknown;
  /** Counties split live flags (optional). */
  splitLive?: {
    censusFetchedLive?: boolean;
    blsFetchedLive?: boolean;
    attainmentFetchedLive?: boolean;
  };
};

function isCredibilityTier(tier: unknown): tier is 'official' | 'nonpartisan' {
  return tier === 'official' || tier === 'nonpartisan';
}

function hasNumericPayload(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  if (Array.isArray(value)) return value.some(hasNumericPayload);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([k, v]) => {
      if (
        k === 'meta' ||
        k === 'source' ||
        k === 'fetchedLive' ||
        k === 'tier' ||
        k === 'provenance' ||
        k === 'citation' ||
        k === 'computedAt' ||
        k === 'name' ||
        k === 'url' ||
        k === 'description' ||
        k === 'note' ||
        k === 'asOf' ||
        k === 'fetchedAt' ||
        k === 'datasetUrl' ||
        k === 'attainmentUrl' ||
        k === 'blsSource' ||
        k === 'censusFetchedLive' ||
        k === 'blsFetchedLive' ||
        k === 'attainmentFetchedLive'
      ) {
        return false;
      }
      return hasNumericPayload(v);
    });
  }
  return false;
}

/** All-zero attainment is a false empty — never valid under fetched-live. */
function isAllZeroAttainment(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  const keys = ['hsPlusPct', 'someCollegePct', 'bachelorsPct', 'graduatePct', 'bachelorsPlusPct'];
  if (!keys.every((k) => typeof a[k] === 'number')) return false;
  return keys.every((k) => a[k] === 0);
}

function countiesUnionPayload(json: Record<string, unknown>): unknown {
  const hasRecords = Array.isArray(json.records);
  const hasStateSummary = json.stateSummary != null && typeof json.stateSummary === 'object';
  if (hasRecords || hasStateSummary) {
    return {
      ...(hasRecords ? { records: json.records } : {}),
      ...(hasStateSummary ? { stateSummary: json.stateSummary } : {}),
    };
  }
  return undefined;
}

function sectionProvenance(json: Record<string, unknown>): SectionAudit[] {
  const sections: SectionAudit[] = [];
  const meta = json.meta as Record<string, unknown> | undefined;
  if (!meta) return sections;

  const nestedProv = meta.provenance;
  const metaProvenanceString =
    typeof nestedProv === 'string' && isDataProvenance(nestedProv) ? nestedProv : undefined;

  // Tax-style: meta.provenance is a map of section → { provenance, tier, citation, computedAt }
  if (nestedProv && typeof nestedProv === 'object' && !Array.isArray(nestedProv)) {
    for (const [key, prov] of Object.entries(nestedProv as Record<string, Record<string, unknown>>)) {
      if (!prov || typeof prov !== 'object') continue;
      const payloadKey =
        key === 'federal' || key === 'floridaState'
          ? 'singleFiler'
          : key === 'comparison'
            ? 'stateComparison'
            : key === 'totalBurden'
              ? 'totalBurden'
              : key;
      const provEnum =
        typeof prov.provenance === 'string' && isDataProvenance(prov.provenance)
          ? prov.provenance
          : undefined;
      sections.push({
        key,
        tier: (prov.tier as Tier) ?? 'unknown',
        provenance: provEnum,
        citation: typeof prov.citation === 'string' ? prov.citation : undefined,
        computedAt: typeof prov.computedAt === 'string' ? prov.computedAt : undefined,
        payload: json[payloadKey],
      });
    }
  }

  if (meta.source && typeof meta.source === 'object') {
    const src = meta.source as { tier?: Tier };
    const union = countiesUnionPayload(json);
    const payload =
      union ??
      json.state ??
      json.singleFiler ??
      (sections.length === 0 ? json : undefined);

    // Explicit provenance enum only — do not derive from fetchedLive (that boolean lied for tax).
    const provenance = metaProvenanceString;

    if (payload !== undefined) {
      sections.push({
        key: 'meta',
        tier: src.tier ?? 'unknown',
        provenance,
        payload,
        splitLive: {
          censusFetchedLive: meta.censusFetchedLive === true,
          blsFetchedLive: meta.blsFetchedLive === true,
          attainmentFetchedLive: meta.attainmentFetchedLive === true,
        },
      });
    }
  }

  return sections;
}

function sectionHasValidProvenance(section: SectionAudit): boolean {
  const { provenance, citation, computedAt, payload, splitLive } = section;

  if (provenance === 'honest-gap') {
    return !hasNumericPayload(payload);
  }

  if (provenance === 'computed-from-published-tables') {
    return Boolean(citation?.trim() && computedAt?.trim()) && hasNumericPayload(payload);
  }

  if (provenance === 'fetched-live') {
    return hasNumericPayload(payload) || Boolean(splitLive);
  }

  // Counties split flags: any true live flag counts as fetched-live for union payload
  if (
    splitLive &&
    (splitLive.censusFetchedLive || splitLive.blsFetchedLive || splitLive.attainmentFetchedLive)
  ) {
    return hasNumericPayload(payload);
  }

  return false;
}

function auditZeroAttainment(
  relPath: string,
  json: Record<string, unknown>,
): CredibilityViolation | null {
  const meta = json.meta as Record<string, unknown> | undefined;
  const stateSummary = json.stateSummary as Record<string, unknown> | undefined;
  if (!meta || !stateSummary) return null;

  const attainment = stateSummary.attainment;
  if (!isAllZeroAttainment(attainment)) return null;

  const claimsLive =
    meta.attainmentFetchedLive === true ||
    meta.fetchedLive === true ||
    meta.provenance === 'fetched-live';

  if (claimsLive) {
    return {
      path: relPath,
      reason:
        'stateSummary.attainment: all-zero percentages with fetched-live / attainmentFetchedLive (false empty)',
    };
  }
  return null;
}

export function auditFloridaDashboardJson(
  relPath: string,
  raw: string,
): CredibilityViolation[] {
  const violations: CredibilityViolation[] = [];
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [{ path: relPath, reason: 'invalid JSON' }];
  }

  const zeroAtt = auditZeroAttainment(relPath, json);
  if (zeroAtt) violations.push(zeroAtt);

  const sections = sectionProvenance(json);
  if (sections.length === 0) {
    return [{ path: relPath, reason: 'missing meta.source provenance' }, ...violations];
  }

  for (const section of sections) {
    if (!isCredibilityTier(section.tier)) continue;

    const numeric = hasNumericPayload(section.payload);

    if (!section.provenance && !section.splitLive?.censusFetchedLive && !section.splitLive?.blsFetchedLive && !section.splitLive?.attainmentFetchedLive) {
      if (numeric) {
        violations.push({
          path: relPath,
          reason: `${section.key}: ${section.tier} tier numeric data missing provenance`,
        });
      }
      continue;
    }

    if (section.provenance === 'honest-gap') {
      if (numeric) {
        violations.push({
          path: relPath,
          reason: `${section.key}: honest-gap provenance with numeric payload`,
        });
      }
      continue;
    }

    if (section.provenance === 'computed-from-published-tables') {
      if (!section.citation?.trim() || !section.computedAt?.trim()) {
        violations.push({
          path: relPath,
          reason: `${section.key}: computed-from-published-tables requires citation + computedAt`,
        });
      }
      continue;
    }

    if (numeric && !sectionHasValidProvenance(section)) {
      violations.push({
        path: relPath,
        reason: `${section.key}: ${section.tier} tier numeric data without fetched-live or computed-from-published-tables provenance`,
      });
    }
  }

  return violations;
}

export function auditFloridaDashboardFile(absPath: string, relPath: string): CredibilityViolation[] {
  const raw = readFileSync(absPath, 'utf8');
  return auditFloridaDashboardJson(relPath, raw);
}

export function assertFloridaDashboardCredibility(absPath: string, relPath: string): void {
  const violations = auditFloridaDashboardFile(absPath, relPath);
  if (violations.length > 0) {
    const msg = violations.map((v) => `${v.path}: ${v.reason}`).join('; ');
    throw new Error(`unverified official data: ${msg}`);
  }
}
