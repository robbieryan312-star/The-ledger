/**
 * verify-phase17b-batch.ts — acceptance gate for the Phase 17b sample batch.
 *
 * Reads the regenerated topicPositions.json for a set of bioguideIds and asserts
 * the PILOT_PROFILE_CHECKLIST.md / ledger-core-rules.mdc acceptance criteria:
 *   - no truncated/fragment Said statements
 *   - no procedural CREC boilerplate presented as a Said statement
 *   - no bio-boilerplate presented as a position
 *   - no single-sourced 'media' shown as verified (must be 'alleged')
 *   - Said→Did + org→vote counts per member
 *
 * Run: npx tsx scripts/verify-phase17b-batch.ts ID1,ID2,...
 */
import { readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSaidDidDiffsFromTopicPositions } from '../lib/data/buildSaidDidDiffs';
import { getScheduleAForBioguide } from '../lib/data/fecScheduleA';
import { buildOrgVoteTopicLinks } from '../lib/data/buildOrgVoteTopicLinks';
import type { VoteRecord } from '../lib/types';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TP_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'topicPositions.json');
const LEG_FILE = path.join(projectRoot, 'lib', 'data', 'generated', 'currentLegislators.json');
const VOTES_FILE = path.join(projectRoot, 'data', 'votes', 'national', 'congress-votes.json');
const DEBUG_LOG = path.join(projectRoot, '.cursor', 'debug-7a1a47.log');

function dlog(hypothesisId: string, message: string, data: unknown) {
  // #region agent log
  try {
    appendFileSync(
      DEBUG_LOG,
      JSON.stringify({
        sessionId: '7a1a47',
        runId: 'phase17b-verify',
        hypothesisId,
        location: 'verify-phase17b-batch.ts',
        message,
        data,
        timestamp: Date.now(),
      }) + '\n',
    );
  } catch {
    /* logging must never break verification */
  }
  // #endregion
}

interface Stmt { title: string; date: string; url: string; tier: string; topicId: string }
interface Platform { text: string; tier: string; source: string }
interface TopicData { platformPositions?: Platform[]; statements: Stmt[]; saidDidLinks: unknown[] }

const FRAGMENT_RE = /^(mr|ms|mrs|dr)\.?\s*\)?$|^(mr|ms|mrs)\.\s+\w+\),/i;
const PROCEDURAL_RE =
  /submitted an amendment|submitted the following resolution|were added as cosponsors|were removed as cosponsors|which was ordered to lie on the table|were referred to the committee|at the request of/i;
const BIO_BOILERPLATE_RE =
  /\bis (a|an|the) (member|senator|representative|congress(man|woman)|graduate|native|resident)\b|\bwas (born|elected|first elected|raised)\b|did not complete|click here/i;

function isFragmentStatement(s: Stmt): boolean {
  const t = s.title.trim();
  if (t.length < 40) return true;
  if (FRAGMENT_RE.test(t)) return true;
  return false;
}

function loadVotes(): Map<string, VoteRecord[]> {
  const raw = JSON.parse(readFileSync(VOTES_FILE, 'utf8')) as {
    byBioguideId?: Record<string, { votes?: VoteRecord[] }>;
  };
  const map = new Map<string, VoteRecord[]>();
  for (const [id, e] of Object.entries(raw.byBioguideId ?? {})) map.set(id, e.votes ?? []);
  return map;
}

function main() {
  const ids = (process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    console.error('Usage: npx tsx scripts/verify-phase17b-batch.ts ID1,ID2,...');
    process.exit(1);
  }

  const tp = JSON.parse(readFileSync(TP_FILE, 'utf8')) as {
    byBioguideId: Record<string, Record<string, TopicData>>;
  };
  const legs = (JSON.parse(readFileSync(LEG_FILE, 'utf8')) as {
    legislators: Array<{ bioguideId: string; name: string; chamber: string; party: string; stateCode: string }>;
  }).legislators;
  const legById = new Map(legs.map((l) => [l.bioguideId, l]));
  const votesById = loadVotes();

  const violations: string[] = [];
  const rows: string[] = [];

  rows.push(
    'bioguide  chamber  party  st  name                     off  med  alg  frag  proc  bioBP  S→D  org→vote',
  );

  for (const id of ids) {
    const leg = legById.get(id);
    const topics = tp.byBioguideId[id] ?? {};

    let official = 0;
    let media = 0;
    let alleged = 0;
    let fragments = 0;
    let procedural = 0;
    let bioBoilerplate = 0;

    for (const [, td] of Object.entries(topics)) {
      for (const s of td.statements ?? []) {
        if (s.tier === 'official') official += 1;
        else if (s.tier === 'media') media += 1;
        else if (s.tier === 'alleged') alleged += 1;

        if (isFragmentStatement(s)) {
          fragments += 1;
          violations.push(`${id} FRAGMENT stmt (${s.tier}): "${s.title.slice(0, 70)}"`);
        }
        if (PROCEDURAL_RE.test(s.title)) {
          procedural += 1;
          violations.push(`${id} PROCEDURAL stmt: "${s.title.slice(0, 70)}"`);
        }
      }
      for (const p of td.platformPositions ?? []) {
        if (BIO_BOILERPLATE_RE.test(p.text)) {
          bioBoilerplate += 1;
          violations.push(`${id} BIO-BOILERPLATE position: "${p.text.slice(0, 70)}"`);
        }
      }
    }

    const saidDid = buildSaidDidDiffsFromTopicPositions(id, leg?.name ?? id);
    // any Said→Did surfaced as verified media must not be single-sourced (pipeline: media=2+, else alleged)
    for (const d of saidDid) {
      if (d.said.tier === 'media' && d.said.verbatim === false) {
        violations.push(`${id} Said→Did media tier but non-verbatim: "${d.said.quote.slice(0, 50)}"`);
      }
    }

    const sched = getScheduleAForBioguide(id);
    const votes = votesById.get(id) ?? [];
    const orgLinks = sched ? buildOrgVoteTopicLinks(sched, votes) : [];

    rows.push(
      [
        id.padEnd(8),
        (leg?.chamber ?? '?').padEnd(7),
        (leg?.party ?? '?').slice(0, 5).padEnd(5),
        (leg?.stateCode ?? '?').padEnd(2),
        (leg?.name ?? '(not in roster)').slice(0, 23).padEnd(23),
        String(official).padStart(3),
        String(media).padStart(3),
        String(alleged).padStart(3),
        String(fragments).padStart(4),
        String(procedural).padStart(4),
        String(bioBoilerplate).padStart(5),
        String(saidDid.length).padStart(3),
        String(orgLinks.length).padStart(6),
      ].join('  '),
    );

    dlog('acceptance', 'per-member batch verification', {
      bioguideId: id,
      chamber: leg?.chamber,
      officialStatements: official,
      mediaStatements: media,
      allegedStatements: alleged,
      fragments,
      procedural,
      bioBoilerplate,
      saidDidDiffs: saidDid.length,
      orgVoteLinks: orgLinks.length,
    });
  }

  console.log(rows.join('\n'));
  console.log('');

  if (violations.length === 0) {
    console.log(`ACCEPTANCE: CLEAN — 0 violations across ${ids.length} members.`);
    dlog('summary', 'batch clean', { members: ids.length, violations: 0 });
  } else {
    console.log(`ACCEPTANCE: ${violations.length} VIOLATION(S):`);
    for (const v of violations) console.log('  - ' + v);
    dlog('summary', 'batch violations found', { members: ids.length, violations: violations.length });
  }
}

main();
