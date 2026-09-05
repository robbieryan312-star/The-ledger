/**
 * Alleged-policy validators — canonical rules in `.cursor/rules/ledger-data-policy.mdc`.
 */
import type { Controversy } from '@/lib/types';
import { ALLEGED_BANNED_SECTIONS } from './__fixtures__/allegedPolicyGuard.fixture';

export { ALLEGED_BANNED_SECTIONS };

const TIER_ALLEGED_RE = /"tier"\s*:\s*"alleged"/;

/** True when JSON text for a banned section contains an alleged tier. */
export function bannedSectionHasAllegedTier(jsonText: string): boolean {
  return TIER_ALLEGED_RE.test(jsonText);
}

export interface AllegedControversyCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * Contested person-claims on Controversies (`isVerified === false`) must carry:
 * verbatim quote, source URL, outcome, and 2+ independent named sources.
 */
export function validateAllegedControversy(item: {
  isVerified: boolean;
  verbatimQuote?: string;
  outcome?: string;
  sources?: Array<{ name?: string; url?: string }>;
  reportedByOutletCount?: number;
  paraphrase?: boolean;
}): AllegedControversyCheck {
  if (item.isVerified) return { ok: true, reasons: [] };
  const reasons: string[] = [];
  const quote = (item.verbatimQuote ?? '').trim();
  if (!quote) reasons.push('missing verbatimQuote');
  if (item.paraphrase === true) reasons.push('paraphrased claim text');
  const hasUrl = (item.sources ?? []).some((s) => Boolean((s.url ?? '').trim()));
  if (!hasUrl) reasons.push('missing source URL');
  if (!(item.outcome ?? '').trim()) reasons.push('missing outcome');
  if (typeof item.reportedByOutletCount !== 'number') {
    reasons.push('missing reportedByOutletCount');
  } else if (item.reportedByOutletCount < 2) {
    reasons.push('reportedByOutletCount below 2');
  }
  const independentSources = new Set(
    (item.sources ?? [])
      .filter((s) => Boolean((s.url ?? '').trim()))
      .map((s) => s.name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  if (independentSources.size < 2) reasons.push('fewer than 2 independent source names');
  return { ok: reasons.length === 0, reasons };
}

export function validateAllegedControversies(items: Controversy[]): AllegedControversyCheck {
  const reasons: string[] = [];
  for (const item of items) {
    const r = validateAllegedControversy(item);
    if (!r.ok) reasons.push(`${item.id}: ${r.reasons.join('; ')}`);
  }
  return { ok: reasons.length === 0, reasons };
}
