/**
 * Resolve display name + initials for profile manifest entries — join by bioguideId only.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface ProfileDisplayIdentity {
  name: string;
  initials: string;
  firstName: string;
  lastName: string;
}

interface RosterFile {
  entries: Array<{
    bioguideId: string;
    name: string;
    firstName?: string;
    lastName?: string;
  }>;
}

interface LegislatorsFile {
  legislators: Array<{
    bioguideId: string;
    name: string;
    firstName?: string;
    lastName?: string;
  }>;
}

export function formatDisplayInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()[0]?.toUpperCase() ?? '';
  const l = lastName.trim()[0]?.toUpperCase() ?? '';
  if (!f || !l) return '';
  return `${f}.${l}.`;
}

function splitNameParts(
  fullName: string,
  firstName?: string,
  lastName?: string,
): { firstName: string; lastName: string } {
  const fn = firstName?.trim() ?? '';
  const ln = lastName?.trim() ?? '';
  if (fn && ln) return { firstName: fn, lastName: ln };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

export function loadProfileDisplayIdentityByBioguide(
  projectRoot: string,
): Map<string, ProfileDisplayIdentity> {
  const rosterPath = path.join(projectRoot, 'lib/data/generated/roster.json');
  const legislatorsPath = path.join(projectRoot, 'lib/data/generated/currentLegislators.json');

  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as RosterFile;
  const legislators = JSON.parse(readFileSync(legislatorsPath, 'utf8')) as LegislatorsFile;

  const out = new Map<string, ProfileDisplayIdentity>();

  for (const leg of legislators.legislators) {
    if (!leg.bioguideId || !leg.name?.trim()) continue;
    const { firstName, lastName } = splitNameParts(leg.name, leg.firstName, leg.lastName);
    out.set(leg.bioguideId, {
      name: leg.name.trim(),
      firstName,
      lastName,
      initials: formatDisplayInitials(firstName, lastName),
    });
  }

  // roster.json wins for featured / migrated profiles (brief: join roster by bioguideId)
  for (const entry of roster.entries) {
    if (!entry.bioguideId || !entry.name?.trim()) continue;
    const { firstName, lastName } = splitNameParts(entry.name, entry.firstName, entry.lastName);
    out.set(entry.bioguideId, {
      name: entry.name.trim(),
      firstName,
      lastName,
      initials: formatDisplayInitials(firstName, lastName),
    });
  }

  return out;
}

export function resolveProfileDisplayIdentity(
  bioguideId: string,
  projectRoot: string,
): ProfileDisplayIdentity | null {
  const map = loadProfileDisplayIdentityByBioguide(projectRoot);
  return map.get(bioguideId) ?? null;
}
