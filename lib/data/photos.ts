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
