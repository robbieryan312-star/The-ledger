/**
 * Member name variants for RSS/GDELT news matching — roster display name vs legislators legal name.
 *
 * Matching rule (binding): NEVER match on surname alone. Require full name OR
 * honorific + last name (Sen./Rep./Senator/Representative + ln).
 */
import { tokensFromMemberNames } from '../../lib/data/newsCorroboration';
import { loadProfileDisplayIdentityByBioguide } from './profileDisplayIdentity';

export interface LegislatorNewsRow {
  bioguideId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  chamber: string;
}

export interface MemberNewsMatchOptions {
  sameChamberLastNameCounts?: Map<string, number>;
}

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1].replace(/[^A-Za-z'-]/g, '');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizedLastName(leg: LegislatorNewsRow): string {
  return (leg.lastName?.trim() || lastNameOf(leg.name)).toLowerCase();
}

function normalizedChamber(leg: LegislatorNewsRow): string {
  return leg.chamber.trim().toLowerCase();
}

export function sameChamberLastNameKey(leg: LegislatorNewsRow): string {
  return `${normalizedChamber(leg)}|${normalizedLastName(leg)}`;
}

export function buildSameChamberLastNameCounts(legs: LegislatorNewsRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const leg of legs) {
    const key = sameChamberLastNameKey(leg);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function canUseHonorificLastName(
  leg: LegislatorNewsRow,
  opts?: MemberNewsMatchOptions,
): boolean {
  const counts = opts?.sameChamberLastNameCounts;
  if (!counts) return true;
  return (counts.get(sameChamberLastNameKey(leg)) ?? 1) <= 1;
}

export function memberNewsHonorificLabel(leg: LegislatorNewsRow): string | null {
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  if (!ln) return null;
  return normalizedChamber(leg) === 'senate' ? `Sen. ${ln}` : `Rep. ${ln}`;
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

/**
 * Significant name tokens to EXCLUDE from news corroboration overlap
 * (first/last/legal/display parts from memberNewsMatchNames + bare first/last).
 */
export function memberNewsNameTokens(
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): Set<string> {
  const parts: string[] = [...memberNewsMatchNames(leg, displayByBio)];
  const display = displayByBio.get(leg.bioguideId);
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  const fn = leg.firstName?.trim() || '';
  if (fn) parts.push(fn);
  if (ln) parts.push(ln);
  if (display?.firstName?.trim()) parts.push(display.firstName.trim());
  if (display?.lastName?.trim()) parts.push(display.lastName.trim());
  return tokensFromMemberNames(parts);
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
  opts?: MemberNewsMatchOptions,
): string | null {
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  if (!ln) return null;
  const honorific = memberNewsHonorificLabel(leg);

  for (const name of memberNewsMatchNames(leg, displayByBio)) {
    const escaped = escapeRe(name);
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
      return name;
    }
  }

  if (!honorific || !canUseHonorificLastName(leg, opts)) return null;

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
