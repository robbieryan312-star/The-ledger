/**
 * Member name variants for RSS/GDELT news matching — roster display name vs legislators legal name.
 *
 * Matching rule (binding): NEVER match on surname alone. Require full name OR
 * honorific + last name (Sen./Rep./Senator/Representative + ln).
 */
import { loadProfileDisplayIdentityByBioguide } from './profileDisplayIdentity';

export interface LegislatorNewsRow {
  bioguideId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  chamber: string;
}

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1].replace(/[^A-Za-z'-]/g, '');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Public + legal FULL name strings to match in article text (deduped). Never surname-only. */
export function memberNewsMatchNames(
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): string[] {
  const names = new Set<string>();
  if (leg.name.trim()) names.add(leg.name.trim());
  const display = displayByBio.get(leg.bioguideId);
  if (display?.name.trim()) names.add(display.name.trim());
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  if (leg.firstName?.trim() && ln) names.add(`${leg.firstName.trim()} ${ln}`);
  if (display?.firstName?.trim() && display?.lastName?.trim()) {
    names.add(`${display.firstName.trim()} ${display.lastName.trim()}`);
  }
  return [...names].filter((n) => n.split(/\s+/).length >= 2);
}

/** Primary query name — prefer roster display name for GDELT/RSS. */
export function memberNewsPrimaryName(
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string }>,
): string {
  return displayByBio.get(leg.bioguideId)?.name?.trim() || leg.name.trim();
}

/**
 * True when text mentions the member by full name or honorific+lastname.
 * Bare last name alone NEVER matches.
 */
export function matchesMemberInText(
  text: string,
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): string | null {
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  if (!ln) return null;
  const honorific = leg.chamber === 'senate' ? `Sen. ${ln}` : `Rep. ${ln}`;

  for (const name of memberNewsMatchNames(leg, displayByBio)) {
    const escaped = escapeRe(name);
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
      return name;
    }
  }

  const honorificPatterns = [
    new RegExp(`\\bSen\\.\\s+${escapeRe(ln)}\\b`, 'i'),
    new RegExp(`\\bRep\\.\\s+${escapeRe(ln)}\\b`, 'i'),
    new RegExp(`\\bSenator\\s+${escapeRe(ln)}\\b`, 'i'),
    new RegExp(`\\bRepresentative\\s+${escapeRe(ln)}\\b`, 'i'),
  ];
  for (const re of honorificPatterns) {
    if (re.test(text)) return honorific;
  }
  return null;
}

export function loadMemberNewsDisplayMap(projectRoot: string) {
  return loadProfileDisplayIdentityByBioguide(projectRoot);
}
