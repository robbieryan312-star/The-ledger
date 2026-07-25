/**
 * Pure evaluator: collection output changes require a BATCH_SCALING.md touch in the same diff.
 * Used by the build-gated guard and fixture unit tests (logic shared — not duplicated).
 */
import {
  BATCH_SCALING_PATH,
  COLLECTION_DATA_EXACT_FILES,
  COLLECTION_DATA_PATH_PREFIXES,
} from './__fixtures__/collectionImprovementGuard.fixture';

export type CollectionImprovementVerdict = 'skip' | 'pass' | 'fail';

export interface CollectionImprovementResult {
  verdict: CollectionImprovementVerdict;
  collectionDataFiles: string[];
  touchedBatchScaling: boolean;
  reason: string;
}

export function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isCollectionDataPath(filePath: string): boolean {
  const n = normalizeRepoPath(filePath);
  if (n.endsWith('.ts') || n.endsWith('.tsx') || n.endsWith('.js') || n.endsWith('.mjs')) {
    return false;
  }
  if ((COLLECTION_DATA_EXACT_FILES as readonly string[]).includes(n)) return true;
  return COLLECTION_DATA_PATH_PREFIXES.some((prefix) => n.startsWith(prefix));
}

export function evaluateCollectionImprovementCompliance(
  changedFiles: readonly string[],
): CollectionImprovementResult {
  const normalized = changedFiles.map(normalizeRepoPath);
  const collectionDataFiles = normalized.filter(isCollectionDataPath);
  const touchedBatchScaling = normalized.includes(BATCH_SCALING_PATH);

  if (collectionDataFiles.length === 0) {
    return {
      verdict: 'skip',
      collectionDataFiles,
      touchedBatchScaling,
      reason: 'no collection data under lib/data/generated/{profiles,countyMap,newsNational,slices}',
    };
  }

  if (touchedBatchScaling) {
    return {
      verdict: 'pass',
      collectionDataFiles,
      touchedBatchScaling,
      reason: `${collectionDataFiles.length} collection file(s) + ${BATCH_SCALING_PATH} in same diff`,
    };
  }

  return {
    verdict: 'fail',
    collectionDataFiles,
    touchedBatchScaling,
    reason:
      `collection data changed without ${BATCH_SCALING_PATH} in the same diff vs main: ` +
      collectionDataFiles.join(', '),
  };
}
