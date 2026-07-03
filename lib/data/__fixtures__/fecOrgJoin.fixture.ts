/**
 * Build-gated fixtures for FEC org→topic join regression tests.
 * APPEND-ONLY — never reset. Verbatim from the S000033 pilot Schedule A corpus.
 */
import type { FecScheduleAContributor } from '../fecClient';

export interface FecOrgJoinFixtureCase {
  label: string;
  contributor: FecScheduleAContributor;
}

/** Individual donors that MUST NOT produce org→topic matches (surname/occupation collision). */
export const ORG_JOIN_KNOWN_BAD: FecOrgJoinFixtureCase[] = [
  {
    label: 'NORTHROP, ANDREA → Defense contractor (surname collision)',
    contributor: {
      name: 'NORTHROP, ANDREA',
      amount: 3500,
      date: '2025-04-03',
      employer: 'PATRIOT GROWTH INSURANCE SERVICES',
      occupation: 'INSURANCE AGENT',
      committeeId: 'C00411330',
    },
  },
  {
    label: 'PURCELL, LENDR → civil-liberties (occupation TEACHER/NONPROFIT collision)',
    contributor: {
      name: 'PURCELL, LENDR',
      amount: 2500,
      date: '2025-05-14',
      employer: 'SELF EMPLOYED',
      occupation: 'TEACHER/NONPROFIT',
      committeeId: 'C00411330',
    },
  },
];

/** Curated real-org/PAC contributor that MUST still resolve via the registry. */
export const ORG_JOIN_KNOWN_GOOD: FecOrgJoinFixtureCase[] = [
  {
    label: 'ACTBLUE LLC (curated conduit PAC)',
    contributor: {
      name: 'ACTBLUE LLC',
      amount: 5000,
      date: '2025-03-01',
      committeeId: 'C00411330',
    },
  },
];
