interface ScheduleAFailure {
  bioguideId: string;
  reason: string;
}

export function preserveScheduleARowOnFetchFailure<T>(args: {
  byBioguideId: Record<string, T>;
  priorByBioguideId?: Record<string, T>;
  bioguideId: string;
  failures: ScheduleAFailure[];
  reason: string;
}): boolean {
  const prior = args.priorByBioguideId?.[args.bioguideId];
  const preserved = prior != null;
  if (preserved) {
    args.byBioguideId[args.bioguideId] = prior;
  }
  args.failures.push({
    bioguideId: args.bioguideId,
    reason: `fetch-failed: ${args.reason}${preserved ? ' (prior Schedule A row preserved)' : ''}`,
  });
  return preserved;
}
