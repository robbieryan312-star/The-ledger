/**
 * Report SET/EMPTY for API keys — never prints secret values.
 * Usage: npm run verify:agent-keys
 */
import { loadEnvLocal } from './lib/ingest-utils';
import { GOVINFO_API_KEY_CHAIN, resolveGovInfoApiKey } from './lib/govinfoApiKey';

/** Retired — never required; listed only for SET/EMPTY visibility if present. */
const RETIRED_KEYS = ['PROPUBLICA_CONGRESS_KEY'] as const;

const AGENT_KEYS = [
  'FEC_API_KEY',
  'CONGRESS_API_KEY',
  'CENSUS_API_KEY',
  'DATA_GOV_API_KEY',
  'GOVINFO_API_KEY',
  'BEA_API_KEY',
  'LEGISCAN_API_KEY',
  'OPENSTATES_API_KEY',
  'NEWSAPI_KEY',
  'COURTLISTENER_API_KEY',
  'SAM_API_KEY',
] as const;

async function main(): Promise<void> {
  await loadEnvLocal();
  let set = 0;
  for (const key of AGENT_KEYS) {
    const val = process.env[key]?.trim() ?? '';
    const status = val ? `SET (${val.length} chars)` : 'EMPTY';
    if (val) set += 1;
    console.log(`${key}: ${status}`);
  }
  for (const key of RETIRED_KEYS) {
    const val = process.env[key]?.trim() ?? '';
    console.log(`${key}: ${val ? 'SET (RETIRED — ignore)' : 'EMPTY (RETIRED)'}`);
  }

  // Document api.data.gov family chain for GovInfo — report which NAME would resolve (never value).
  const govinfo = resolveGovInfoApiKey();
  console.log(
    `\nGovInfo api.data.gov chain (${GOVINFO_API_KEY_CHAIN.join(' → ')}): ` +
      (govinfo.sourceEnvVar
        ? `would resolve via ${govinfo.sourceEnvVar}`
        : 'unresolved (all EMPTY)'),
  );

  console.log(`\n${set}/${AGENT_KEYS.length} keys available in this session`);
  if (set === 0) {
    console.warn(
      'No keys found. Add Runtime Secrets in Cursor Cloud Agents dashboard or .env.local (gitignored).',
    );
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
