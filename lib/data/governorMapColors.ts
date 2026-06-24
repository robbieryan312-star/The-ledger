/**
 * National map fill colors by current governor party (Tier 2 · NGA roster).
 * Factual party affiliation only — not editorial framing.
 */
import { Party } from '../types';
import { findCurrentGovernor } from './governors';

export type GovernorPartyKey = 'democrat' | 'republican' | 'independent' | 'unknown';

/** Subtle dark-theme tints that stay readable with gold accents. */
export const GOVERNOR_MAP_FILLS: Record<
  GovernorPartyKey,
  { base: string; hover: string; stroke: string; strokeHover: string }
> = {
  democrat: {
    base: '#1a3555',
    hover: '#254a75',
    stroke: '#3d6a9e',
    strokeHover: '#c8a951',
  },
  republican: {
    base: '#3a2228',
    hover: '#4d2d36',
    stroke: '#8a5060',
    strokeHover: '#c8a951',
  },
  independent: {
    base: '#2a3040',
    hover: '#3a4255',
    stroke: '#6a7090',
    strokeHover: '#c8a951',
  },
  unknown: {
    base: '#1a2a38',
    hover: '#2a3a4a',
    stroke: '#4a6078',
    strokeHover: '#c8a951',
  },
};

function partyToKey(party: Party): GovernorPartyKey {
  if (party === 'Democrat') return 'democrat';
  if (party === 'Republican') return 'republican';
  if (party === 'Independent') return 'independent';
  return 'unknown';
}

/** Current governor party for a state; DC and territories return unknown. */
export function getGovernorPartyKey(stateCode: string): GovernorPartyKey {
  if (!stateCode || stateCode === 'DC') return 'unknown';
  const gov = findCurrentGovernor(stateCode);
  return gov ? partyToKey(gov.party) : 'unknown';
}

/** Precomputed lookup for all 50 states (O(1) at render time). */
export const governorPartyByState: Record<string, GovernorPartyKey> = (() => {
  const codes =
    'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(
      ' ',
    );
  return Object.fromEntries(codes.map((code) => [code, getGovernorPartyKey(code)]));
})();
