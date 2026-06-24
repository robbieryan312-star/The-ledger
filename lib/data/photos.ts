/**
 * photos.ts — official, key-free portrait URLs.
 *
 * Members of Congress are wired to the public-domain `unitedstates/images`
 * collection (https://github.com/unitedstates/images), which is keyed by
 * bioguide ID and served from theunitedstates.io. Images are public domain
 * (works of the U.S. federal government). No API key required.
 *
 * Governors, demo entries, and anyone without a bioguide portrait fall back to
 * an initials avatar in the UI (see components/ui/PoliticianAvatar.tsx).
 */

export type CongressPhotoSize = '225x275' | '450x550' | 'original';

/** Canonical public-domain congressional portrait URL for a bioguide ID. */
export function congressPhotoUrl(
  bioguideId: string,
  size: CongressPhotoSize = '450x550',
): string {
  return `https://theunitedstates.io/images/congress/${size}/${bioguideId}.jpg`;
}

/** Human-facing attribution for the portrait collection. */
export const PHOTO_ATTRIBUTION = {
  label: 'Photo: public domain · unitedstates/images project',
  url: 'https://github.com/unitedstates/images',
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
