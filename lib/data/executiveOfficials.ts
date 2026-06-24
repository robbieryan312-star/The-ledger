/**
 * executiveOfficials.ts — featured demo profiles for the sitting President, VP,
 * and cabinet principals. Office labels resolve via executiveRoster.ts
 * (whitehouse.gov), not hand-typed chamber fields.
 */
import { EvidenceItem, ExecutiveAction, Politician, Source } from '../types';
import { congressPhotoUrl } from './photos';

const WHITEHOUSE: Source = {
  name: 'The White House',
  url: 'https://www.whitehouse.gov',
  tier: 'official',
  description: 'Official records of the President and executive branch',
};
const FEDERAL_REGISTER: Source = {
  name: 'Federal Register',
  url: 'https://www.federalregister.gov',
  tier: 'official',
  description: 'Official daily journal of U.S. government actions including executive orders',
};
const STATE_DEPT: Source = {
  name: 'U.S. Department of State',
  url: 'https://www.state.gov',
  tier: 'official',
  description: 'Official State Department records and statements',
};
const DOJ: Source = {
  name: 'U.S. Department of Justice',
  url: 'https://www.justice.gov',
  tier: 'official',
  description: 'Official Department of Justice records',
};
const TREASURY: Source = {
  name: 'U.S. Department of the Treasury',
  url: 'https://home.treasury.gov',
  tier: 'official',
  description: 'Official Treasury Department records',
};
const DOD: Source = {
  name: 'U.S. Department of Defense',
  url: 'https://www.defense.gov',
  tier: 'official',
  description: 'Official Defense Department records',
};
const DHS: Source = {
  name: 'U.S. Department of Homeland Security',
  url: 'https://www.dhs.gov',
  tier: 'official',
  description: 'Official DHS records',
};
const SENATE_GOV: Source = {
  name: 'senate.gov',
  url: 'https://www.senate.gov',
  tier: 'official',
  description: 'Official U.S. Senate records including confirmation votes',
};
const AP: Source = {
  name: 'Associated Press',
  url: 'https://apnews.com',
  tier: 'nonpartisan',
  description: 'Wire service with established fact-checking standards',
};
const CSPAN: Source = {
  name: 'C-SPAN',
  url: 'https://www.c-span.org',
  tier: 'nonpartisan',
  description: 'Official video archive of government proceedings',
};

const EXECUTIVE_FINANCE = {
  totalRaised: 0,
  totalSpent: 0,
  cashOnHand: 0,
  cycle: 'N/A — executive office',
  donors: [],
  topIndustries: [],
  lobbyistMoney: [],
  foreignPAC: [],
  individualDonations: 0,
  pacDonations: 0,
  selfFunding: 0,
};

const EXECUTIVE_CONSISTENCY = {
  overallScore: 0,
  campaignPromises: [],
  partyLineVotePercentage: 0,
  lobbyistAlignmentPercentage: 0,
  termConsistency: [],
};

function execProfile(
  p: Pick<
    Politician,
    | 'id'
    | 'name'
    | 'firstName'
    | 'lastName'
    | 'party'
    | 'chamber'
    | 'bio'
    | 'topIssues'
  > &
    Partial<Politician>,
): Politician {
  return {
    state: 'United States',
    stateCode: 'US',
    level: 'federal',
    branch: 'executive',
    inOffice: true,
    termStart: '2025-01-20',
    termEnd: '2029-01-20',
    ...p,
    votingRecord: p.votingRecord ?? [],
    campaignFinance: p.campaignFinance ?? EXECUTIVE_FINANCE,
    stockTrades: p.stockTrades ?? [],
    consistency: p.consistency ?? EXECUTIVE_CONSISTENCY,
    controversies: p.controversies ?? [],
    news: p.news ?? [],
  };
}

export const executiveOfficials: Politician[] = [
  // ── President ─────────────────────────────────────────────────────────────
  execProfile({
    id: 'pres-us',
    name: 'Donald J. Trump',
    firstName: 'Donald',
    lastName: 'Trump',
    party: 'Republican',
    chamber: 'president',
    imageUrl:
      'https://www.whitehouse.gov/wp-content/uploads/2025/02/President-Donald-J-Trump-Official-Presidential-Portrait.png',
    website: 'https://www.whitehouse.gov/administration/donald-j-trump/',
    bio: 'Donald J. Trump is the 47th President of the United States, serving his second non-consecutive term after winning the 2024 presidential election. He previously served as the 45th President (2017–2021). Before entering politics he was a real estate developer and television personality. He is constitutionally term-limited after this term.',
    termStart: '2025-01-20',
    topIssues: [
      {
        name: 'Immigration & Border',
        position: 'Border emergency; expanded enforcement',
        detail:
          'Declared a national border emergency on inauguration day and issued executive orders directing increased deportation operations and restrictions on asylum processing at the southern border.',
        category: 'Immigration',
        statement:
          'Available evidence suggests Trump prioritized border enforcement through day-one executive orders and emergency declarations in January 2025.',
        evidence: [
          {
            type: 'action',
            description:
              'Signed Executive Order 14159 — "Declaring a National Emergency at the Southern Border of the United States" on inauguration day, directing DHS to reprioritize border security resources.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
          {
            type: 'action',
            description:
              'Signed Executive Order 14165 — "Protecting the American People Against Invasion" — directing federal agencies to enforce immigration laws and restrict parole and asylum pathways.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
          {
            type: 'statement',
            description:
              'Inaugural address emphasized border security and mass deportation as first-term priorities.',
            date: '2025-01-20',
            source: WHITEHOUSE,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Trade & Tariffs',
        position: 'Reciprocal tariffs; reshoring manufacturing',
        detail:
          'Directed review of trade deficits and announced broad tariff policies on imports from major trading partners in early 2025.',
        category: 'Economy',
        statement:
          'Trump campaigned on tariff-led industrial policy; early 2025 executive actions initiated reciprocal tariff reviews and sector-specific duties.',
        evidence: [
          {
            type: 'action',
            description:
              'Signed memorandum directing federal agencies to investigate trade deficits and recommend reciprocal tariff measures.',
            date: '2025-02-13',
            source: WHITEHOUSE,
          },
          {
            type: 'statement',
            description:
              'Public remarks at White House outlined "America First" trade policy emphasizing domestic manufacturing and tariff leverage.',
            date: '2025-02-01',
            source: CSPAN,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Federal Workforce',
        position: 'DEI rollback; hiring freeze; DOGE cost review',
        detail:
          'Issued executive orders ending federal DEI programs, instituting a hiring freeze, and establishing the Department of Government Efficiency advisory effort.',
        category: 'Government',
        statement:
          'Day-one and early-term executive orders reshaped federal hiring and diversity programs; a separate executive action created a cost-cutting advisory structure.',
        evidence: [
          {
            type: 'action',
            description:
              'Signed Executive Order ending federal diversity, equity, and inclusion programs across executive agencies.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
          {
            type: 'action',
            description:
              'Signed executive order instituting a federal civilian hiring freeze except for military, public safety, and other specified categories.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
          {
            type: 'action',
            description:
              'Established the Department of Government Efficiency (DOGE) as a presidential advisory commission to review federal spending.',
            date: '2025-01-20',
            source: WHITEHOUSE,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Climate & Energy',
        position: 'Withdraw from Paris Agreement; expand domestic energy',
        detail:
          'Reversed Biden-era climate executive orders and directed withdrawal from the Paris climate accord for a second time.',
        category: 'Environment',
        evidence: [
          {
            type: 'action',
            description:
              'Signed executive order withdrawing the United States from the Paris Agreement under the UN Framework Convention on Climate Change.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
          {
            type: 'action',
            description:
              'Revoked prior executive orders promoting electric vehicle mandates and federal climate-risk disclosure requirements.',
            date: '2025-01-20',
            source: FEDERAL_REGISTER,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Foreign Policy',
        position: 'Middle East force posture; Israel support amid Iran conflict',
        detail:
          'June 2026 records document U.S. military deployments and emergency aid to Israel during Iran hostilities. Earlier 2025 statements emphasized negotiating an end to the Russia–Ukraine war and reviewing foreign assistance disbursements.',
        category: 'Foreign Policy',
        statement:
          'Available evidence shows a shift in salience from Ukraine aid skepticism (early 2025) toward Middle East deployments and Israel support (mid-2026). Both periods are documented with dates below.',
        evidence: [
          {
            type: 'action',
            description:
              'Authorized additional U.S. military deployments to the Middle East region amid Israel–Iran hostilities, per Defense Department announcements.',
            date: '2026-06-18',
            source: DOD,
          },
          {
            type: 'statement',
            description:
              'Public remarks at the White House stated the U.S. would defend Israel and cited Iran nuclear program risks.',
            date: '2026-06-15',
            source: WHITEHOUSE,
          },
          {
            type: 'action',
            description:
              'Announced emergency military assistance package to Israel during Iran conflict escalation.',
            date: '2026-06-12',
            source: AP,
          },
        ] as EvidenceItem[],
        historicalEvidence: [
          {
            type: 'statement',
            description:
              'Stated goal of ending the Russia–Ukraine war through direct negotiations; publicly criticized prior administration Ukraine aid levels.',
            date: '2025-02-12',
            source: AP,
          },
          {
            type: 'action',
            description:
              'Ordered pause and review of foreign assistance disbursements pending policy alignment review.',
            date: '2025-01-20',
            source: WHITEHOUSE,
          },
          {
            type: 'statement',
            description:
              '2024 campaign emphasized "America First" framing and skepticism of open-ended foreign military aid.',
            date: '2024-10-27',
            source: AP,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'trump-eo-14159',
        type: 'executive_order',
        title: 'National Emergency at the Southern Border',
        description:
          'Executive Order 14159 — Declares a national emergency at the southern border and directs DHS to reprioritize border security resources.',
        date: '2025-01-20',
        source: FEDERAL_REGISTER,
        url: 'https://www.federalregister.gov',
      },
      {
        id: 'trump-eo-paris',
        type: 'executive_order',
        title: 'Withdrawal from Paris Agreement',
        description:
          'Executive order withdrawing the United States from the Paris Agreement under the UN Framework Convention on Climate Change.',
        date: '2025-01-20',
        source: FEDERAL_REGISTER,
        url: 'https://www.federalregister.gov',
      },
      {
        id: 'trump-intl-2026-06',
        type: 'international',
        title: 'Middle East force deployments',
        description:
          'Authorized additional U.S. military asset deployments to the Middle East region amid Israel–Iran hostilities.',
        date: '2026-06-18',
        source: DOD,
        url: 'https://www.defense.gov',
      },
      {
        id: 'trump-appt-rubio',
        type: 'nomination',
        title: 'Nominated Marco Rubio as Secretary of State',
        description:
          'Submitted nomination of former Senator Marco Rubio (R-FL) to serve as U.S. Secretary of State; Senate confirmed January 20, 2025.',
        date: '2024-11-13',
        source: WHITEHOUSE,
        url: 'https://www.whitehouse.gov',
      },
      {
        id: 'trump-agenda-2025-01',
        type: 'agenda',
        title: 'Day-one policy agenda rollout',
        description:
          'White House published day-one priorities: border emergency, federal hiring freeze, DEI program rollback, and trade/tariff review.',
        date: '2025-01-20',
        source: WHITEHOUSE,
        url: 'https://www.whitehouse.gov',
      },
    ] as ExecutiveAction[],
    consistency: {
      overallScore: 68,
      campaignPromises: [
        {
          id: 'trump-p1',
          issue: 'Border Emergency',
          statement: '"On Day One I will seal the border and launch the largest deportation program in American history."',
          category: 'Immigration',
          status: 'In Progress',
          said: { summary: '2024 campaign pledge for day-one border emergency and deportation operations', date: '2024-10-27', source: AP },
          did: { summary: 'Signed border emergency and enforcement executive orders on inauguration day', date: '2025-01-20', source: FEDERAL_REGISTER },
        },
        {
          id: 'trump-p2',
          issue: 'Paris Agreement Withdrawal',
          statement: '"We will again withdraw from the unfair Paris Climate Accord."',
          category: 'Environment',
          status: 'Kept',
          said: { summary: '2024 campaign pledge to exit Paris Agreement', date: '2024-08-15', source: AP },
          did: { summary: 'Signed withdrawal executive order January 20, 2025', date: '2025-01-20', source: FEDERAL_REGISTER },
        },
        {
          id: 'trump-p3',
          issue: 'Federal DEI Programs',
          statement: '"I will terminate every diversity, equity and inclusion program across the federal government."',
          category: 'Government',
          status: 'Kept',
          said: { summary: '2024 campaign pledge to end federal DEI programs', date: '2024-09-05', source: AP },
          did: { summary: 'Signed executive order ending federal DEI initiatives', date: '2025-01-20', source: FEDERAL_REGISTER },
        },
        {
          id: 'trump-p4',
          issue: 'Foreign Military Engagement',
          statement: '"We will stop funding endless foreign wars."',
          category: 'Foreign Policy',
          status: 'Compromised',
          said: {
            summary: '2024 campaign emphasized ending endless foreign wars and conditioning aid on U.S. interests',
            date: '2024-10-27',
            source: AP,
          },
          did: {
            summary: 'June 2026 authorized Middle East force deployments and emergency Israel aid during Iran conflict; January 2025 paused foreign assistance for review',
            date: '2026-06-18',
            source: DOD,
          },
        },
      ],
      partyLineVotePercentage: 0,
      lobbyistAlignmentPercentage: 0,
      termConsistency: [
        { year: 2025, score: 68, keyChanges: ['Day-one executive orders on border, DEI, Paris withdrawal; tariff policy rollout'] },
        { year: 2026, score: 65, keyChanges: ['Middle East force deployments; foreign policy emphasis shifted from Ukraine aid review'] },
      ],
    },
    controversies: [
      {
        id: 'trump-cont-fp',
        title: 'Foreign policy record spans competing dated emphases',
        summary:
          'Public statements from 2024–early 2025 emphasized reducing open-ended foreign military aid and negotiating Ukraine peace. June 2026 records document U.S. force deployments and Israel aid during the Iran conflict. The Ledger presents both periods with dates — a factual timeline, not a character judgment.',
        date: '2026-06-18',
        category: 'Policy',
        status: 'Ongoing',
        isVerified: true,
        sources: [AP, DOD],
      },
    ],
    news: [
      {
        id: 'trump-n1',
        headline: 'Trump sworn in as 47th president; signs raft of executive orders',
        summary:
          'Donald Trump took the oath of office January 20, 2025, and signed multiple executive orders on border enforcement, federal hiring, and climate policy reversals on his first day.',
        date: '2025-01-20',
        category: 'Government',
        isOpinion: false,
        isVerified: true,
        source: AP,
        url: 'https://apnews.com',
      },
    ],
  }),

  // ── Vice President ──────────────────────────────────────────────────────────
  execProfile({
    id: 'vp-us',
    bioguideId: 'V000137',
    name: 'JD Vance',
    firstName: 'JD',
    lastName: 'Vance',
    party: 'Republican',
    chamber: 'vice_president',
    imageUrl: congressPhotoUrl('V000137'),
    website: 'https://www.whitehouse.gov/administration/jd-vance/',
    bio: 'James David "JD" Vance is the 50th Vice President of the United States, sworn in January 20, 2025. He previously served as U.S. Senator from Ohio (2023–2025) and is author of "Hillbilly Elegy." As Vice President he presides over the U.S. Senate and casts tie-breaking votes when required.',
    termStart: '2025-01-20',
    topIssues: [
      {
        name: 'Immigration',
        position: 'Enforcement-first; border security',
        detail:
          'As Vice President, publicly supported Trump administration border enforcement executive orders and deportation operations.',
        category: 'Immigration',
        statement:
          'Available evidence suggests Vance has aligned with the administration\'s enforcement-first immigration posture since taking office.',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks at border visit emphasized completing the border wall and accelerating deportations.',
            date: '2025-02-18',
            source: AP,
          },
          {
            type: 'action',
            description:
              'Presided over Senate session during confirmation votes for Homeland Security and border-related cabinet nominees.',
            date: '2025-01-25',
            source: SENATE_GOV,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Economy & Trade',
        position: 'Industrial policy; tariff support',
        detail:
          'Advocated reshoring manufacturing and tariff-based trade policy during the 2024 campaign and in early VP remarks.',
        category: 'Economy',
        evidence: [
          {
            type: 'statement',
            description:
              'Speech at manufacturing facility emphasized tariffs to protect U.S. industrial jobs and reduce trade deficits.',
            date: '2025-03-04',
            source: CSPAN,
          },
          {
            type: 'statement',
            description:
              '2024 campaign statements supported reciprocal tariffs and skepticism of unrestricted free-trade agreements.',
            date: '2024-10-15',
            source: AP,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Foreign Policy',
        position: 'Skeptic of open-ended aid; aligned with administration Middle East posture',
        detail:
          'As Vice President, publicly aligned with June 2026 Middle East force posture. As Senator, voted against several Ukraine supplemental packages.',
        category: 'Foreign Policy',
        statement:
          'Available evidence shows continuity on aid skepticism with a shift in public emphasis toward administration Middle East actions in 2026.',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks supported administration Middle East deployments and Israel defense posture during Iran conflict.',
            date: '2026-06-16',
            source: AP,
          },
          {
            type: 'statement',
            description:
              'Public interview stated U.S. should prioritize negotiated settlement in Ukraine over indefinite military aid.',
            date: '2025-02-20',
            source: AP,
          },
        ] as EvidenceItem[],
        historicalEvidence: [
          {
            type: 'statement',
            description:
              'As Senator, publicly opposed additional Ukraine aid without defined end state (2024).',
            date: '2024-04-20',
            source: AP,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Senate Tie-Breaking',
        position: 'Presiding officer; constitutional tie-breaker',
        detail:
          'Constitutional role as President of the Senate; casts tie-breaking votes when the chamber is evenly divided.',
        category: 'Government',
        evidence: [
          {
            type: 'action',
            description:
              'Sworn in as Vice President and President of the Senate January 20, 2025; presided over opening 119th Congress sessions.',
            date: '2025-01-20',
            source: SENATE_GOV,
          },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 72,
      campaignPromises: [
        {
          id: 'vance-p1',
          issue: 'Border Enforcement',
          statement: '"We need to finish the wall and deport violent criminals who are here illegally."',
          category: 'Immigration',
          status: 'In Progress',
          said: { summary: '2024 campaign statements on border wall and deportations', date: '2024-09-12', source: AP },
          did: { summary: 'Publicly supported administration border executive orders after inauguration', date: '2025-02-18', source: AP },
        },
      ],
      partyLineVotePercentage: 0,
      lobbyistAlignmentPercentage: 0,
      termConsistency: [{ year: 2025, score: 72, keyChanges: ['Transition from Senate to VP; aligned with administration trade and immigration agenda'] }],
    },
    executiveActions: [
      {
        id: 'vance-senate-preside',
        type: 'agenda',
        title: 'Presided over Senate opening sessions',
        description:
          'Sworn in as Vice President and President of the Senate; presided over opening 119th Congress sessions and cabinet confirmation votes.',
        date: '2025-01-20',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'vance-intl-2026',
        type: 'international',
        title: 'Middle East policy remarks',
        description:
          'Public remarks aligned with administration Middle East deployments and Israel defense posture during Iran conflict.',
        date: '2026-06-16',
        source: AP,
        url: 'https://apnews.com',
      },
    ] as ExecutiveAction[],
  }),

  // ── Secretary of State ──────────────────────────────────────────────────────
  execProfile({
    id: 'cab-rubio',
    bioguideId: 'R000595',
    name: 'Marco Rubio',
    firstName: 'Marco',
    lastName: 'Rubio',
    party: 'Republican',
    chamber: 'cabinet',
    imageUrl: congressPhotoUrl('R000595'),
    website: 'https://www.state.gov/biographies/marco-rubio',
    bio: 'Marco Rubio is the 72nd U.S. Secretary of State, confirmed by the Senate in January 2025. He previously served as U.S. Senator from Florida (2011–2025), including as Vice Chair of the Senate Intelligence Committee and as a senior member of the Foreign Relations Committee.',
    termStart: '2025-01-21',
    topIssues: [
      {
        name: 'China Policy',
        position: 'Strategic competition; Taiwan support',
        detail:
          'Long-standing Senate record as a China hawk; as Secretary continued emphasis on Indo-Pacific alliances and technology export controls.',
        category: 'Foreign Policy',
        evidence: [
          {
            type: 'statement',
            description:
              'Confirmation hearing testimony described China as the "most potent and dangerous" near-peer adversary; pledged to maintain Taiwan support within One China policy framework.',
            date: '2025-01-15',
            source: STATE_DEPT,
          },
          {
            type: 'action',
            description:
              'Senate confirmed Rubio as Secretary of State by recorded vote after leaving the Senate seat.',
            date: '2025-01-20',
            source: SENATE_GOV,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Western Hemisphere',
        position: 'Counter narcotics; migration diplomacy',
        detail:
          'Emphasized U.S. leadership in the Americas and coordination on migration and drug trafficking.',
        category: 'Foreign Policy',
        evidence: [
          {
            type: 'statement',
            description:
              'First foreign travel as Secretary focused on Latin America and Caribbean partners.',
            date: '2025-02-01',
            source: STATE_DEPT,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Ukraine & Russia',
        position: 'Support Ukraine with conditions; negotiate end state',
        detail:
          'Shifted from Senate-era full aid advocacy toward administration emphasis on negotiated settlement.',
        category: 'Foreign Policy',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks aligned with administration review of Ukraine aid and push for diplomatic end to the war.',
            date: '2025-02-14',
            source: AP,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'rubio-confirmation',
        type: 'appointment',
        title: 'Confirmed as Secretary of State',
        description: 'Senate confirmed Marco Rubio as the 72nd U.S. Secretary of State.',
        date: '2025-01-20',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'rubio-travel-latam',
        type: 'international',
        title: 'Latin America diplomatic travel',
        description: 'First foreign travel as Secretary focused on Latin America and Caribbean partners.',
        date: '2025-02-01',
        source: STATE_DEPT,
        url: 'https://www.state.gov',
      },
      {
        id: 'rubio-intl-2026',
        type: 'international',
        title: 'Middle East diplomatic coordination',
        description: 'State Department coordinated allied messaging during Israel–Iran hostilities.',
        date: '2026-06-14',
        source: STATE_DEPT,
        url: 'https://www.state.gov',
      },
    ] as ExecutiveAction[],
  }),
  execProfile({
    id: 'cab-bondi',
    name: 'Pam Bondi',
    firstName: 'Pam',
    lastName: 'Bondi',
    party: 'Republican',
    chamber: 'cabinet',
    website: 'https://www.justice.gov/ag/biography',
    bio: 'Pam Bondi is the U.S. Attorney General, confirmed by the Senate in February 2025. She previously served as Florida Attorney General (2011–2019) and was a member of Trump\'s first impeachment defense team.',
    termStart: '2025-02-05',
    topIssues: [
      {
        name: 'Immigration Enforcement',
        position: 'DOJ support for border prosecutions',
        detail:
          'Directed DOJ resources toward immigration-related prosecutions and challenged sanctuary jurisdiction policies.',
        category: 'Immigration',
        evidence: [
          {
            type: 'action',
            description:
              'Issued memo directing U.S. Attorneys to prioritize immigration enforcement cases and challenge local non-cooperation policies.',
            date: '2025-02-10',
            source: DOJ,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Federal Prosecution Priorities',
        position: 'Violent crime; drug trafficking',
        detail:
          'Outlined priorities emphasizing violent crime, fentanyl trafficking, and public safety prosecutions.',
        category: 'Criminal Justice',
        evidence: [
          {
            type: 'statement',
            description:
              'Confirmation hearing testimony outlined violent crime and drug trafficking as top DOJ enforcement priorities.',
            date: '2025-01-15',
            source: DOJ,
          },
          {
            type: 'action',
            description:
              'Senate confirmed Bondi as Attorney General.',
            date: '2025-02-04',
            source: SENATE_GOV,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'bondi-confirmation',
        type: 'appointment',
        title: 'Confirmed as Attorney General',
        description: 'Senate confirmed Pam Bondi as U.S. Attorney General.',
        date: '2025-02-04',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'bondi-immigration-memo',
        type: 'directive',
        title: 'Immigration enforcement prioritization memo',
        description:
          'Issued memo directing U.S. Attorneys to prioritize immigration enforcement cases and challenge local non-cooperation policies.',
        date: '2025-02-10',
        source: DOJ,
        url: 'https://www.justice.gov',
      },
    ] as ExecutiveAction[],
  }),

  // ── Treasury Secretary ────────────────────────────────────────────────────────
  execProfile({
    id: 'cab-bessent',
    name: 'Scott Bessent',
    firstName: 'Scott',
    lastName: 'Bessent',
    party: 'Republican',
    chamber: 'cabinet',
    website: 'https://home.treasury.gov/about/general-information/officials',
    bio: 'Scott Bessent is the U.S. Secretary of the Treasury, confirmed in January 2025. He is a hedge fund manager and former George Soros protégé who founded Key Square Group. He advised the Trump campaign on economic policy.',
    termStart: '2025-01-28',
    topIssues: [
      {
        name: 'Tax Policy',
        position: 'Extend 2017 tax cuts; deficit management',
        detail:
          'Stated priority of extending expiring provisions of the 2017 Tax Cuts and Jobs Act.',
        category: 'Economy',
        evidence: [
          {
            type: 'statement',
            description:
              'Confirmation hearing testimony identified extension of 2017 individual tax cuts as a top legislative priority.',
            date: '2025-01-16',
            source: TREASURY,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Tariffs & Trade',
        position: 'Implement reciprocal tariff framework',
        detail:
          'Tasked with implementing administration tariff and trade deficit policies through Treasury and interagency coordination.',
        category: 'Economy',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks supported using tariffs as leverage in trade negotiations while monitoring inflation impacts.',
            date: '2025-02-20',
            source: AP,
          },
          {
            type: 'action',
            description:
              'Senate confirmed Bessent as Secretary of the Treasury.',
            date: '2025-01-27',
            source: SENATE_GOV,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'bessent-confirmation',
        type: 'appointment',
        title: 'Confirmed as Secretary of the Treasury',
        description: 'Senate confirmed Scott Bessent as U.S. Secretary of the Treasury.',
        date: '2025-01-27',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'bessent-tariff-remarks',
        type: 'agenda',
        title: 'Tariff implementation remarks',
        description:
          'Public remarks on implementing reciprocal tariff framework and monitoring inflation impacts.',
        date: '2025-02-20',
        source: TREASURY,
        url: 'https://home.treasury.gov',
      },
    ] as ExecutiveAction[],
  }),

  // ── Defense Secretary ───────────────────────────────────────────────────────
  execProfile({
    id: 'cab-hegseth',
    name: 'Pete Hegseth',
    firstName: 'Pete',
    lastName: 'Hegseth',
    party: 'Republican',
    chamber: 'cabinet',
    website: 'https://www.defense.gov/About/Secretary-of-Defense/',
    bio: 'Pete Hegseth is the U.S. Secretary of Defense, confirmed in January 2025. He is a former U.S. Army officer who served in Iraq and Afghanistan, and was a Fox News host before entering government.',
    termStart: '2025-01-25',
    topIssues: [
      {
        name: 'Military Readiness',
        position: 'Rebuild recruitment; end DEI in military',
        detail:
          'Ordered review of military diversity programs and emphasized recruitment and lethality as top priorities.',
        category: 'Defense',
        evidence: [
          {
            type: 'action',
            description:
              'Issued directive pausing certain Pentagon DEI offices and programs pending review.',
            date: '2025-01-28',
            source: DOD,
          },
          {
            type: 'statement',
            description:
              'Confirmation hearing emphasized restoring military recruitment and warfighting focus.',
            date: '2025-01-14',
            source: DOD,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Ukraine & NATO',
        position: 'Condition aid; burden-sharing',
        detail:
          'Aligned with administration push for European NATO members to increase defense spending.',
        category: 'Foreign Policy',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks called for NATO allies to meet and exceed 2% GDP defense spending targets.',
            date: '2025-02-12',
            source: AP,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'hegseth-confirmation',
        type: 'appointment',
        title: 'Confirmed as Secretary of Defense',
        description: 'Senate confirmed Pete Hegseth as U.S. Secretary of Defense.',
        date: '2025-01-25',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'hegseth-dei-directive',
        type: 'directive',
        title: 'Pentagon DEI program review',
        description: 'Issued directive pausing certain Pentagon DEI offices and programs pending review.',
        date: '2025-01-28',
        source: DOD,
        url: 'https://www.defense.gov',
      },
      {
        id: 'hegseth-intl-2026',
        type: 'international',
        title: 'Middle East force posture',
        description:
          'Defense Department announced additional U.S. military deployments to the Middle East amid Israel–Iran hostilities.',
        date: '2026-06-18',
        source: DOD,
        url: 'https://www.defense.gov',
      },
    ] as ExecutiveAction[],
  }),

  // ── Homeland Security Secretary ─────────────────────────────────────────────
  execProfile({
    id: 'cab-noem',
    name: 'Kristi Noem',
    firstName: 'Kristi',
    lastName: 'Noem',
    party: 'Republican',
    chamber: 'cabinet',
    website: 'https://www.dhs.gov/secretary-homeland-security',
    bio: 'Kristi Noem is the U.S. Secretary of Homeland Security, confirmed in January 2025. She previously served as Governor of South Dakota (2019–2025). DHS oversees border security, immigration enforcement, FEMA, and cybersecurity.',
    termStart: '2025-01-25',
    topIssues: [
      {
        name: 'Border Security',
        position: 'Execute deportation operations; wall completion',
        detail:
          'Tasked with implementing administration border emergency orders and expanding ICE enforcement operations.',
        category: 'Immigration',
        evidence: [
          {
            type: 'action',
            description:
              'Directed ICE to expand targeted enforcement operations in major metropolitan areas per administration executive orders.',
            date: '2025-01-26',
            source: DHS,
          },
          {
            type: 'statement',
            description:
              'Confirmation hearing pledged to execute mass deportation operations within legal constraints.',
            date: '2025-01-11',
            source: DHS,
          },
        ] as EvidenceItem[],
      },
      {
        name: 'FEMA & Disaster Response',
        position: 'Streamline disaster aid; state partnership',
        detail:
          'Oversaw federal disaster response while administration reviewed FEMA structure and funding.',
        category: 'Public Safety',
        evidence: [
          {
            type: 'statement',
            description:
              'Public remarks emphasized faster disaster declarations and state-federal coordination.',
            date: '2025-03-01',
            source: AP,
          },
        ] as EvidenceItem[],
      },
    ],
    executiveActions: [
      {
        id: 'noem-confirmation',
        type: 'appointment',
        title: 'Confirmed as Secretary of Homeland Security',
        description: 'Senate confirmed Kristi Noem as U.S. Secretary of Homeland Security.',
        date: '2025-01-25',
        source: SENATE_GOV,
        url: 'https://www.senate.gov',
      },
      {
        id: 'noem-ice-expansion',
        type: 'directive',
        title: 'Expanded ICE enforcement operations',
        description:
          'Directed ICE to expand targeted enforcement operations in major metropolitan areas per administration executive orders.',
        date: '2025-01-26',
        source: DHS,
        url: 'https://www.dhs.gov',
      },
    ] as ExecutiveAction[],
  }),
];
