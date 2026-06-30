import type { CampaignPromise } from '../types';

/**
 * Derive promise status from said/did evidence when status was hand-typed incorrectly.
 */
export function derivePromiseStatus(promise: CampaignPromise): CampaignPromise['status'] {
  const didText = (promise.did?.summary ?? promise.evidence ?? '').toLowerCase();
  const saidDate = promise.said?.date;
  const didDate = promise.did?.date;

  if (didDate && didText) {
    const completedAction =
      /\b(cosponsored|co-sponsored|voted yea|signed|confirmed|enacted)\b/.test(didText);
    const legislativeOnly =
      /\b(introduced|reintroduced)\b/.test(didText) &&
      !/\bvoted yea\b/.test(didText) &&
      /\b(not pass|failed|without passing|none have passed|has not passed)\b/.test(didText);
    const failedAction =
      /\b(failed|did not pass|blocked|repeal attempt failed)\b/.test(didText);

    if (legislativeOnly) return 'In Progress';
    if (completedAction && !failedAction) return 'Kept';
    if (failedAction && promise.status === 'In Progress') return 'Broken';
  }

  if (saidDate && !didDate && promise.status === 'Kept') {
    return 'In Progress';
  }

  return promise.status;
}

export function withDerivedPromiseStatuses(
  promises: CampaignPromise[],
): CampaignPromise[] {
  return promises.map((p) => ({
    ...p,
    status: derivePromiseStatus(p),
  }));
}
