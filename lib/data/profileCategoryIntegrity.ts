/**
 * Profile category empty/content checks and manifest status resolution.
 * Shared by manifest sync, credibility audit, and build guards.
 */

export const VALID_PROFILE_CATEGORY_STATUSES = [
  'filled',
  'honest-gap',
  'none-in-range',
  'fetch-failed',
  'fetch-blocked',
] as const;

export type ProfileCategoryStatus = (typeof VALID_PROFILE_CATEGORY_STATUSES)[number];

export const CATEGORY_FILES_WITH_REQUIRED_STATUS = [
  'controversies',
  'endorsements',
  'orgVoteLinks',
] as const;

export type CategoryFileWithRequiredStatus = (typeof CATEGORY_FILES_WITH_REQUIRED_STATUS)[number];

export const MIGRATED_PROFILE_IDS = [
  'S000033',
  'O000172',
  'M000355',
  'M001184',
  'W000817',
  'C001098',
  'P000197',
] as const;

export function isValidProfileCategoryStatus(value: unknown): value is ProfileCategoryStatus {
  return (
    typeof value === 'string' &&
    (VALID_PROFILE_CATEGORY_STATUSES as readonly string[]).includes(value)
  );
}

export function categoryIsEmpty(fileBase: string, data: unknown): boolean {
  if (!data || typeof data !== 'object') return true;
  const rec = data as Record<string, unknown>;
  switch (fileBase) {
    case 'statements':
    case 'positions': {
      const byTopic = rec.byTopic as Record<string, unknown> | undefined;
      if (!byTopic || Object.keys(byTopic).length === 0) return true;
      return Object.values(byTopic).every((bucket) => {
        if (!bucket || typeof bucket !== 'object') return true;
        const b = bucket as Record<string, unknown>;
        if (fileBase === 'statements') return ((b.statements as unknown[]) ?? []).length === 0;
        return ((b.platformPositions as unknown[]) ?? []).length === 0;
      });
    }
    case 'saidDid': {
      const byTopic = rec.byTopic as Record<string, unknown> | undefined;
      if (!byTopic || Object.keys(byTopic).length === 0) return true;
      return Object.values(byTopic).every((val) => {
        if (Array.isArray(val)) return val.length === 0;
        return true;
      });
    }
    case 'news':
      return ((rec.items as unknown[]) ?? []).length === 0;
    case 'votes':
      return ((rec.votes as unknown[]) ?? []).length === 0;
    case 'finance':
      return rec.entry == null;
    case 'controversies':
      return ((rec.items as unknown[]) ?? []).length === 0;
    case 'endorsements': {
      const endorses = (rec.endorses as unknown[]) ?? [];
      const endorsedBy = (rec.endorsedBy as unknown[]) ?? [];
      return endorses.length === 0 && endorsedBy.length === 0;
    }
    case 'orgVoteLinks':
      return ((rec.links as unknown[]) ?? []).length === 0;
    default:
      return false;
  }
}

export function hasSanitizedEndorsementContent(data: {
  endorses?: unknown[];
  endorsedBy?: unknown[];
}): boolean {
  return (data.endorses?.length ?? 0) > 0 || (data.endorsedBy?.length ?? 0) > 0;
}

/** Resolve manifest category status from on-disk category JSON. */
export function resolveManifestCategoryStatus(
  fileBase: string,
  data: Record<string, unknown>,
): ProfileCategoryStatus {
  const empty = categoryIsEmpty(fileBase, data);
  if (!empty) return 'filled';

  const fileStatus = data.status;
  if (isValidProfileCategoryStatus(fileStatus) && fileStatus !== 'filled') {
    return fileStatus;
  }

  if (fileBase === 'votes' && data.status === 'unavailable') {
    return 'honest-gap';
  }

  return 'honest-gap';
}

export function resolveCategoryFileStatus(
  fileBase: CategoryFileWithRequiredStatus,
  data: Record<string, unknown>,
): ProfileCategoryStatus {
  return resolveManifestCategoryStatus(fileBase, data);
}

export interface ManifestMismatchViolation {
  bioguideId: string;
  category: string;
  manifestStatus: string;
  expectedStatus: ProfileCategoryStatus;
  path: string;
}

export interface MissingFileStatusViolation {
  bioguideId: string;
  category: CategoryFileWithRequiredStatus;
  path: string;
}

export function validateManifestMatchesCategoryFiles(
  bioguideId: string,
  manifestCategories: Record<string, string>,
  categoryData: Record<string, Record<string, unknown>>,
): ManifestMismatchViolation[] {
  const violations: ManifestMismatchViolation[] = [];
  const keys = [
    'statements',
    'positions',
    'saidDid',
    'news',
    'votes',
    'finance',
    'controversies',
    'endorsements',
    'orgVoteLinks',
  ] as const;

  for (const fileBase of keys) {
    const data = categoryData[fileBase] ?? {};
    const expected = resolveManifestCategoryStatus(fileBase, data);
    const actual = manifestCategories[fileBase];
    if (!actual) {
      violations.push({
        bioguideId,
        category: fileBase,
        manifestStatus: '(missing)',
        expectedStatus: expected,
        path: `profiles/${bioguideId}/manifest.json`,
      });
      continue;
    }
    if (actual !== expected) {
      violations.push({
        bioguideId,
        category: fileBase,
        manifestStatus: actual,
        expectedStatus: expected,
        path: `profiles/${bioguideId}/manifest.json`,
      });
    }
  }

  return violations;
}

export function validateRequiredCategoryFileStatuses(
  bioguideId: string,
  categoryData: Record<CategoryFileWithRequiredStatus, Record<string, unknown>>,
): MissingFileStatusViolation[] {
  const violations: MissingFileStatusViolation[] = [];
  for (const fileBase of CATEGORY_FILES_WITH_REQUIRED_STATUS) {
    const data = categoryData[fileBase] ?? {};
    if (!isValidProfileCategoryStatus(data.status)) {
      violations.push({
        bioguideId,
        category: fileBase,
        path: `profiles/${bioguideId}/${fileBase}.json`,
      });
    }
  }
  return violations;
}
