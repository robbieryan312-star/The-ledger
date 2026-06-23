/**
 * verify-office-resolution.ts — proof that current office is correct-by-construction.
 *
 * Demonstrates against the real, key-free legislators snapshot that:
 *   1. Florida's current senators resolve to Rick Scott + Ashley Moody.
 *   2. Marco Rubio (bioguide R000595) — who left the Senate — resolves to a
 *      FORMER office automatically, even when his profile claims `inOffice: true`.
 *   3. National roster coverage: 537 Congress + 50 governors, de-duplicated, photos.
 *
 * Run with:  npx tsx scripts/verify-office-resolution.ts
 */
import {
  resolveCurrentOffice,
  currentSenatorsForState,
  isCurrentMember,
  LEGISLATORS_SOURCE,
  LEGISLATORS_AS_OF,
} from '../lib/data/officeResolution';
import { allPoliticians, getCoverageStats } from '../lib/data/allPoliticians';
import { mockPoliticians } from '../lib/data/mockPoliticians';
import { currentGovernors } from '../lib/data/governors';
import legislatorsSnapshot from '../lib/data/generated/currentLegislators.json';
import { Politician } from '../lib/types';

console.log('Source:', LEGISLATORS_SOURCE.name);
console.log('As-of :', LEGISLATORS_AS_OF, '\n');

console.log('FL current senators (from real dataset):');
for (const s of currentSenatorsForState('FL')) {
  console.log(`  • ${s.office} ${s.state} — ${s.party} (term ${s.termStart} → ${s.termEnd})`);
}

console.log('\nResolved labels for featured FL senators:');
for (const id of ['sen-scott', 'sen-moody']) {
  const p = mockPoliticians.find((x) => x.id === id)!;
  const r = resolveCurrentOffice(p);
  console.log(`  • ${p.name.padEnd(14)} → ${r.label}  [${r.reason}, isCurrent=${r.isCurrent}]`);
}

// The Rubio case — a profile that *claims* to be a sitting senator (inOffice:true,
// chamber:senate) but whose bioguide is absent from the current dataset.
const rubio: Politician = {
  id: 'marco-rubio',
  bioguideId: 'R000595',
  name: 'Marco Rubio',
  firstName: 'Marco',
  lastName: 'Rubio',
  party: 'Republican',
  state: 'Florida',
  stateCode: 'FL',
  chamber: 'senate',
  level: 'federal',
  bio: '',
  inOffice: true, // deliberately stale — the resolver must override this
  termStart: '2011-01-03',
  termEnd: '2029-01-03',
  votingRecord: [],
  campaignFinance: {
    totalRaised: 0, totalSpent: 0, cashOnHand: 0, cycle: '2022', donors: [],
    topIndustries: [], lobbyistMoney: [], foreignPAC: [],
    individualDonations: 0, pacDonations: 0, selfFunding: 0,
  },
  stockTrades: [],
  consistency: { overallScore: 0, campaignPromises: [], partyLineVotePercentage: 0, lobbyistAlignmentPercentage: 0, termConsistency: [] },
  topIssues: [],
  controversies: [],
  news: [],
};

const rubioResolved = resolveCurrentOffice(rubio);
console.log('\nRubio resolution (profile claims inOffice:true):');
console.log(`  • bioguide present in dataset? ${isCurrentMember('R000595')}`);
console.log(`  • resolved label : ${rubioResolved.label}`);
console.log(`  • reason         : ${rubioResolved.reason}`);
console.log(`  • isCurrent      : ${rubioResolved.isCurrent}`);

// ── National coverage assertions ─────────────────────────────────────────────
const snapshot = legislatorsSnapshot as { legislators: { bioguideId: string; chamber: string }[] };
const legislatorCount = snapshot.legislators.length;
const stats = getCoverageStats();

console.log('\nNational coverage:');
console.log(`  • legislators-current snapshot : ${legislatorCount}`);
console.log(`  • confirmed governors          : ${currentGovernors.length}`);
console.log(`  • national roster (allPoliticians): ${stats.total}`);
console.log(`  • senators / reps / governors  : ${stats.senators} / ${stats.representatives} / ${stats.governors}`);
console.log(`  • with official photos         : ${stats.withPhotos}`);
console.log(`  • featured + lightweight       : ${stats.featured} + ${stats.lightweight}`);

const bioguides = allPoliticians.map((p) => p.bioguideId).filter((b): b is string => !!b);
const uniqueBioguides = new Set(bioguides);
const congressInRoster = allPoliticians.filter((p) => p.chamber === 'senate' || p.chamber === 'house').length;
const allCongressResolvedCurrent = snapshot.legislators.every((l) => {
  const p = allPoliticians.find((x) => x.bioguideId === l.bioguideId);
  return p && resolveCurrentOffice(p).reason === 'real-current';
});

const coveragePass =
  legislatorCount === 537 &&
  currentGovernors.length === 50 &&
  stats.senators === 100 &&
  stats.representatives === 437 &&
  stats.governors === 50 &&
  stats.total >= 587 &&
  bioguides.length === uniqueBioguides.size &&
  congressInRoster === 537 &&
  stats.withPhotos >= 537 &&
  allCongressResolvedCurrent;

console.log(`\n${coveragePass ? 'PASS' : 'FAIL'}: National roster — 537 Congress + 50 governors, de-duped, photos wired.`);

const pass =
  currentSenatorsForState('FL').length === 2 &&
  !isCurrentMember('R000595') &&
  rubioResolved.reason === 'real-former' &&
  rubioResolved.isCurrent === false &&
  coveragePass;

console.log(`\n${pass ? 'PASS' : 'FAIL'}: FL senators are Scott + Moody; Rubio resolves to FORMER; national coverage OK.`);
process.exit(pass ? 0 : 1);
