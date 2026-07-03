/**
 * Stamp displayText on CREC statements in migrated profile statements.json files.
 * Run: npx tsx scripts/stamp-profile-display-text.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripCrecFloorOpener } from '../lib/data/crecDisplayText';
import { MIGRATED_PROFILE_BIOGUIDES } from '../lib/data/memberProfile';
import type { TopicStatementEntry } from '../lib/data/topicPositions';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = path.join(projectRoot, 'lib/data/generated/profiles');

async function main(): Promise<void> {
  for (const bioguideId of MIGRATED_PROFILE_BIOGUIDES) {
    const filePath = path.join(profilesRoot, bioguideId, 'statements.json');
    const data = JSON.parse(await readFile(filePath, 'utf8')) as {
      bioguideId: string;
      byTopic: Record<string, { statements: TopicStatementEntry[] }>;
    };
    let stamped = 0;
    for (const topic of Object.values(data.byTopic ?? {})) {
      for (const st of topic.statements) {
        if (st.tier === 'official' && /\/CREC-/i.test(st.url) && !st.displayText) {
          st.displayText = stripCrecFloorOpener(st.title);
          if (st.displayText !== st.title.trim()) stamped += 1;
        }
      }
    }
    await writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`${bioguideId}: displayText stamped on ${stamped} statement(s)`);
  }
}

main();
