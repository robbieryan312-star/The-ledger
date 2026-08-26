/**
 * Member-news qualification (owner 2026-07-20 / revised 2026-07-21):
 * An item qualifies only if the member is the SUBJECT or is directly QUOTED.
 */
import {
  matchesMemberInText,
  memberNewsMatchNames,
  type LegislatorNewsRow,
  type NewsDisplayMap,
} from './memberNewsMatching';

export type { NewsDisplayMap } from './memberNewsMatching';

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameVariants(
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): string[] {
  return memberNewsMatchNames(leg, displayByBio);
}

/** Comparison-only framing: member used as analogy/foil, not as subject or quote source. */
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
  if (hasDirectMemberQuote(text, leg, displayByBio)) return false;
  if (isMemberHeadlineSubject(text.split('\n')[0] ?? text, leg, displayByBio)) {
    return false;
  }
  return true;
}

/** Direct quote attributed to the member (verbatim speech, not paraphrase). */
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
    const saidThenQuote = new RegExp(
      `\\b${e}\\b[^".]{0,80}\\b(?:said|says|called|wrote|warned|urged|told)\\b[^".]{0,60}["“]`,
      'i',
    );
    const quoteThenSaid = new RegExp(
      `["“][^"”]{8,280}["”][,.]?\\s*(?:${e}|he|she)\\s+\\b(?:said|says|wrote|added|warned|urged|called)\\b`,
      'i',
    );
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
    '(?:calls?|called|backs?|backed|urges?|urged|warns?|warned|rails?|wants?|introduces?|introduced|proposes?|proposed|fails?|failed|effort|plan|says?|said|reacts?)';

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
  for (const label of labels) {
    const e = escapeRe(label);
    if (new RegExp(`\\b${e}['’]s?\\b`, 'i').test(headline)) return true;
  }
  for (const label of labels) {
    const e = escapeRe(label);
    if (new RegExp(`\\|\\s*${e}\\s*$`, 'i').test(headline.trim())) return true;
  }
  return false;
}

/** List-membership / reaction-crowd framing — not subject, not a quote. */
export function isAmongThoseRespondingMention(
  text: string,
  leg: LegislatorNewsRow,
  displayByBio: NewsDisplayMap,
): boolean {
  const names = nameVariants(leg, displayByBio);
  if (names.length === 0) return false;
  const nameAlt = names.map(escapeRe).join('|');
  return new RegExp(
    `\\b(?:${nameAlt})\\b[^.]{0,100}\\bamong those\\b[^.]{0,40}\\brespond`,
    'i',
  ).test(text);
}

/**
 * Qualifies for profile News: subject OR direct quote; never comparison-only
 * or "among those responding" list-membership.
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
  if (isAmongThoseRespondingMention(combined, leg, displayByBio)) {
    return { ok: false, reason: 'among-those-responding-mention' };
  }
  if (hasDirectMemberQuote(combined, leg, displayByBio)) {
    return { ok: true, reason: 'direct-quote' };
  }
  if (isMemberHeadlineSubject(headline, leg, displayByBio)) {
    return { ok: true, reason: 'headline-subject' };
  }
  if (matchesMemberInText(combined, leg, displayByBio)) {
    return { ok: false, reason: 'mention-without-subject-or-quote' };
  }
  return { ok: false, reason: 'no-member-match' };
}
