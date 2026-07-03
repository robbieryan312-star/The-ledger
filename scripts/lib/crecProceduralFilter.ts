/**
 * CREC procedural-text filter.
 *
 * A "Said" statement must be spoken floor prose — the member addressing the chair
 * ("Mr./Ms. NAME. Mr./Madam President/Speaker, ...") — or a verbatim attributed media
 * quote. Everything else the Congressional Record carries under a member's name is
 * procedural clerk text and is NEVER a statement, even when verbatim and attributed:
 *   - amendment / resolution submissions
 *   - bill / resolution introductions ("H.R. 9395. A bill to amend ...")
 *   - constitutional-authority statements
 *   - cosponsor lists ("(for herself, Mr. McGovern, ...)")
 *   - roll-call / vote rosters (bare runs of surnames, "NOT VOTING", "yeas N, nays N")
 *   - procedural floor actions / chamber housekeeping (quorum calls, motions to proceed,
 *     nomination reports, morning-business/recess requests, intern recognitions)
 *
 * When in doubt, exclude — an honest gap beats boilerplate.
 */

/** Tokens that break a surname run (procedural connectors, not names). */
const RUN_STOP_TOKENS = new Set([
  'NOT', 'VOTING', 'AND', 'THE', 'OF', 'A', 'AN', 'I', 'IN', 'TO', 'FOR', 'OR',
  'MR', 'MRS', 'MS', 'MISS', 'YEAS', 'NAYS', 'PRESENT',
]);

const NAME_TOKEN_RE = /^[A-Z][A-Za-z.'\-]*(\([A-Z]{2}\))?$/;
const HONORIFIC_TOKEN_RE = /^(Mr|Mrs|Ms|Miss)\.?$/;

/**
 * A bare surname roster is a run of >=5 consecutive name-like tokens with no
 * lowercase connective prose — e.g. "Ocasio-Cortez Olszewski Omar Onder Owens Pallone".
 * Genuine floor prose never sustains such a run because it contains lowercase verbs and
 * function words that reset it.
 */
function hasSurnameRun(text: string, threshold = 5): boolean {
  let run = 0;
  for (const raw of text.split(/\s+/)) {
    const tok = raw.replace(/[,;:]+$/, '');
    if (
      NAME_TOKEN_RE.test(tok) &&
      !RUN_STOP_TOKENS.has(tok.toUpperCase()) &&
      !HONORIFIC_TOKEN_RE.test(tok)
    ) {
      run += 1;
      if (run >= threshold) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

/**
 * Ordered procedural-rule table — the single source of truth. `isProceduralCrecText`
 * returns true if any rule matches; `matchedProceduralRule` returns the first rule name
 * (used by diagnostics / the over-rejection audit).
 */
interface ProceduralRule {
  name: string;
  test: (t: string, head: string) => boolean;
}

const PROCEDURAL_RULES: ProceduralRule[] = [
  // 1. Amendment / resolution submissions and cosponsor bookkeeping.
  { name: 'amendment-submission', test: (t) => /submitted an amendment/i.test(t) },
  {
    name: 'resolution-submission',
    test: (t) => /submitted the following (resolution|amendment|concurrent resolution|joint resolution)/i.test(t),
  },
  { name: 'cosponsor-added-removed', test: (t) => /(were|was) (added|removed) as (a )?cosponsors?/i.test(t) },
  { name: 'ordered-to-lie-on-table', test: (t) => /which was ordered to lie on the table/i.test(t) },
  { name: 'referred-to-committee', test: (_t, head) => /were referred to the Committee/i.test(head) },
  { name: 'at-the-request-of', test: (_t, head) => /At the request of/i.test(head) },
  { name: 'names-of-the-senator', test: (_t, head) => /names of the Senator/i.test(head) },
  { name: 'the-senator-from', test: (_t, head) => /,?\s*the Senator from [A-Z]/.test(head) },
  { name: 'mr-name-paren-opener', test: (_t, head) => /^\s*Mr\.\s+\w+\),/i.test(head) },

  // 2. Roll-call / vote-roster markers.
  { name: 'not-voting', test: (t) => /\bNOT VOTING\b/.test(t) },
  { name: 'yeas-tally', test: (t) => /--\s*yeas\s+\d+/i.test(t) },
  { name: 'yeas-and-nays-announced', test: (t) => /\bThe (yeas and nays|result was announced)\b/i.test(t) },

  // 3. Bill / resolution introductions.
  {
    name: 'bill-intro-numbered',
    test: (t) =>
      /\b(H\.?\s?R\.|S\.|H\.\s?Con\.\s?Res\.|S\.\s?Con\.\s?Res\.|H\.\s?J\.\s?Res\.|S\.\s?J\.\s?Res\.|H\.\s?Res\.|S\.\s?Res\.)\s*\d+\.?\s*(A bill|A resolution|A concurrent resolution|A joint resolution|To amend|To designate|To provide|To require|To establish|To authorize|An act)/i.test(
        t,
      ),
  },
  {
    name: 'a-bill-to',
    test: (_t, head) => /\bA bill to (amend|provide|require|establish|designate|authorize|direct|prohibit)/i.test(head),
  },

  // 4. Constitutional-authority statements.
  { name: 'const-authority-pursuant', test: (t) => /Congress has the power to enact this legislation pursuant to/i.test(t) },
  { name: 'const-authority-header', test: (t) => /constitutional authority (statement|to enact)/i.test(t) },

  // 4b. Quoted statutory / bill text — lettered/numbered subsection headers and drafting boilerplate.
  { name: 'statutory-subsection-header', test: (t) => /\((?:\d+|[A-Za-z]{1,3})\)\s+[A-Z][A-Za-z ]{2,}\.--/.test(t) },
  {
    name: 'statutory-force-and-effect',
    test: (t) => /shall have the same force and effect as if included in this (section|Act)/i.test(t),
  },
  { name: 'statutory-as-soon-as-practicable', test: (t) => /As soon as practicable after the date of enactment of this Act/i.test(t) },

  // 5. Cosponsor / sponsor "(for herself/himself, ...)" openers.
  { name: 'for-herself-himself', test: (_t, head) => /\(for (herself|himself|themselves|him|her|them)\b/i.test(head) },

  // 6. Honorific name list (cosponsor lists) with no address to the chair.
  {
    name: 'honorific-name-list',
    test: (t) => {
      const honorifics = t.match(/\b(Mr|Mrs|Ms|Miss)\.\s+[A-Z][a-z]/g) ?? [];
      const addressesChair = /\b(Mr\.|Madam)\s+(President|Speaker)\b/i.test(t);
      return honorifics.length >= 4 && !addressesChair;
    },
  },

  // 7. Bare surname roster.
  { name: 'surname-roster', test: (t) => hasSurnameRun(t) },

  // 8. Procedural floor actions / chamber housekeeping — an address to the chair with no position.
  //    (Surfaced by the Phase 17b 50-member speaking-diversity batch.)
  { name: 'quorum-call-rescission', test: (t) => /quorum call be rescinded/i.test(t) },
  { name: 'resume-legislative-session', test: (t) => /resume legislative session/i.test(t) },
  { name: 'motion-to-proceed', test: (t) => /\bI move to proceed to\b/i.test(t) },
  { name: 'committee-nomination-report', test: (t) => /I report favorably the following nomination/i.test(t) },
  { name: 'floor-privileges', test: (t) => /granted floor privileges/i.test(t) },
  { name: 'scheduled-recess', test: (t) => /the previously scheduled recess/i.test(t) },

  // 8b. Ceremonial intern recognition — a thank-you to office staff, not a policy statement.
  { name: 'intern-recognition', test: (t) => /\ban intern in (my|his|her|the|our)\b/i.test(t) },
];

/** Returns the first matching procedural-rule name, or null when the text is not procedural. */
export function matchedProceduralRule(text: string): string | null {
  const t = text.trim();
  const head = t.slice(0, 200);
  for (const rule of PROCEDURAL_RULES) {
    if (rule.test(t, head)) return rule.name;
  }
  return null;
}

/** True when the text is procedural CREC clerk output rather than a floor remark. */
export function isProceduralCrecText(text: string): boolean {
  return matchedProceduralRule(text) !== null;
}
