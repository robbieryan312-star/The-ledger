/**
 * photos.ts — official, key-free portrait URLs.
 *
 * Congressional portraits use GovTrack's public static image host keyed by
 * `govtrackId` (which is carried in our synced current-legislators dataset).
 * The underlying photos are public-domain member portraits from Congress.
 *
 * Governors, demo entries, and anyone without a resolvable portrait fall back
 * to an initials avatar in the UI (see components/ui/PoliticianAvatar.tsx).
 */
import currentLegislators from './generated/currentLegislators.json';

export type CongressPhotoSize = '225x275' | '450x550' | 'original';

const bioguideToGovtrackId = new Map<string, number>(
  (
    currentLegislators as {
      legislators: Array<{ bioguideId: string; govtrackId?: number }>;
    }
  ).legislators
    .filter((row) => typeof row.govtrackId === 'number')
    .map((row) => [row.bioguideId, row.govtrackId as number]),
);

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
  const govtrackId = bioguideToGovtrackId.get(bioguideId);
  const px = size === '225x275' ? '100px' : size === '450x550' ? '200px' : '450px';
  if (govtrackId) {
    return `https://www.govtrack.us/static/legislator-photos/${govtrackId}-${px}.jpeg`;
  }

  // Fallback for unexpected IDs not found in the synced legislators dataset.
  const firstLetter = bioguideId[0].toUpperCase();
  return `https://bioguide.congress.gov/bioguide/photo/${firstLetter}/${bioguideId}.jpg`;
}

/** Human-facing attribution for the portrait collection. */
export const PHOTO_ATTRIBUTION = {
  label: 'Photo: public domain · GovTrack congressional portraits',
  url: 'https://www.govtrack.us/congress/members',
};

/**
 * Official executive-branch portraits without a bioguide ID (cabinet principals).
 * Sourced from Tier-1 .gov hosts: whitehouse.gov, justice.gov, treasury.gov,
 * defense.gov (DVIDS), and dhs.gov.
 */
const EXECUTIVE_PORTRAIT_URLS: Record<string, string> = {
  'pres-us':
    'https://www.whitehouse.gov/wp-content/uploads/2025/02/President-Donald-J-Trump-Official-Presidential-Portrait.png',
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
}): string | undefined {
  if (p.imageUrl) return p.imageUrl;
  if (p.bioguideId) return congressPhotoUrl(p.bioguideId);
  return executivePortraitUrl(p.id);
}
