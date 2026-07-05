/**
 * reprocess-profiles.ts — re-run current parsers/validators over already-committed profile
 * JSON, NO network calls. Standard backfill step whenever parsing/classification logic
 * changes (displaySummary opener-stripping, topic-keyword precision, HTML-entity decoding,
 * vote-restatement purge). Idempotent — running twice produces the same output.
 *
 * Run: npm run reprocess:profiles
 *      npm run reprocess:profiles -- --members P000197[,ID...]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasUndecodedHtmlEntity } from '../lib/data/htmlEntities';
import { MIGRATED_PROFILE_BIOGUIDES } from '../lib/data/memberProfile';
import { reprocessMember, reprocessPositions, reprocessStatements } from './lib/profileReprocess';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseMembersArg(argv: string[]): string[] | null {
  const idx = argv.indexOf('--members');
  if (idx === -1 || !argv[idx + 1]) return null;
  return argv[idx + 1].split(',').map((s) => s.trim()).filter(Boolean);
}

async function main(): Promise<void> {
  const cliMembers = parseMembersArg(process.argv);
  const members = cliMembers ?? [...MIGRATED_PROFILE_BIOGUIDES];

  console.log('reprocess-profiles: no network calls, operating only on committed JSON\n');

  for (const bioguideId of members) {
    const stats = await reprocessMember(bioguideId);
    console.log(
      `${stats.bioguideId}: reclassified=${stats.reclassified} retrimmed=${stats.retrimmed} | ` +
        `positions purged=${stats.purged}/${stats.positionsBefore} | ` +
        `saidDid links ${stats.saidDidBefore} -> ${stats.saidDidAfter}`,
    );
  }

  console.log('\nDone. saidDid.json rebuilt via pruneSaidDidLinksByTopic; manifest.json positions/saidDid categories refreshed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { reprocessStatements, reprocessPositions, hasUndecodedHtmlEntity };
