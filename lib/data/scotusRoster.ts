/**
 * scotusRoster.ts — curated, sourced list of sitting U.S. Supreme Court justices.
 *
 * The nine current justices are NOT in the congress-legislators dataset. This
 * roster is hand-verified against supremecourt.gov biography pages (as of
 * January 2026). Each entry flows through the same OfficeRecord / recency
 * resolver envelope as Congress, governors, and executives.
 */
import { Chamber, OfficeRecord, Party, Source } from '../types';

export const SCOTUS_AS_OF = '2026-01-20';

/** Primary provenance for the SCOTUS roster (Tier 1 — official .gov). */
export const SCOTUS_SOURCE: Source = {
  name: 'Supreme Court of the United States — About the Court',
  url: 'https://www.supremecourt.gov/about/biographies.aspx',
  tier: 'official',
  date: SCOTUS_AS_OF,
  description:
    'Official biographies and appointment records published by supremecourt.gov.',
};

export interface JusticeRecord {
  profileId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: Party;
  title: 'Chief Justice' | 'Associate Justice';
  office: string;
  appointedBy: string;
  appointmentDate: string;
  termStart: string;
  termEnd: string;
  website: string;
  imageUrl?: string;
}

/** Sitting Chief Justice and eight Associate Justices (119th Congress era). */
export const currentJustices: JusticeRecord[] = [
  {
    profileId: 'scotus-roberts',
    name: 'John G. Roberts Jr.',
    firstName: 'John',
    lastName: 'Roberts',
    party: 'Republican',
    title: 'Chief Justice',
    office: 'Chief Justice of the United States',
    appointedBy: 'George W. Bush',
    appointmentDate: '2005-09-29',
    termStart: '2005-09-29',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#roberts',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/roberts/roberts.jpg',
  },
  {
    profileId: 'scotus-thomas',
    name: 'Clarence Thomas',
    firstName: 'Clarence',
    lastName: 'Thomas',
    party: 'Republican',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'George H.W. Bush',
    appointmentDate: '1991-10-23',
    termStart: '1991-10-23',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#thomas',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/thomas/thomas.jpg',
  },
  {
    profileId: 'scotus-alito',
    name: 'Samuel A. Alito Jr.',
    firstName: 'Samuel',
    lastName: 'Alito',
    party: 'Republican',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'George W. Bush',
    appointmentDate: '2006-01-31',
    termStart: '2006-01-31',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#alito',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/alito/alito.jpg',
  },
  {
    profileId: 'scotus-sotomayor',
    name: 'Sonia Sotomayor',
    firstName: 'Sonia',
    lastName: 'Sotomayor',
    party: 'Democrat',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Barack Obama',
    appointmentDate: '2009-08-08',
    termStart: '2009-08-08',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#sotomayor',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/sotomayor/sotomayor.jpg',
  },
  {
    profileId: 'scotus-kagan',
    name: 'Elena Kagan',
    firstName: 'Elena',
    lastName: 'Kagan',
    party: 'Democrat',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Barack Obama',
    appointmentDate: '2010-08-07',
    termStart: '2010-08-07',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#kagan',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/kagan/kagan.jpg',
  },
  {
    profileId: 'scotus-gorsuch',
    name: 'Neil M. Gorsuch',
    firstName: 'Neil',
    lastName: 'Gorsuch',
    party: 'Republican',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Donald J. Trump',
    appointmentDate: '2017-04-10',
    termStart: '2017-04-10',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#gorsuch',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/gorsuch/gorsuch.jpg',
  },
  {
    profileId: 'scotus-kavanaugh',
    name: 'Brett M. Kavanaugh',
    firstName: 'Brett',
    lastName: 'Kavanaugh',
    party: 'Republican',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Donald J. Trump',
    appointmentDate: '2018-10-06',
    termStart: '2018-10-06',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#kavanaugh',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/kavanaugh/kavanaugh.jpg',
  },
  {
    profileId: 'scotus-barrett',
    name: 'Amy Coney Barrett',
    firstName: 'Amy',
    lastName: 'Barrett',
    party: 'Republican',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Donald J. Trump',
    appointmentDate: '2020-10-27',
    termStart: '2020-10-27',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#barrett',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/barrett/barrett.jpg',
  },
  {
    profileId: 'scotus-jackson',
    name: 'Ketanji Brown Jackson',
    firstName: 'Ketanji',
    lastName: 'Jackson',
    party: 'Democrat',
    title: 'Associate Justice',
    office: 'Associate Justice of the Supreme Court',
    appointedBy: 'Joe Biden',
    appointmentDate: '2022-06-30',
    termStart: '2022-06-30',
    termEnd: '2099-12-31',
    website: 'https://www.supremecourt.gov/about/biographies.aspx#jackson',
    imageUrl: 'https://www.supremecourt.gov/about/biographies/jackson/jackson.jpg',
  },
];

const byProfileId = new Map<string, JusticeRecord>(
  currentJustices.map((j) => [j.profileId, j]),
);

export function findJusticeByProfileId(profileId: string): JusticeRecord | undefined {
  return byProfileId.get(profileId);
}

export function justiceOfficeRecord(j: JusticeRecord): OfficeRecord {
  return {
    chamber: 'scotus' as Chamber,
    office: j.office,
    state: 'United States',
    stateCode: 'US',
    party: j.party,
    termStart: j.termStart,
    termEnd: j.termEnd,
    source: { ...SCOTUS_SOURCE, url: j.website, date: SCOTUS_AS_OF },
    asOf: SCOTUS_AS_OF,
  };
}
