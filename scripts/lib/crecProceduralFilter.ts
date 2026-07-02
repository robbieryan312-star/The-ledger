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

/** True when the text is procedural CREC clerk output rather than a floor remark. */
export function isProceduralCrecText(text: string): boolean {
  const t = text.trim();
  const head = t.slice(0, 200);

  // 1. Amendment / resolution submissions and cosponsor bookkeeping (existing rules).
  if (/submitted an amendment/i.test(t)) return true;
  if (/submitted the following (resolution|amendment|concurrent resolution|joint resolution)/i.test(t)) {
    return true;
  }
  if (/(were|was) (added|removed) as (a )?cosponsors?/i.test(t)) return true;
  if (/which was ordered to lie on the table/i.test(t)) return true;
  if (/were referred to the Committee/i.test(head)) return true;
  if (/At the request of/i.test(head)) return true;
  if (/names of the Senator/i.test(head)) return true;
  if (/,?\s*the Senator from [A-Z]/.test(head)) return true;
  if (/^\s*Mr\.\s+\w+\),/i.test(head)) return true;

  // 2. Roll-call / vote-roster markers.
  if (/\bNOT VOTING\b/.test(t)) return true;
  if (/--\s*yeas\s+\d+/i.test(t)) return true;
  if (/\bThe (yeas and nays|result was announced)\b/i.test(t)) return true;

  // 3. Bill / resolution introductions.
  if (
    /\b(H\.?\s?R\.|S\.|H\.\s?Con\.\s?Res\.|S\.\s?Con\.\s?Res\.|H\.\s?J\.\s?Res\.|S\.\s?J\.\s?Res\.|H\.\s?Res\.|S\.\s?Res\.)\s*\d+\.?\s*(A bill|A resolution|A concurrent resolution|A joint resolution|To amend|To designate|To provide|To require|To establish|To authorize|An act)/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\bA bill to (amend|provide|require|establish|designate|authorize|direct|prohibit)/i.test(head)) {
    return true;
  }

  // 4. Constitutional-authority statements.
  if (/Congress has the power to enact this legislation pursuant to/i.test(t)) return true;
  if (/constitutional authority (statement|to enact)/i.test(t)) return true;

  // 4b. Quoted statutory / bill text — lettered or numbered subsection headers ("(2) Boundary.--",
  // "(A) In general.--") and drafting boilerplate. This is the text of a bill being read into the
  // Record, not the member speaking.
  if (/\((?:\d+|[A-Za-z]{1,3})\)\s+[A-Z][A-Za-z ]{2,}\.--/.test(t)) return true;
  if (/shall have the same force and effect as if included in this (section|Act)/i.test(t)) {
    return true;
  }
  if (/As soon as practicable after the date of enactment of this Act/i.test(t)) return true;

  // 5. Cosponsor / sponsor "(for herself/himself, ...)" openers.
  if (/\(for (herself|himself|themselves|him|her|them)\b/i.test(head)) return true;

  // 6. Honorific name list (cosponsor lists) with no address to the chair.
  const honorifics = t.match(/\b(Mr|Mrs|Ms|Miss)\.\s+[A-Z][a-z]/g) ?? [];
  const addressesChair = /\b(Mr\.|Madam)\s+(President|Speaker)\b/i.test(t);
  if (honorifics.length >= 4 && !addressesChair) return true;

  // 7. Bare surname roster.
  if (hasSurnameRun(t)) return true;

  return false;
}
