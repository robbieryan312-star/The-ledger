interface ScheduleAFailure {
  bioguideId: string;
  reason: string;
}

export function seedScheduleARows<T>(priorByBioguideId?: Record<string, T>): Record<string, T> {
  return { ...(priorByBioguideId ?? {}) };
}

export function preserveScheduleARowOnFailure<T>(args: {
  byBioguideId: Record<string, T>;
  priorByBioguideId?: Record<string, T>;
  bioguideId: string;
  failures: ScheduleAFailure[];
  reason: string;
  fetchFailed?: boolean;
}): boolean {
  const prior = args.priorByBioguideId?.[args.bioguideId];
  const preserved = prior != null;
  if (preserved) {
    args.byBioguideId[args.bioguideId] = prior;
  }
  args.failures.push({
    bioguideId: args.bioguideId,
    reason: `${args.fetchFailed ? 'fetch-failed: ' : ''}${args.reason}${
      preserved ? ' (prior Schedule A row preserved)' : ''
    }`,
  });
  return preserved;
}
