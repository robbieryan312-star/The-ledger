/**
 * api.data.gov family key chain for GovInfo (api.govinfo.gov).
 * Same order everywhere: GOVINFO → DATA_GOV → FEC → CONGRESS.
 * Callers must log `sourceEnvVar` (the NAME only) — never the key value.
 */
export const GOVINFO_API_KEY_CHAIN = [
  'GOVINFO_API_KEY',
  'DATA_GOV_API_KEY',
  'FEC_API_KEY',
  'CONGRESS_API_KEY',
] as const;

export type GovInfoApiKeyEnvVar = (typeof GOVINFO_API_KEY_CHAIN)[number];

export interface ResolvedGovInfoApiKey {
  /** Trimmed key value, or '' when none in the chain are set. */
  key: string;
  /** Env-var NAME that supplied the key, or null when unresolved. Never log `key`. */
  sourceEnvVar: GovInfoApiKeyEnvVar | null;
}

/** Resolve GovInfo API key via the shared api.data.gov family chain. */
export function resolveGovInfoApiKey(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedGovInfoApiKey {
  for (const name of GOVINFO_API_KEY_CHAIN) {
    const val = (env[name] ?? '').trim();
    if (val) return { key: val, sourceEnvVar: name };
  }
  return { key: '', sourceEnvVar: null };
}
