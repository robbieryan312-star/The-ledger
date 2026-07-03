/**
 * ONE extractive summarizer for every fact -> display-text conversion on the platform
 * (Key Issues summaries, evidence rows, Said->Did quotes, bill drop-downs).
 *
 * Extractive only — never paraphrases, never fabricates. These functions compute what
 * to RENDER; they never mutate the raw stored `title`/`quote`/`text` fields that the
 * source-integrity guards check against.
 */
import { decodeHtmlEntities } from './htmlEntities';

/**
 * CREC floor-speech opener: "Mr./Ms./Mrs./Miss. SURNAME[ (for himself/herself, Mr. X, ...)]. Mr./Madam President/Speaker, "
 * Surname character class covers Mc/Mac/O'/hyphenated names (they're single uppercase tokens
 * in CREC transcripts, e.g. "McCONNELL", "O'ROURKE"). The optional parenthetical absorbs
 * bill-cosponsorship compounds ("(for himself and Mr. WARREN)") that occasionally precede
 * the "Mr. President," clause.
 */
const OPENER_RE =
  /^(?:Mr|Mrs|Ms|Miss|Madam)\.\s+[A-Z][A-Za-z'\u2019\-]*(?:\s*\([^)]*\))?\.?\s*(?:Mr\.|Madam)\s+(?:President|Speaker),?\s*/i;

/** Unconditional opener/entity strip. Never gated on url/tier — safe no-op on text with no opener. */
export function clean(raw: string | undefined | null): string {
  if (!raw) return '';
  let t = decodeHtmlEntities(raw).trim();
  t = t.replace(OPENER_RE, '').trim();
  return t;
}

const ABBR_TOKENS = [
  'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Sen', 'Rep', 'Gov', 'Rev', 'Adm', 'Gen', 'Lt', 'Col', 'Maj',
  'Capt', 'Jr', 'Sr', 'St', 'Messrs', 'Mmes', 'No', 'vs', 'Ave', 'Blvd', 'Corp', 'Inc', 'Co',
  'etc', 'approx', 'Const', 'Rec',
];

const SENTINEL = '\u0000';

/**
 * Abbreviation-aware sentence segmentation. NEVER a naive `.split('. ')` — that treats
 * "Mr." / "Sen." / "U.S." / "H.R." / "Brett M." / "$1.7 trillion" as sentence boundaries.
 */
export function segmentSentences(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  let protectedText = text;

  const abbrPattern = new RegExp(`\\b(${ABBR_TOKENS.join('|')})\\.`, 'g');
  protectedText = protectedText.replace(abbrPattern, (_m, w: string) => `${w}${SENTINEL}`);

  // Dotted initialisms of 2+ letters: U.S., H.R., D.C., S.J.Res., etc.
  protectedText = protectedText.replace(/\b(?:[A-Z]\.){2,}/g, (m) => m.replace(/\./g, SENTINEL));

  // Single capital-letter bill/citation prefixes followed by a number, e.g. "S. 1234", "H. 4521".
  protectedText = protectedText.replace(/\b([A-Z])\.(?=\s*\d)/g, (_m, letter: string) => `${letter}${SENTINEL}`);

  // Middle initials before a following capitalized word, e.g. "Brett M. Kavanaugh".
  protectedText = protectedText.replace(/\b([A-Z])\.(?=\s+[A-Z][a-z])/g, (_m, letter: string) => `${letter}${SENTINEL}`);

  // Decimal numbers, e.g. "$1.7 trillion".
  protectedText = protectedText.replace(/(\d)\.(\d)/g, `$1${SENTINEL}$2`);

  const rawParts = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9"'\u201c])/);

  const restore = (s: string) => s.replace(new RegExp(SENTINEL, 'g'), '.').trim();
  return rawParts.map(restore).filter(Boolean);
}

const FILLER_ONLY_RES: RegExp[] = [
  /^i rise today\.?$/i,
  /^i ask unanimous consent[^.?!]*[.?!]?$/i,
  /^i yield( back)?( the floor| the balance of my time)?\.?$/i,
  /^i thank the (?:chair|presiding officer|speaker)\.?$/i,
];

function isFillerOnly(sentence: string): boolean {
  const s = sentence.trim();
  if (!s) return true;
  return FILLER_ONLY_RES.some((re) => re.test(s));
}

/** A bare honorific/abbreviation fragment with no substantive content — must never be shown alone. */
const BARE_FRAGMENT_RE = /^(?:Mr|Mrs|Ms|Miss|Dr|Sen|Rep|Gov|Rev|Jr|Sr|St|No|U\.S|H\.R|S|D)\.?,?$/i;

export function isBareFragment(text: string): boolean {
  return BARE_FRAGMENT_RE.test(text.trim());
}

/**
 * Truncate raw excerpt text at the last sentence-ending punctuation (`.`, `!`, `?`, or a
 * closing quote immediately after one) at or before `maxLen`. Used for CREC excerpt storage
 * so no stored/rendered verbatim text ends mid-word. Falls back to the untouched original
 * when no sentence boundary exists within range — an honestly-short excerpt beats a
 * mid-word cut, never fabricates an ending.
 */
export function truncateAtSentenceBoundary(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const window = t.slice(0, maxLen);
  const sentences = segmentSentences(window);
  if (sentences.length === 0) return t;
  // Drop a possibly-incomplete trailing sentence unless it's the only one we have.
  const complete = sentences.filter((s) => /[.!?"\u201d]$/.test(s));
  const usable = complete.length > 0 ? complete : sentences.slice(0, -1);
  if (usable.length === 0) return t;
  const joined = usable.join(' ').trim();
  return joined.length > 0 ? joined : t;
}

function trimToWordBoundary(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const safe = lastSpace > Math.min(40, maxLen * 0.4) ? slice.slice(0, lastSpace) : slice;
  return `${safe.trimEnd()}\u2026`;
}

/**
 * First SUBSTANTIVE verbatim sentence of `raw`, opener-stripped, entity-decoded,
 * word-boundary trimmed to `maxLen`. Skips pure procedural filler leads. Extractive
 * only — never returns a bare honorific/abbreviation fragment, never paraphrases.
 */
export function leadSummary(raw: string | undefined | null, maxLen = 120): string {
  const cleaned = clean(raw);
  if (!cleaned) return '';

  const sentences = segmentSentences(cleaned);
  if (sentences.length === 0) return trimToWordBoundary(cleaned, maxLen);

  const usable = sentences.filter((s) => !isFillerOnly(s) && !isBareFragment(s) && s.length >= 8);
  const candidate = usable[0] ?? sentences.find((s) => !isBareFragment(s)) ?? cleaned;
  return trimToWordBoundary(candidate, maxLen);
}
