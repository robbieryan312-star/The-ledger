/**
 * photos.ts — official, key-free portrait URLs.
 *
 * Congressional portraits use the official Bioguide image endpoint keyed by
 * `bioguideId`. The underlying photos are public-domain member portraits from
 * Congress.
 *
 * Governors, demo entries, and anyone without a resolvable portrait fall back
 * to an initials avatar in the UI (see components/ui/PoliticianAvatar.tsx).
 */
import currentLegislators from './generated/currentLegislators.json';

export type CongressPhotoSize = '225x275' | '450x550' | 'original';

type LegislatorRow = {
  bioguideId: string;
  name: string;
  lastName: string;
  govtrackId?: number;
};

const legislatorRows = (
  currentLegislators as { legislators: LegislatorRow[] }
).legislators;

const bioguideToLegislator = new Map<string, LegislatorRow>(
  legislatorRows.map((row) => [row.bioguideId, row]),
);

/** Rare host overrides when Bioguide is missing a current member photo. */
const CONGRESSIONAL_PORTRAIT_URL_OVERRIDES: Record<string, string> = {
  // Bioguide returns 404 for Soto; GovTrack hosts the public-domain portrait.
  S001200: 'https://www.govtrack.us/static/legislator-photos/412695-200px.jpeg',
};

/** True when bioguideId resolves to a current legislator with the same last name. */
export function bioguideMatchesCurrentLegislator(
  bioguideId: string,
  politician: { lastName: string },
): boolean {
  const leg = bioguideToLegislator.get(bioguideId);
  if (!leg) return true;
  return leg.lastName.toLowerCase() === politician.lastName.toLowerCase();
}

/** Canonical public-domain congressional portrait URL for a bioguide ID.
 *
 * Primary: official bioguide.congress.gov endpoint (Tier 1, .gov host).
 * The `size` param is kept for API compatibility but bioguide serves one
 * canonical size — the size arg is ignored for the primary host.
 */
export function congressPhotoUrl(
  bioguideId: string,
  size: CongressPhotoSize = '450x550',
): string {
  const override = CONGRESSIONAL_PORTRAIT_URL_OVERRIDES[bioguideId];
  if (override) return override;
  void size;
  const firstLetter = bioguideId[0].toUpperCase();
  return `https://bioguide.congress.gov/bioguide/photo/${firstLetter}/${bioguideId}.jpg`;
}

export { PHOTO_ATTRIBUTION } from '@/lib/photoAttribution';

/**
 * Official executive-branch portraits without a bioguide ID (cabinet principals).
 * Sourced from Tier-1 .gov hosts: whitehouse.gov, justice.gov, treasury.gov,
 * defense.gov (DVIDS), and dhs.gov.
 */
const EXECUTIVE_PORTRAIT_URLS: Record<string, string> = {
  'pres-us':
    'https://www.whitehouse.gov/wp-content/uploads/2025/02/President-Donald-J-Trump-Official-Presidential-Portrait.png',
  // Same-origin optimized copy of the official flgov.com inauguration portrait
  // (hotlink/timeouts from flgov.com flake CI render-integrity on GH runners).
  'ron-desantis': '/portraits/ron-desantis.jpg',
  'cab-bondi': 'https://www.justice.gov/d9/2025-12/ag_pamela_bondi.jpg.jpg',
  'cab-bessent': 'https://home.treasury.gov/system/files/136/Secretary_Bessent.jpg',
  'cab-hegseth':
    'https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/2501/8844545/2000w_q95.jpg',
  'cab-noem':
    'https://www.dhs.gov/sites/default/files/2025-04/25_0402_opa_secretary-noem-official-portrait.JPG',
};

/** Resolve an official portrait URL for a sitting executive profile ID, if catalogued. */
export function executivePortraitUrl(profileId: string): string | undefined {
  return EXECUTIVE_PORTRAIT_URLS[profileId];
}

/** Best available portrait for any politician record (bioguide → executive catalog). */
export function resolvePoliticianPhotoUrl(p: {
  id: string;
  bioguideId?: string;
  imageUrl?: string;
  lastName?: string;
  chamber?: string;
}): string | undefined {
  if (p.imageUrl) return p.imageUrl;
  if (p.bioguideId && p.lastName && !bioguideMatchesCurrentLegislator(p.bioguideId, { lastName: p.lastName })) {
    return executivePortraitUrl(p.id);
  }
  if (p.bioguideId) return congressPhotoUrl(p.bioguideId);
  return executivePortraitUrl(p.id);
}
