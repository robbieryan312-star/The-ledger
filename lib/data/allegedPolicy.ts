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
 * verbatim quote, source URL, and outcome.
 */
export function validateAllegedControversy(item: {
  isVerified: boolean;
  status?: string;
  verbatimQuote?: string;
  outcome?: string;
  sources?: Array<{ url?: string; tier?: string }>;
  paraphrase?: boolean;
}): AllegedControversyCheck {
  const reasons: string[] = [];
  const hasAllegedSignal =
    item.status === 'Alleged' || (item.sources ?? []).some((s) => s.tier === 'alleged');
  if (item.isVerified && !hasAllegedSignal) return { ok: true, reasons: [] };
  if (item.isVerified && hasAllegedSignal) {
    reasons.push('alleged-signaled controversy cannot be verified');
  }
  const quote = (item.verbatimQuote ?? '').trim();
  if (!quote) reasons.push('missing verbatimQuote');
  if (item.paraphrase === true) reasons.push('paraphrased claim text');
  const hasUrl = (item.sources ?? []).some((s) => Boolean((s.url ?? '').trim()));
  if (!hasUrl) reasons.push('missing source URL');
  if (!(item.outcome ?? '').trim()) reasons.push('missing outcome');
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
