/**
 * verify-lobbying-votes.ts — cross-check non-demo lobbying vote links against
 * any matching official Congress vote in the generated snapshot.
 *
 * Run with: npm run verify:lobbying-votes
 */
import { mockLobbyingGroups } from '../lib/data/mockLobbyingGroups';
import { getCongressVotesSnapshot } from '../lib/data/congressVotes';

function normalizeBillId(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

const congressVotes = getCongressVotesSnapshot();
const mismatches: string[] = [];
let checked = 0;
let matched = 0;

for (const group of mockLobbyingGroups) {
  for (const relatedVote of group.relatedVotes) {
    const relatedBillId = normalizeBillId(relatedVote.billId);

    for (const recipientVote of relatedVote.recipientVotes) {
      if (recipientVote.isDemo) continue;

      checked += 1;
      const congressEntry = congressVotes.byPoliticianId[recipientVote.politicianId];
      const officialVote = congressEntry?.votes.find(
        (vote) =>
          normalizeBillId(vote.billId) === relatedBillId &&
          vote.date === recipientVote.date,
      );

      if (!officialVote) continue;

      matched += 1;
      if (officialVote.vote !== recipientVote.vote) {
        mismatches.push(
          `${group.id} ${relatedVote.billId} ${recipientVote.politicianId} on ${recipientVote.date}: lobbying=${recipientVote.vote}, official=${officialVote.vote}`,
        );
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error('FAIL: non-demo lobbying votes contradict synced Congress votes:');
  for (const mismatch of mismatches) {
    console.error(`  - ${mismatch}`);
  }
  process.exit(1);
}

console.log(
  `PASS: ${checked} non-demo lobbying vote rows checked; ${matched} matched synced Congress vote rows with no contradictions.`,
);
