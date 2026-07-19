/**
 * Member name variants for RSS/GDELT news matching — roster display name vs legislators legal name.
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

/** Public + legal name strings to match in article text (deduped). */
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
  return [...names];
}

/** Primary query name — prefer roster display name for GDELT/RSS. */
export function memberNewsPrimaryName(
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string }>,
): string {
  return displayByBio.get(leg.bioguideId)?.name?.trim() || leg.name.trim();
}

export function matchesMemberInText(
  text: string,
  leg: LegislatorNewsRow,
  displayByBio: Map<string, { name: string; firstName: string; lastName: string }>,
): string | null {
  const ln = leg.lastName?.trim() || lastNameOf(leg.name);
  if (!ln) return null;
  const honorific = leg.chamber === 'senate' ? `Sen. ${ln}` : `Rep. ${ln}`;

  for (const name of memberNewsMatchNames(leg, displayByBio)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
      if (name.includes('Sen.') || /Sen\./i.test(text)) return honorific;
      return name;
    }
  }

  const patterns = [
    new RegExp(`\\bSen\\.\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bRep\\.\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bSenator\\s+${ln}\\b`, 'i'),
    new RegExp(`\\bRepresentative\\s+${ln}\\b`, 'i'),
    new RegExp(`\\b${ln}\\b`, 'i'),
  ];
  for (const re of patterns) {
    if (re.test(text)) {
      if (re.source.includes('Sen\\.')) return honorific;
      if (re.source.includes('Rep\\.')) return honorific;
      return ln;
    }
  }
  return null;
}

export function loadMemberNewsDisplayMap(projectRoot: string) {
  return loadProfileDisplayIdentityByBioguide(projectRoot);
}
