/**
 * M-CHANNEL-PROOF — Ballotpedia platform stances end-to-end on a known-good control.
 *
 * Uses the same `fetchBallotpediaPositions` scrape path as `sync:topic-positions`,
 * writes qualified stances to the migrated profile destination
 * `lib/data/generated/profiles/{bioguideId}/positions.json` (NOT the mega-bundle).
 *
 * Run: npx tsx scripts/prove-ballotpedia-platform-channel.ts --member M000355
 * Log: tee /tmp/ledger-prove-ballotpedia-platform.log
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDisqualifiedPlatformPosition } from '../lib/data/sourceIntegrity';
import { fetchBallotpediaPositions } from './sync-topic-positions';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGISLATORS_FILE = path.join(
  projectRoot,
  'lib/data/generated/currentLegislators.json',
);
const PROFILES_ROOT = path.join(projectRoot, 'lib/data/generated/profiles');

interface LegislatorRow {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  stateCode: string;
  chamber: string;
}

function parseMember(): string {
  const idx = process.argv.indexOf('--member');
  const id = idx >= 0 ? process.argv[idx + 1]?.trim() : '';
  if (!id) {
    console.error('Usage: npx tsx scripts/prove-ballotpedia-platform-channel.ts --member M000355');
    process.exit(1);
  }
  return id;
}

async function main(): Promise<void> {
  const bioguideId = parseMember();
  const raw = JSON.parse(await readFile(LEGISLATORS_FILE, 'utf8')) as {
    legislators?: LegislatorRow[];
  };
  const legislators = raw.legislators ?? [];
  const leg = legislators.find((l) => l.bioguideId === bioguideId);
  if (!leg) {
    console.error(`No legislator row for ${bioguideId}`);
    process.exit(1);
  }

  const asOf = new Date().toISOString().slice(0, 10);
  console.log(`M-CHANNEL-PROOF Ballotpedia platform — ${bioguideId} (${leg.name}) asOf=${asOf}`);
  console.log('Code path: fetchBallotpediaPositions (sync-topic-positions export)');

  const result = await fetchBallotpediaPositions(leg, asOf);
  console.log(
    `Ballotpedia: connected=${result.connected} reached=${result.reached} topics=${result.byTopic.size}`,
  );

  const byTopic: Record<string, { platformPositions: unknown[] }> = {};
  const extracted: Array<{ topicId: string; text: string; url: string; tier: string; asOf: string }> =
    [];

  for (const [topicId, entries] of result.byTopic.entries()) {
    // Defense in depth — sync path also filters; keep only qualified here.
    const qualified = entries.filter((e) => !isDisqualifiedPlatformPosition(e.text));
    if (qualified.length === 0) continue;
    byTopic[topicId] = { platformPositions: qualified };
    for (const e of qualified) {
      extracted.push({
        topicId,
        text: e.text,
        url: e.url,
        tier: e.tier,
        asOf: e.asOf,
      });
    }
  }

  if (extracted.length < 3) {
    console.error(
      `FAIL: expected ≥3 qualified platform stances; got ${extracted.length}. Channel unproven.`,
    );
    console.error(JSON.stringify({ connected: result.connected, reached: result.reached, extracted }, null, 2));
    process.exit(2);
  }

  const outDir = path.join(PROFILES_ROOT, bioguideId);
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'positions.json');

  let priorNote = '';
  try {
    const prior = JSON.parse(await readFile(outFile, 'utf8')) as { note?: string };
    priorNote = prior.note ?? '';
  } catch {
    /* fresh */
  }

  const payload = {
    bioguideId,
    status: 'filled' as const,
    note:
      `M-CHANNEL-PROOF ${asOf}: Ballotpedia platform stances acquired via fetchBallotpediaPositions ` +
      `(same path as sync:topic-positions) → profile destination. ${extracted.length} qualified ` +
      `stance(s). Prior note retained if any: ${priorNote ? '[see git history]' : '(none)'}`,
    byTopic,
  };

  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`PASS: wrote ${extracted.length} stance(s) → ${path.relative(projectRoot, outFile)}`);
  for (const [i, e] of extracted.slice(0, 5).entries()) {
    console.log(
      `  [${i + 1}] ${e.topicId} · tier=${e.tier} · asOf=${e.asOf} · ${e.url}\n      ${e.text.slice(0, 160)}…`,
    );
  }

  const reportPath = path.join(
    projectRoot,
    'data/reports',
    `channel-proof-ballotpedia-platform-${bioguideId}-${asOf}.json`,
  );
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        channel: 'ballotpedia-platform-stances',
        bioguideId,
        asOf,
        codePath: 'scripts/sync-topic-positions.ts#fetchBallotpediaPositions',
        destination: path.relative(projectRoot, outFile),
        verdict: 'PASS',
        count: extracted.length,
        items: extracted.slice(0, 5),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`Report: ${path.relative(projectRoot, reportPath)}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
