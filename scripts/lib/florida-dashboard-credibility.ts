/**
 * Validates Florida dashboard JSON: no official/nonpartisan numeric payload without fetchedLive:true.
 */
import { readFileSync } from 'node:fs';

type Tier = 'official' | 'nonpartisan' | string;

export type CredibilityViolation = {
  path: string;
  reason: string;
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
      if (k === 'meta' || k === 'source' || k === 'fetchedLive' || k === 'tier') return false;
      return hasNumericPayload(v);
    });
  }
  return false;
}

function sectionProvenance(
  json: Record<string, unknown>,
): Array<{ key: string; tier: Tier; fetchedLive: boolean; payload: unknown }> {
  const sections: Array<{ key: string; tier: Tier; fetchedLive: boolean; payload: unknown }> = [];
  const meta = json.meta as Record<string, unknown> | undefined;

  if (meta?.source && typeof meta.source === 'object') {
    const src = meta.source as { tier?: Tier };
    sections.push({
      key: 'meta',
      tier: src.tier ?? 'unknown',
      fetchedLive: meta.fetchedLive === true,
      payload: json.state ?? json.records ?? json.singleFiler ?? json,
    });
  }

  const provenance = meta?.provenance as Record<string, { tier?: Tier; fetchedLive?: boolean }> | undefined;
  if (provenance) {
    for (const [key, prov] of Object.entries(provenance)) {
      const payloadKey =
        key === 'federal' || key === 'floridaState'
          ? 'singleFiler'
          : key === 'comparison'
            ? 'stateComparison'
            : key === 'totalBurden'
              ? 'totalBurden'
              : key;
      sections.push({
        key,
        tier: prov.tier ?? 'unknown',
        fetchedLive: prov.fetchedLive === true,
        payload: json[payloadKey],
      });
    }
  }

  return sections;
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

  const sections = sectionProvenance(json);
  if (sections.length === 0) {
    return [{ path: relPath, reason: 'missing meta.source provenance' }];
  }

  for (const section of sections) {
    if (!isCredibilityTier(section.tier)) continue;
    if (section.fetchedLive) continue;
    if (!hasNumericPayload(section.payload)) continue;
    violations.push({
      path: relPath,
      reason: `${section.key}: ${section.tier} tier numeric data with fetchedLive:false`,
    });
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
