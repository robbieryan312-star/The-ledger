/** Frozen bad example: a scoped Schedule A refresh failure omitted the targeted prior row. */
export const FEC_SCHEDULE_A_KNOWN_BAD_SCOPED_FAILURE_OVERWRITE = {
  targetBioguideId: 'S000033',
  priorByBioguideId: {
    S000033: {
      bioguideId: 'S000033',
      fecCandidateId: 'S4VT00033',
      committeeIds: ['C00577130'],
      contributors: [
        {
          name: 'NATIONAL NURSES UNITED PAC',
          amount: 2500,
          date: '2024-06-01',
          committeeId: 'C00577130',
        },
      ],
      source: {
        name: 'Federal Election Commission (OpenFEC)',
        url: 'https://www.fec.gov/data/',
        tier: 'official',
      },
      asOf: '2026-08-29',
      fecUrl: 'https://www.fec.gov/data/candidate/S4VT00033/',
    },
  },
  outgoingByBioguideId: {},
  thrownReason: 'OpenFEC request failed: HTTP 500 Internal Server Error',
} as const;

/** Frozen good counter-example: fetch failure preserves the prior targeted row. */
export const FEC_SCHEDULE_A_KNOWN_GOOD_SCOPED_FAILURE_PRESERVE = {
  targetBioguideId: 'S000033',
  expectedContributorName: 'NATIONAL NURSES UNITED PAC',
  expectedFailurePrefix: 'fetch-failed: OpenFEC request failed',
} as const;
