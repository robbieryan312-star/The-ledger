/**
 * Member-news qualification (owner 2026-07-20):
 * An item qualifies only if the member is the SUBJECT or is directly QUOTED.
 * Comparison-only mentions (e.g. "Is he Bernie Sanders or Donald Trump?") do NOT qualify.
 * A direct member quote DOES qualify even in a multi-politician reaction piece.
 */
import {
  matchesMemberInText,
  memberNewsMatchNames,
  type LegislatorNewsRow,
} from './memberNewsMatching';

export type NewsDisplayMap = Map<
  string,
  { name: string; firstName: string; lastName: string }
>;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameVariants(
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): string[] {
  return memberNewsMatchNames(leg, displayByBio);
}

/**
 * Comparison-only framing: member used as analogy/foil, not as subject or quote source.
 * Frozen bad example: Platner "Is he Bernie Sanders or Donald Trump?"
 */
export function isComparisonOnlyMention(
  text: string,
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): boolean {
  const names = nameVariants(leg, displayByBio);
  if (names.length === 0) return false;
  const nameAlt = names.map(escapeRe).join('|');
  const comparisonRes = [
    new RegExp(`\\bIs he\\b[^?]{0,80}\\b(?:${nameAlt})\\b`, 'i'),
    new RegExp(`\\becho of both\\b[^.]{0,120}\\b(?:${nameAlt})\\b`, 'i'),
    new RegExp(
      `\\blike\\b[^.]{0,40}\\b(?:${nameAlt})\\b[^.]{0,40}\\b(?:and|,)\\b`,
      'i',
    ),
    new RegExp(
      `\\b(?:${nameAlt})\\b[^.]{0,60}\\bor\\b[^.]{0,40}\\bDonald Trump\\b`,
      'i',
    ),
    new RegExp(
      `\\bDonald Trump\\b[^.]{0,60}\\bor\\b[^.]{0,40}\\b(?:${nameAlt})\\b`,
      'i',
    ),
  ];
  const hasComparison = comparisonRes.some((re) => re.test(text));
  if (!hasComparison) return false;
  // If they are also directly quoted, not comparison-only.
  if (hasDirectMemberQuote(text, leg, displayByBio)) return false;
  // If headline treats them as grammatical subject of an action, not comparison-only.
  if (isMemberHeadlineSubject(text.split('\n')[0] ?? text, leg, displayByBio)) {
    return false;
  }
  return true;
}

/**
 * Direct quote attributed to the member (verbatim speech, not paraphrase).
 */
export function hasDirectMemberQuote(
  text: string,
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): boolean {
  const names = nameVariants(leg, displayByBio);
  const ln = leg.lastName?.trim() || '';
  const labels = [
    ...names,
    ...(ln
      ? [`Sen. ${ln}`, `Senator ${ln}`, `Rep. ${ln}`, `Representative ${ln}`]
      : []),
  ];
  for (const label of labels) {
    const e = escapeRe(label);
    // Name said/says/called/wrote … "quote"
    const saidThenQuote = new RegExp(
      `\\b${e}\\b[^".]{0,80}\\b(?:said|says|called|wrote|warned|urged|told)\\b[^".]{0,60}["“]`,
      'i',
    );
    // "quote," Name said
    const quoteThenSaid = new RegExp(
      `["“][^"”]{8,280}["”][,.]?\\s*(?:${e}|he|she)\\s+\\b(?:said|says|wrote|added)\\b`,
      'i',
    );
    // He/She said on X: "… after naming member in prior clause (same paragraph window)
    const heSaidOnPlatform = new RegExp(
      `\\b${e}\\b[^.]{0,160}\\b(?:He|She)\\s+said\\s+on\\s+(?:X|Twitter|Truth Social)\\b[^".]{0,40}["“]`,
      'i',
    );
    if (saidThenQuote.test(text) || quoteThenSaid.test(text) || heSaidOnPlatform.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Member is the headline/subject actor (not a comparison foil).
 * Requires a mention match plus an adjacent subject-action cue in the headline.
 */
export function isMemberHeadlineSubject(
  headline: string,
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): boolean {
  if (/^\s*Is he\b/i.test(headline.trim())) return false;
  const names = nameVariants(leg, displayByBio);
  const ln = leg.lastName?.trim() || '';
  const labels = [
    ...names,
    ...(ln ? [`Sen. ${ln}`, `Senator ${ln}`] : []),
  ];
  const action =
    '(?:calls?|called|backs?|backed|urges?|urged|warns?|warned|rails?|wants?|introduces?|introduced|proposes?|proposed|fails?|failed|effort|plan|says?|said|reacts?|among those)';

  // Bare last-name after a lead quote: "'…': Sanders warns …" (before full-name gate)
  if (ln) {
    const e = escapeRe(ln);
    const leadQuoteThenLn = new RegExp(
      `^[\\s]*["'\u201c\u2018][^"'\u201d\u2019]{3,}["'\u201d\u2019]\\s*:\\s*${e}\\b`,
      'i',
    );
    if (
      leadQuoteThenLn.test(headline.trim()) &&
      new RegExp(`\\b${e}\\b[^.]{0,40}\\b${action}\\b`, 'i').test(headline)
    ) {
      return true;
    }
  }

  if (!matchesMemberInText(headline, leg, displayByBio)) return false;
  for (const label of labels) {
    const e = escapeRe(label);
    if (new RegExp(`\\b${e}\\b[^.]{0,40}\\b${action}\\b`, 'i').test(headline)) {
      return true;
    }
    if (new RegExp(`\\b${action}\\b[^.]{0,40}\\b${e}\\b`, 'i').test(headline)) {
      return true;
    }
  }
  // Possessive subject: "Bernie Sanders' plan" / "Sanders' effort"
  for (const label of labels) {
    const e = escapeRe(label);
    if (new RegExp(`\\b${e}['’]s?\\b`, 'i').test(headline)) return true;
  }
  // Op-ed byline: "… | Bernie Sanders"
  for (const label of labels) {
    const e = escapeRe(label);
    if (new RegExp(`\\|\\s*${e}\\s*$`, 'i').test(headline.trim())) return true;
  }
  return false;
}

/**
 * Qualifies for profile News: subject OR direct quote; never comparison-only.
 */
export function qualifiesMemberNewsItem(
  headline: string,
  bodyOrSummary: string,
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): { ok: boolean; reason: string } {
  const combined = `${headline}\n${bodyOrSummary}`;
  if (isComparisonOnlyMention(combined, leg, displayByBio)) {
    return { ok: false, reason: 'comparison-only-mention' };
  }
  if (hasDirectMemberQuote(combined, leg, displayByBio)) {
    return { ok: true, reason: 'direct-quote' };
  }
  if (isMemberHeadlineSubject(headline, leg, displayByBio)) {
    return { ok: true, reason: 'headline-subject' };
  }
  // Body names them only as releaser/passerby without quote or subject headline
  if (matchesMemberInText(combined, leg, displayByBio)) {
    return { ok: false, reason: 'mention-without-subject-or-quote' };
  }
  return { ok: false, reason: 'no-member-match' };
}
