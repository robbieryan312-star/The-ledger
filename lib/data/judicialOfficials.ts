/**
 * judicialOfficials.ts — featured demo profiles for sitting U.S. Supreme Court justices.
 * Office labels resolve via scotusRoster.ts (supremecourt.gov). No legislative voting
 * records — judicial opinions are tracked as sourced actions, not roll-call votes.
 */
import { EvidenceItem, Issue, Politician, Source } from '../types';
import { currentJustices, JusticeRecord, SCOTUS_AS_OF, SCOTUS_SOURCE } from './scotusRoster';

const SCOTUS: Source = {
  ...SCOTUS_SOURCE,
  description: 'Official Supreme Court biographies, opinions, and appointment records',
};

const JUDICIAL_FINANCE = {
  totalRaised: 0,
  totalSpent: 0,
  cashOnHand: 0,
  cycle: 'N/A — judicial office',
  donors: [],
  topIndustries: [],
  lobbyistMoney: [],
  foreignPAC: [],
  individualDonations: 0,
  pacDonations: 0,
  selfFunding: 0,
};

const JUDICIAL_CONSISTENCY = {
  overallScore: 0,
  campaignPromises: [],
  partyLineVotePercentage: 0,
  lobbyistAlignmentPercentage: 0,
  termConsistency: [],
};

interface JusticeProfileSpec {
  appointmentEvidence: EvidenceItem;
  issues: Issue[];
}

function judicialProfile(j: JusticeRecord, spec: JusticeProfileSpec): Politician {
  const titleLabel = j.title === 'Chief Justice' ? 'Chief Justice' : 'Associate Justice';
  return {
    id: j.profileId,
    name: j.name,
    firstName: j.firstName,
    lastName: j.lastName,
    party: j.party,
    state: 'United States',
    stateCode: 'US',
    chamber: 'scotus',
    branch: 'judicial',
    level: 'federal',
    imageUrl: j.imageUrl,
    website: j.website,
    bio: `${j.name} is ${titleLabel === 'Chief Justice' ? 'the' : 'an'} ${titleLabel} of the United States, appointed by President ${j.appointedBy} and confirmed by the Senate (${j.appointmentDate.slice(0, 4)}). Supreme Court justices are appointed for life during good behavior; they do not stand for election and have no legislative voting record.`,
    inOffice: true,
    termStart: j.termStart,
    termEnd: j.termEnd,
    votingRecord: [],
    campaignFinance: JUDICIAL_FINANCE,
    stockTrades: [],
    consistency: JUDICIAL_CONSISTENCY,
    topIssues: [
      {
        name: 'Appointment & Office',
        position: `${titleLabel}; appointed ${j.appointmentDate.slice(0, 4)}`,
        detail: `Confirmed to the Supreme Court by the U.S. Senate. Current office verified against supremecourt.gov as of ${SCOTUS_AS_OF}.`,
        category: 'Judiciary',
        statement:
          'Supreme Court justices are appointed by the President and confirmed by the Senate; they do not cast votes in Congress.',
        evidence: [spec.appointmentEvidence],
      },
      ...spec.issues,
      {
        name: 'Legislative Voting Record',
        position: 'Not applicable — judicial office',
        detail:
          'No verified congressional voting record is available for this profile. Supreme Court decisions are published as opinions, not roll-call votes.',
        category: 'Judiciary',
        statement: 'No verified legislative voting record available for a sitting justice.',
        evidence: [],
      },
    ],
    controversies: [],
    news: [],
  };
}

function appt(j: JusticeRecord): EvidenceItem {
  return {
    type: 'action',
    description: `Appointed ${j.title === 'Chief Justice' ? 'Chief Justice' : 'Associate Justice'} by President ${j.appointedBy}; Senate confirmation recorded ${j.appointmentDate}.`,
    date: j.appointmentDate,
    source: { ...SCOTUS, url: j.website, date: SCOTUS_AS_OF },
  };
}

function opinion(
  description: string,
  date: string,
  url: string,
): EvidenceItem {
  return {
    type: 'action',
    description,
    date,
    source: { ...SCOTUS, url, date },
  };
}

export const judicialOfficials: Politician[] = [
  judicialProfile(currentJustices[0], {
    appointmentEvidence: appt(currentJustices[0]),
    issues: [
      {
        name: 'Federal Commerce Power',
        position: 'Narrowed ACA Medicaid expansion in 2012 ruling',
        detail: 'Authored the controlling opinion in NFIB v. Sebelius (2012) on the Affordable Care Act individual mandate.',
        category: 'Healthcare',
        evidence: [
          opinion(
            'Authored opinion in National Federation of Independent Business v. Sebelius — held the individual mandate was a tax within Congress\'s taxing power; limited Medicaid expansion coercion.',
            '2012-06-28',
            'https://www.supremecourt.gov/opinions/11pdf/11-393c3a2a-8b01-4e0d-b1a6-4eaf36935ba6.pdf',
          ),
        ],
      },
      {
        name: 'Voting Rights',
        position: 'Upheld preclearance framework limits in Shelby County',
        detail: 'Joined the majority in Shelby County v. Holder (2013) regarding Section 4 of the Voting Rights Act.',
        category: 'Civil Rights',
        evidence: [
          opinion(
            'Joined majority in Shelby County v. Holder — held Section 4(b) coverage formula unconstitutional; Section 5 preclearance framework affected.',
            '2013-06-25',
            'https://www.supremecourt.gov/opinions/12pdf/12-96_6k47.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[1], {
    appointmentEvidence: appt(currentJustices[1]),
    issues: [
      {
        name: 'Second Amendment',
        position: 'Individual right to bear arms',
        detail: 'Long record emphasizing originalist interpretation of constitutional text.',
        category: 'Gun Policy',
        evidence: [
          opinion(
            'Authored majority opinion in New York State Rifle & Pistol Association v. Bruen — held New York\'s proper-cause requirement for concealed carry violated the Second Amendment.',
            '2022-06-23',
            'https://www.supremecourt.gov/opinions/21pdf/20-843_7j80.pdf',
          ),
        ],
      },
      {
        name: 'Administrative Law',
        position: 'Limits on agency deference',
        detail: 'Joined opinions narrowing judicial deference to federal agency interpretations.',
        category: 'Government',
        evidence: [
          opinion(
            'Joined majority in West Virginia v. EPA — held EPA lacked clear congressional authorization for the generation-shifting approach in the Clean Power Plan rule.',
            '2022-06-30',
            'https://www.supremecourt.gov/opinions/21pdf/20-1530_n758.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[2], {
    appointmentEvidence: appt(currentJustices[2]),
    issues: [
      {
        name: 'Abortion Regulation',
        position: 'Overturned federal constitutional right in Dobbs',
        detail: 'Authored the majority opinion returning abortion regulation to the states.',
        category: 'Healthcare',
        evidence: [
          opinion(
            'Authored majority opinion in Dobbs v. Jackson Women\'s Health Organization — held the Constitution does not confer a right to abortion; overruled Roe v. Wade and Planned Parenthood v. Casey.',
            '2022-06-24',
            'https://www.supremecourt.gov/opinions/21pdf/19-1392_6j37.pdf',
          ),
        ],
      },
      {
        name: 'Free Exercise & Public Health',
        position: 'Religious exemptions in COVID-era orders',
        detail: 'Joined rulings on free exercise challenges to public-health restrictions.',
        category: 'Civil Rights',
        evidence: [
          opinion(
            'Joined per curiam order in Roman Catholic Diocese of Brooklyn v. Cuomo — granted injunctive relief against New York COVID capacity limits on houses of worship.',
            '2020-11-25',
            'https://www.supremecourt.gov/opinions/20pdf/20a87_3fb4.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[3], {
    appointmentEvidence: appt(currentJustices[3]),
    issues: [
      {
        name: 'Affirmative Action',
        position: 'Dissented in Harvard/UNC race-conscious admissions cases',
        detail: 'Public dissents on race-conscious university admissions policies.',
        category: 'Education',
        evidence: [
          opinion(
            'Dissented in Students for Fair Admissions v. Harvard — majority held race-conscious admissions programs violated the Equal Protection Clause.',
            '2023-06-29',
            'https://www.supremecourt.gov/opinions/22pdf/20-1199_hgdj.pdf',
          ),
        ],
      },
      {
        name: 'Criminal Procedure',
        position: 'Defendant-rights opinions in search and counsel cases',
        detail: 'Record includes opinions on Fourth and Sixth Amendment protections.',
        category: 'Criminal Justice',
        evidence: [
          opinion(
            'Authored majority in J.D.B. v. North Carolina — held a child\'s age is relevant to the Miranda custody analysis.',
            '2011-06-16',
            'https://www.supremecourt.gov/opinions/10pdf/09-11121.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[4], {
    appointmentEvidence: appt(currentJustices[4]),
    issues: [
      {
        name: 'Campaign Finance',
        position: 'Upheld independent expenditure limits framework',
        detail: 'Participated in major campaign-finance jurisprudence.',
        category: 'Elections',
        evidence: [
          opinion(
            'Joined majority in Citizens United v. FEC — held independent corporate political expenditures are protected speech under the First Amendment.',
            '2010-01-21',
            'https://www.supremecourt.gov/opinions/08pdf/08-205.pdf',
          ),
        ],
      },
      {
        name: 'Federal Preemption',
        position: 'Narrowed state immigration enforcement in Arizona v. U.S.',
        detail: 'Authored opinion on federal preemption of state immigration laws.',
        category: 'Immigration',
        evidence: [
          opinion(
            'Authored majority in Arizona v. United States — held several provisions of Arizona S.B. 1070 were preempted by federal immigration law.',
            '2012-06-25',
            'https://www.supremecourt.gov/opinions/11pdf/11-182b8e0a.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[5], {
    appointmentEvidence: appt(currentJustices[5]),
    issues: [
      {
        name: 'Tribal Sovereignty',
        position: 'McGirt v. Oklahoma jurisdictional ruling',
        detail: 'Authored major opinion on tribal reservation boundaries and criminal jurisdiction.',
        category: 'Native Affairs',
        evidence: [
          opinion(
            'Authored majority in McGirt v. Oklahoma — held much of eastern Oklahoma remains Muscogee (Creek) Nation reservation for Major Crimes Act purposes.',
            '2020-07-09',
            'https://www.supremecourt.gov/opinions/19pdf/18-9526_9okb.pdf',
          ),
        ],
      },
      {
        name: 'Religious Liberty',
        position: 'Free exercise protections for religious employers',
        detail: 'Joined opinions on ministerial exception and religious employer rights.',
        category: 'Civil Rights',
        evidence: [
          opinion(
            'Joined majority in Our Lady of Guadalupe School v. Morrissey-Berru — applied ministerial exception to dismiss employment discrimination claims against religious schools.',
            '2020-07-08',
            'https://www.supremecourt.gov/opinions/19pdf/19-267_3d9g.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[6], {
    appointmentEvidence: appt(currentJustices[6]),
    issues: [
      {
        name: 'Executive Immunity',
        position: 'Presidential immunity framework in Trump v. United States',
        detail: 'Joined the Court\'s 2024 ruling on presidential immunity from criminal prosecution.',
        category: 'Government',
        evidence: [
          opinion(
            'Joined majority in Trump v. United States — held former presidents have absolute immunity for core constitutional powers and presumptive immunity for official acts.',
            '2024-07-01',
            'https://www.supremecourt.gov/opinions/23pdf/23-939_e2pg.pdf',
          ),
        ],
      },
      {
        name: 'Abortion Regulation',
        position: 'Joined Dobbs majority',
        detail: 'Joined the 2022 decision overturning Roe v. Wade.',
        category: 'Healthcare',
        evidence: [
          opinion(
            'Joined majority in Dobbs v. Jackson Women\'s Health Organization.',
            '2022-06-24',
            'https://www.supremecourt.gov/opinions/21pdf/19-1392_6j37.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[7], {
    appointmentEvidence: appt(currentJustices[7]),
    issues: [
      {
        name: 'Religious Free Exercise',
        position: 'COVID-era religious gathering rulings',
        detail: 'Joined early-pandemic orders on houses of worship and public-health restrictions.',
        category: 'Civil Rights',
        evidence: [
          opinion(
            'Joined per curiam order in Roman Catholic Diocese of Brooklyn v. Cuomo.',
            '2020-11-25',
            'https://www.supremecourt.gov/opinions/20pdf/20a87_3fb4.pdf',
          ),
        ],
      },
      {
        name: 'Gun Policy',
        position: 'Joined Bruen Second Amendment ruling',
        detail: 'Joined the 2022 concealed-carry permitting decision.',
        category: 'Gun Policy',
        evidence: [
          opinion(
            'Joined majority in New York State Rifle & Pistol Association v. Bruen.',
            '2022-06-23',
            'https://www.supremecourt.gov/opinions/21pdf/20-843_7j80.pdf',
          ),
        ],
      },
    ],
  }),
  judicialProfile(currentJustices[8], {
    appointmentEvidence: appt(currentJustices[8]),
    issues: [
      {
        name: 'Sentencing & Federal Courts',
        position: 'Dissents on mandatory minimum and sentencing issues',
        detail: 'Prior service on the U.S. District Court and D.C. Circuit; public record on federal sentencing.',
        category: 'Criminal Justice',
        evidence: [
          opinion(
            'Prior D.C. Circuit dissent in United States v. Peltier — addressed sentencing guidelines and judicial discretion (pre-appointment record cited in confirmation materials).',
            '2019-12-06',
            'https://www.supremecourt.gov/about/biographies.aspx#jackson',
          ),
        ],
      },
      {
        name: 'Affirmative Action',
        position: 'Dissented in Harvard/UNC admissions ruling',
        detail: 'First Black woman to serve on the Supreme Court; dissented in 2023 race-conscious admissions cases.',
        category: 'Education',
        evidence: [
          opinion(
            'Dissented in Students for Fair Admissions v. Harvard — majority struck down race-conscious admissions programs at Harvard and UNC.',
            '2023-06-29',
            'https://www.supremecourt.gov/opinions/22pdf/20-1199_hgdj.pdf',
          ),
        ],
      },
    ],
  }),
];
