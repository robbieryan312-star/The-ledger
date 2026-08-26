/**
 * Pure member name variants for profile news matching.
 *
 * Matching rule (binding): never match on surname alone. Require full name
 * OR honorific + last name (Sen./Rep./Senator/Representative + last name).
 */
import { tokensFromMemberNames } from './newsCorroboration';

export interface LegislatorNewsRow {
  bioguideId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  chamber: string;
}

export type NewsDisplayMap = Map<
  string,
  { name: string; firstName: string; lastName: string }
>;

function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1]?.replace(/[^A-Za-z'-]/g, '') ?? '';
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Public + legal FULL name strings to match in article text (deduped). Never surname-only. */
export function memberNewsMatchNames(
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
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
  displayByBio: NewsDisplayMap,
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
  displayByBio: NewsDisplayMap,
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
