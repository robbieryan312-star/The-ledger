/**
 * Sync per-profile manifest.json and category status fields from on-disk content.
 * Output: lib/data/generated/profiles/{bioguideId}/manifest.json + status on controversies/endorsements/orgVoteLinks
 * Run: npm run sync:profile-manifest -- --members S000033[,ID...]
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { syncProfileManifestFromDisk } from './lib/profileManifestSync';

function parseMembers(argv: string[]): string[] {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) {
    console.error('Usage: npm run sync:profile-manifest -- --members BIoguideId[,ID...]');
    process.exit(1);
  }
  return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
}

async function main(): Promise<void> {
  const members = parseMembers(process.argv.slice(2));
  for (const bioguideId of members) {
    await syncProfileManifestFromDisk(bioguideId);
    console.log(`Synced manifest + category status fields: ${bioguideId}`);
  }
}

const invoked = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (invoked) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
