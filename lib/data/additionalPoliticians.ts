import { Politician, Source, EvidenceItem } from '../types';

// Production data would integrate FEC, Congress.gov, GovTrack, Ballotpedia, and state
// legislatures — see lib/data/README.md and GWU political science database guide.

const CONGRESS_GOV: Source = { name: 'Congress.gov', url: 'https://www.congress.gov', tier: 'official', description: 'Official legislative records' };
const CSPAN: Source = { name: 'C-SPAN', url: 'https://www.c-span.org', tier: 'nonpartisan', description: 'Official video archive of congressional proceedings' };
const GOVTRACK: Source = { name: 'GovTrack.us', url: 'https://www.govtrack.us', tier: 'nonpartisan' };
const BALLOTPEDIA: Source = { name: 'Ballotpedia', url: 'https://ballotpedia.org', tier: 'nonpartisan' };
const FEC: Source = { name: 'Federal Election Commission', url: 'https://www.fec.gov', tier: 'official' };
const AP: Source = { name: 'Associated Press', url: 'https://apnews.com', tier: 'nonpartisan' };
const SENATE_GOV: Source = { name: 'senate.gov', url: 'https://www.senate.gov', tier: 'official' };
const FL_GOV: Source = { name: 'FL Office of the Governor', url: 'https://www.flgov.com', tier: 'official' };
const FL_DEP: Source = { name: 'FL Dept. of Environmental Protection', url: 'https://floridadep.gov', tier: 'official' };
const FL_AG: Source = { name: 'FL Attorney General', url: 'https://www.myfloridalegal.com', tier: 'official' };

function scaffold(
  p: Pick<Politician, 'id' | 'name' | 'firstName' | 'lastName' | 'party' | 'state' | 'stateCode' | 'chamber' | 'level' | 'bio' | 'topIssues'> &
    Partial<Politician>
): Politician {
  return {
    inOffice: true,
    votingRecord: [],
    campaignFinance: {
      totalRaised: 2500000,
      totalSpent: 1800000,
      cashOnHand: 700000,
      cycle: '2024',
      donors: [],
      topIndustries: [{ industry: 'Individuals', amount: 1200000, donors: 8000, percentage: 48 }],
      lobbyistMoney: [],
      foreignPAC: [],
      individualDonations: 1200000,
      pacDonations: 800000,
      selfFunding: 0,
    },
    stockTrades: [],
    consistency: {
      overallScore: 72,
      campaignPromises: [],
      partyLineVotePercentage: 90,
      lobbyistAlignmentPercentage: 55,
      termConsistency: [{ year: 2023, score: 72, keyChanges: [] }],
    },
    controversies: [],
    news: [],
    ...p,
  };
}

export const additionalPoliticians: Politician[] = [
  // ── Florida U.S. Senate ───────────────────────────────────────────────────
  scaffold({
    id: 'sen-moody',
    bioguideId: 'M001244',
    name: 'Ashley Moody',
    firstName: 'Ashley',
    lastName: 'Moody',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    chamber: 'senate',
    level: 'federal',
    termStart: '2025-01-21',
    termEnd: '2027-01-03',
    nextElection: '2026',
    website: 'https://www.moody.senate.gov',
    committees: [],
    bio: 'Ashley Moody is a U.S. Senator from Florida, appointed in January 2025 to fill the vacancy created when Marco Rubio left the Senate to serve as U.S. Secretary of State. She previously served as Florida Attorney General (2019–2025), and as a Hillsborough County circuit judge and federal prosecutor.',
    topIssues: [
      {
        name: 'Public Safety',
        position: 'Law enforcement; anti-trafficking enforcement',
        detail: 'As Florida Attorney General, emphasized law enforcement support, human trafficking prosecutions, and statewide public safety initiatives.',
        category: 'Public Safety',
        statement: 'Available evidence suggests Moody has made law enforcement support and anti-trafficking enforcement central to her public record.',
        evidence: [
          { type: 'action', description: 'Served as Florida Attorney General from 2019 until her 2025 Senate appointment, overseeing statewide legal and consumer protection work.', date: '2025-01-21', source: FL_AG },
          { type: 'statement', description: 'Public statements as Attorney General emphasized anti-trafficking enforcement and support for law enforcement agencies.', date: '2024-01-11', source: FL_AG },
        ] as EvidenceItem[],
      },
      {
        name: 'Consumer Protection',
        position: 'Fraud prevention; scam enforcement',
        detail: 'Focused on consumer fraud, elder exploitation, opioid-related litigation, and multistate enforcement actions as Attorney General.',
        category: 'Economy',
        statement: 'Moody\'s statewide record is strongest in consumer protection and public safety; federal voting data is still limited because her Senate tenure began in 2025.',
        evidence: [
          { type: 'action', description: 'Led consumer protection and fraud enforcement initiatives through the Florida Attorney General office.', date: '2024-06-01', source: FL_AG },
          { type: 'action', description: 'Participated in opioid-related litigation and settlement enforcement as Florida Attorney General.', date: '2023-12-01', source: AP },
        ] as EvidenceItem[],
      },
      {
        name: 'Federal Oversight',
        position: 'Conservative legal oversight; state-federal litigation',
        detail: 'Joined multistate legal challenges from the Florida Attorney General office before entering the Senate.',
        category: 'Democracy',
        evidence: [
          { type: 'action', description: 'Joined Republican state attorneys general in multistate lawsuits challenging federal regulations and executive actions.', date: '2024-04-01', source: AP },
          { type: 'statement', description: 'Appointment to the Senate announced after Marco Rubio vacated the seat to become U.S. Secretary of State.', date: '2025-01-16', source: AP },
        ] as EvidenceItem[],
      },
    ],
  }),

  scaffold({
    id: 'sen-scott',
    bioguideId: 'S001217',
    name: 'Rick Scott',
    firstName: 'Rick',
    lastName: 'Scott',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    chamber: 'senate',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/S001217.jpg',
    termStart: '2025-01-03',
    termEnd: '2031-01-03',
    nextElection: '2030',
    website: 'https://www.rickscott.senate.gov',
    committees: ['Armed Services', 'Budget', 'Homeland Security'],
    bio: 'Rick Scott served as Florida Governor (2011–2019) before winning the U.S. Senate seat in 2018 and re-election in 2024. Former CEO of Columbia/HCA. Known for fiscal conservatism and opposition to federal spending growth.',
    topIssues: [
      {
        name: 'Fiscal Policy',
        position: 'Opposes deficit spending; sunset federal programs',
        detail: 'Proposed requiring all federal legislation to sunset every 5 years unless reauthorized.',
        category: 'Economy',
        evidence: [
          { type: 'legislation', description: 'Introduced S.2765 — All Legislation Sunset Act requiring 5-year sunset on all federal statutes.', date: '2023-09-06', source: CONGRESS_GOV },
          { type: 'vote', description: 'Voted NAY on H.R.3684 Infrastructure Investment and Jobs Act ($1.2T).', date: '2021-11-05', source: SENATE_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Healthcare',
        position: 'Opposes ACA expansion; supports private market',
        detail: 'As governor, declined to expand Medicaid under ACA; supports block grants to states.',
        category: 'Healthcare',
        evidence: [
          { type: 'action', description: 'Florida under Scott declined Medicaid expansion (2013–2019); state estimated 800,000+ Floridians remained uninsured who would have qualified.', date: '2015-06-01', source: BALLOTPEDIA },
          { type: 'vote', description: 'Voted NAY on Inflation Reduction Act provisions extending ACA subsidies (2022).', date: '2022-08-07', source: SENATE_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Defense',
        position: 'Increased Pentagon spending; veterans benefits',
        detail: 'Supports higher defense budgets; advocates for VA reform and military family support.',
        category: 'Defense',
        evidence: [
          { type: 'vote', description: 'Voted YEA on S.2226 National Defense Authorization Act FY2024 ($886B authorization).', date: '2023-12-13', source: SENATE_GOV },
          { type: 'legislation', description: 'Co-sponsored Honoring Our PACT Act expanding VA benefits for toxic exposure veterans.', date: '2022-06-16', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
    ],
  }),

  // ── Florida U.S. House (major districts) ──────────────────────────────────
  scaffold({
    id: 'rep-bean',
    bioguideId: 'B001314',
    name: 'Aaron Bean',
    firstName: 'Aaron',
    lastName: 'Bean',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    district: '4th',
    chamber: 'house',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/B001314.jpg',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Aaron Bean represents FL-04 (Nassau County, parts of Jacksonville, and Northeast Florida). Former Florida State Senator and Fernandina Beach mayor. Freedom Caucus member.',
    topIssues: [
      {
        name: 'Fiscal Policy',
        position: 'Balanced budget; oppose federal spending growth',
        detail: 'Consistent vote record against deficit spending and omnibus appropriations without offsets.',
        category: 'Economy',
        statement: 'Available evidence suggests Bean has voted against large omnibus spending packages and supported fiscal restraint measures.',
        evidence: [
          { type: 'vote', description: 'Voted NAY on Fiscal Responsibility Act (2023 debt ceiling deal) citing insufficient spending cuts.', date: '2023-05-31', source: CONGRESS_GOV },
          { type: 'vote', description: 'Voted NAY on H.R.4366 Consolidated Appropriations Act FY2024 ($1.66T omnibus).', date: '2023-09-30', source: CONGRESS_GOV },
          { type: 'statement', description: 'Campaign materials emphasized opposition to "Washington spending addiction" and support for a balanced federal budget amendment.', date: '2022-11-08', source: BALLOTPEDIA },
        ] as EvidenceItem[],
      },
      {
        name: 'Immigration',
        position: 'Border security; oppose sanctuary policies',
        detail: 'Supports wall funding, E-Verify, and increased Border Patrol resources.',
        category: 'Immigration',
        evidence: [
          { type: 'vote', description: 'Voted YEA on H.R.2 Secure the Border Act (2023) — border wall funding and asylum restrictions.', date: '2023-05-11', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Co-sponsored H.R.29 Laken Riley Act requiring ICE detention for certain undocumented arrestees.', date: '2024-01-12', source: CONGRESS_GOV },
          { type: 'statement', description: 'Floor speech supporting Florida-style E-Verify mandates at the federal level.', date: '2024-03-15', source: CSPAN },
        ] as EvidenceItem[],
      },
      {
        name: 'Defense',
        position: 'Strong military; veterans benefits',
        detail: 'Advocates for Eglin AFB and NAS Pensacola funding; supports VA reform.',
        category: 'Defense',
        evidence: [
          { type: 'vote', description: 'Voted YEA on NDAA FY2024 ($886B authorization).', date: '2023-12-14', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Co-sponsored bill increasing impact aid for military-dependent school districts in FL-01.', date: '2024-02-22', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
    ],
  }),

  scaffold({
    id: 'rep-moskowitz',
    bioguideId: 'M001217',
    name: 'Jared Moskowitz',
    firstName: 'Jared',
    lastName: 'Moskowitz',
    party: 'Democrat',
    state: 'Florida',
    stateCode: 'FL',
    district: '23rd',
    chamber: 'house',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/M001217.jpg',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Jared Moskowitz represents FL-23 (Broward/Palm Beach). Former Florida Emergency Management Director under Governor DeSantis (2021–2022); former state representative. Known for bipartisan disaster response work before breaking with DeSantis.',
    topIssues: [
      {
        name: 'Gun Safety',
        position: 'Assault weapons ban; Parkland survivor advocate',
        detail: 'Marjory Stoneman Douglas High School graduate; leads on federal assault weapons legislation.',
        category: 'Guns',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored H.R.698 Assault Weapons Ban of 2023.', date: '2023-02-01', source: CONGRESS_GOV },
          { type: 'statement', description: 'Floor speech citing personal experience as MSD alum during 2023 assault weapons ban debate.', quote: 'I was a student at Marjory Stoneman Douglas when we did active shooter drills. I never thought I would have to do this as a member of Congress.', date: '2023-04-14', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Climate / Resilience',
        position: 'Federal flood insurance reform; hurricane preparedness',
        detail: 'Advocates NFIP reform and FEMA disaster funding increases for Florida coastal communities.',
        category: 'Environment',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored Flood Resiliency and Taxpayer Savings Act expanding FEMA mitigation grants.', date: '2024-03-20', source: CONGRESS_GOV },
          { type: 'action', description: 'As FL Emergency Management Director, coordinated Hurricane Ian response (2022) — credited with cross-agency coordination in FEMA after-action reviews.', date: '2022-10-15', source: AP },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 78,
      partyLineVotePercentage: 94,
      lobbyistAlignmentPercentage: 18,
      campaignPromises: [
        {
          id: 'mosk-cp1',
          issue: 'Assault Weapons Ban',
          statement: 'Floor speech citing personal experience as Marjory Stoneman Douglas alum during assault weapons ban debate.',
          category: 'Guns',
          status: 'In Progress',
          said: {
            summary:
              'Floor speech citing personal experience as Marjory Stoneman Douglas alum during 2023 assault weapons ban debate.',
            date: '2023-04-14',
            source: CONGRESS_GOV,
          },
          did: {
            summary: 'Co-sponsored H.R.698 Assault Weapons Ban of 2023.',
            date: '2023-02-01',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'mosk-cp2',
          issue: 'Flood Insurance / Resilience',
          statement: 'Advocates NFIP reform and FEMA disaster funding increases for Florida coastal communities.',
          category: 'Environment',
          status: 'In Progress',
          said: {
            summary:
              'Public advocacy for federal flood insurance reform and hurricane preparedness funding for South Florida.',
            date: '2024-03-20',
            source: CONGRESS_GOV,
          },
          did: {
            summary: 'Co-sponsored Flood Resiliency and Taxpayer Savings Act expanding FEMA mitigation grants.',
            date: '2024-03-20',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'mosk-cp3',
          issue: 'STOCK Act Disclosures',
          statement: 'Periodic transaction reports filed with the House Clerk under the STOCK Act.',
          category: 'Ethics',
          status: 'Kept',
          said: {
            summary: 'STOCK Act requires members to disclose stock transactions within statutory windows.',
            date: '2012-04-04',
            source: {
              name: 'STOCK Act (P.L. 112-105)',
              url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038',
              tier: 'official',
              description: 'Federal financial disclosure law for Congress',
            },
          },
          did: {
            summary:
              'Filed House PTR #20034749 (disclosed 2026-05-31) with Cencora (COR) and Gilead Sciences (GILD) transactions per House Clerk records.',
            date: '2026-05-31',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034749.pdf',
              tier: 'official',
              date: '2026-06-24',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        },
      ],
      termConsistency: [
        { year: 2023, score: 76, keyChanges: ['First House term; gun-safety legislation priority'] },
        { year: 2024, score: 79, keyChanges: ['Flood resilience co-sponsorships'] },
        { year: 2025, score: 78, keyChanges: [] },
      ],
    },
  }),

  scaffold({
    id: 'rep-salazar',
    bioguideId: 'S000168',
    name: 'Maria Elvira Salazar',
    firstName: 'Maria Elvira',
    lastName: 'Salazar',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    district: '27th',
    chamber: 'house',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/S000168.jpg',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Maria Elvira Salazar represents FL-27 (Miami). Former broadcast journalist. Cuban-American; focuses on Latin America policy and Miami economic development.',
    topIssues: [
      {
        name: 'Foreign Policy',
        position: 'Hard line on Cuba and Venezuela regimes',
        detail: 'Supports sanctions on authoritarian governments in the Western Hemisphere.',
        category: 'Foreign Policy',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored H.R.314 — FORCE Act conditioning Cuba removal from state sponsors of terror list.', date: '2023-01-11', source: CONGRESS_GOV },
          { type: 'statement', description: 'Public statement opposing Biden administration Cuba policy easing without human rights conditions.', date: '2024-05-20', source: AP },
        ] as EvidenceItem[],
      },
      {
        name: 'Immigration',
        position: 'Legal immigration reform; opposes sanctuary cities',
        detail: 'Supports DACA pathway for Dreamers while opposing sanctuary jurisdiction policies.',
        category: 'Immigration',
        evidence: [
          { type: 'vote', description: 'Voted NAY on H.R.2 Secure the Border Act (2023) — one of few Republicans opposing due to lack of Dreamer provisions.', date: '2023-05-11', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Co-sponsored DIGNIDAD Act providing conditional legal status for Venezuelan nationals.', date: '2023-09-18', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 74,
      partyLineVotePercentage: 88,
      lobbyistAlignmentPercentage: 28,
      campaignPromises: [
        {
          id: 'sal-cp1',
          issue: 'Cuba / Venezuela Policy',
          statement: 'Supports sanctions on authoritarian governments in the Western Hemisphere.',
          category: 'Foreign Policy',
          status: 'In Progress',
          said: {
            summary:
              'Public statement opposing Biden administration Cuba policy easing without human rights conditions.',
            date: '2024-05-20',
            source: AP,
          },
          did: {
            summary: 'Co-sponsored H.R.314 — FORCE Act conditioning Cuba removal from state sponsors of terror list.',
            date: '2023-01-11',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'sal-cp2',
          issue: 'Border Security / Dreamers',
          statement: 'Supports DACA pathway for Dreamers while opposing sanctuary jurisdiction policies.',
          category: 'Immigration',
          status: 'Compromised',
          said: {
            summary:
              'Public position supporting a DACA pathway for Dreamers while opposing sanctuary-city policies.',
            date: '2023-09-18',
            source: CONGRESS_GOV,
          },
          did: {
            summary:
              'Voted NAY on H.R.2 Secure the Border Act (2023) — one of few Republicans opposing due to lack of Dreamer provisions.',
            date: '2023-05-11',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'sal-cp3',
          issue: 'STOCK Act Disclosures',
          statement: 'Periodic transaction reports filed with the House Clerk under the STOCK Act.',
          category: 'Ethics',
          status: 'Kept',
          said: {
            summary: 'STOCK Act requires members to disclose stock transactions within statutory windows.',
            date: '2012-04-04',
            source: {
              name: 'STOCK Act (P.L. 112-105)',
              url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038',
              tier: 'official',
              description: 'Federal financial disclosure law for Congress',
            },
          },
          did: {
            summary:
              'Filed House PTR #20034709 (disclosed 2026-06-01) with Brookfield Renewable Partners and other transactions per House Clerk records.',
            date: '2026-06-01',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034709.pdf',
              tier: 'official',
              date: '2026-06-23',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        },
      ],
      termConsistency: [
        { year: 2023, score: 72, keyChanges: ['Nay vote on H.R.2 border bill'] },
        { year: 2024, score: 75, keyChanges: ['Cuba policy statements'] },
        { year: 2025, score: 74, keyChanges: [] },
      ],
    },
  }),

  scaffold({
    id: 'rep-donalds',
    bioguideId: 'D000032',
    name: 'Byron Donalds',
    firstName: 'Byron',
    lastName: 'Donalds',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    district: '19th',
    chamber: 'house',
    level: 'federal',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Byron Donalds represents FL-19 (Southwest Florida including Naples/Fort Myers). Former state legislator. Member of House Freedom Caucus; considered for 2024 VP slot.',
    topIssues: [
      {
        name: 'Fiscal Policy',
        position: 'Debt ceiling hardliner; spending cuts',
        detail: 'Voted against debt ceiling deals without commensurate spending reductions.',
        category: 'Economy',
        evidence: [
          { type: 'vote', description: 'Voted NAY on Fiscal Responsibility Act (2023 debt ceiling deal) — argued insufficient spending cuts.', date: '2023-05-31', source: CONGRESS_GOV },
          { type: 'statement', description: 'Freedom Caucus statement demanding $4T in spending cuts as condition for debt ceiling increase.', date: '2023-04-19', source: GOVTRACK },
          {
            type: 'action',
            description: 'Filed Periodic Transaction Reports with the House Clerk disclosing stock and cryptocurrency transactions (STOCK Act), including PTR #20033747 (signed 2026-01-07).',
            date: '2026-01-07',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033747.pdf',
              tier: 'official',
              date: '2026-06-23',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        ] as EvidenceItem[],
      },
      {
        name: 'Energy',
        position: 'Domestic oil and gas production',
        detail: 'Opposes Green New Deal; supports Gulf of Mexico drilling expansion.',
        category: 'Environment',
        evidence: [
          { type: 'vote', description: 'Voted NAY on Inflation Reduction Act (2022) citing climate spending and methane fee provisions.', date: '2022-08-12', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Co-sponsored H.R.1 Lower Energy Costs Act expanding federal lease sales.', date: '2023-03-30', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 71,
      partyLineVotePercentage: 96,
      lobbyistAlignmentPercentage: 42,
      campaignPromises: [
        {
          id: 'don-cp1',
          issue: 'Debt Ceiling / Spending Cuts',
          statement: 'Freedom Caucus statement demanding $4T in spending cuts as condition for debt ceiling increase.',
          category: 'Economy',
          status: 'Kept',
          said: {
            summary:
              'Freedom Caucus statement demanding $4T in spending cuts as condition for debt ceiling increase.',
            date: '2023-04-19',
            source: GOVTRACK,
          },
          did: {
            summary:
              'Voted NAY on Fiscal Responsibility Act (2023 debt ceiling deal), citing insufficient spending cuts.',
            date: '2023-05-31',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'don-cp2',
          issue: 'Domestic Energy Production',
          statement: 'Opposes Green New Deal; supports Gulf of Mexico drilling expansion.',
          category: 'Environment',
          status: 'In Progress',
          said: {
            summary: 'Public position opposing Green New Deal and supporting expanded Gulf of Mexico drilling.',
            date: '2023-03-30',
            source: CONGRESS_GOV,
          },
          did: {
            summary: 'Co-sponsored H.R.1 Lower Energy Costs Act expanding federal lease sales.',
            date: '2023-03-30',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'don-cp3',
          issue: 'STOCK Act Disclosures',
          statement: 'Periodic transaction reports filed with the House Clerk under the STOCK Act.',
          category: 'Ethics',
          status: 'Kept',
          said: {
            summary: 'STOCK Act requires members to disclose stock and cryptocurrency transactions within statutory windows.',
            date: '2012-04-04',
            source: {
              name: 'STOCK Act (P.L. 112-105)',
              url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038',
              tier: 'official',
              description: 'Federal financial disclosure law for Congress',
            },
          },
          did: {
            summary:
              'Filed House PTR #20033747 (signed 2026-01-07) and subsequent PTRs including CMG and LLY transactions disclosed May 2026.',
            date: '2026-01-07',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033747.pdf',
              tier: 'official',
              date: '2026-06-23',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        },
      ],
      termConsistency: [
        { year: 2023, score: 70, keyChanges: ['Nay vote on debt ceiling deal'] },
        { year: 2024, score: 72, keyChanges: ['Energy lease co-sponsorships'] },
        { year: 2025, score: 71, keyChanges: [] },
      ],
    },
  }),

  scaffold({
    id: 'rep-wilson',
    bioguideId: 'W000808',
    name: 'Frederica Wilson',
    firstName: 'Frederica',
    lastName: 'Wilson',
    party: 'Democrat',
    state: 'Florida',
    stateCode: 'FL',
    district: '24th',
    chamber: 'house',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/W000808.jpg',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Frederica Wilson represents FL-24 (Miami Gardens, North Miami, parts of Broward). Former school principal and state legislator. Known for distinctive cowboy hats and education advocacy.',
    topIssues: [
      {
        name: 'Education',
        position: 'Teacher pay raises; HBCU funding',
        detail: 'Authored legislation increasing federal teacher minimum salary grants and HBCU infrastructure funding.',
        category: 'Education',
        evidence: [
          { type: 'legislation', description: 'Introduced H.R.1041 — American Teacher Act establishing $60,000 federal minimum teacher salary grant program.', date: '2023-02-14', source: CONGRESS_GOV },
          { type: 'vote', description: 'Voted YEA on CHIPS and Science Act including STEM education funding for HBCUs.', date: '2022-07-28', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Haiti Policy',
        position: 'Temporary Protected Status; humanitarian aid',
        detail: 'Advocates extended TPS for Haitian nationals and increased aid amid gang violence crisis.',
        category: 'Foreign Policy',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored H.R.4693 Haiti Criminal Collusion Transparency Act targeting corruption networks.', date: '2023-07-14', source: CONGRESS_GOV },
          { type: 'statement', description: 'Called for international security mission to Haiti in House Foreign Affairs Committee hearing.', date: '2024-03-07', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
    ],
  }),

  scaffold({
    id: 'rep-mast',
    bioguideId: 'M001199',
    name: 'Brian Mast',
    firstName: 'Brian',
    lastName: 'Mast',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    district: '21st',
    chamber: 'house',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/M001199.jpg',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Brian Mast represents FL-21 (Treasure Coast/Palm Beach). Army veteran who lost both legs in Afghanistan. Serves on Foreign Affairs and Transportation committees.',
    topIssues: [
      {
        name: 'Veterans',
        position: 'VA reform; toxic exposure benefits',
        detail: 'Advocated for burn pit veterans benefits; supports VA community care expansion.',
        category: 'Healthcare',
        evidence: [
          { type: 'vote', description: 'Voted YEA on Honoring Our PACT Act (2022) expanding VA care for toxic exposure.', date: '2022-08-02', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Introduced Veterans Accessibility Act requiring VA facility ADA compliance audits.', date: '2024-01-18', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Environment',
        position: 'Everglades restoration; Lake Okeechobee management',
        detail: 'Supports federal funding for Everglades restoration and opposes harmful discharges.',
        category: 'Environment',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored Everglades Restoration Act increasing Army Corps funding for CERP projects.', date: '2023-06-22', source: CONGRESS_GOV },
          { type: 'statement', description: 'Public statement opposing Lake Okeechobee discharge schedules harming St. Lucie estuary.', date: '2024-02-28', source: AP },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 81,
      partyLineVotePercentage: 92,
      lobbyistAlignmentPercentage: 22,
      campaignPromises: [
        {
          id: 'mast-cp1',
          issue: 'Veterans Toxic Exposure',
          statement: 'Advocated for burn pit veterans benefits; supports VA community care expansion.',
          category: 'Healthcare',
          status: 'Kept',
          said: {
            summary:
              'Public advocacy for expanded VA care for veterans exposed to burn pits and toxic substances.',
            date: '2022-07-15',
            source: CONGRESS_GOV,
          },
          did: {
            summary: 'Voted YEA on Honoring Our PACT Act (2022) expanding VA care for toxic exposure.',
            date: '2022-08-02',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'mast-cp2',
          issue: 'Everglades Restoration',
          statement: 'Supports federal funding for Everglades restoration and opposes harmful discharges.',
          category: 'Environment',
          status: 'In Progress',
          said: {
            summary:
              'Public statement opposing Lake Okeechobee discharge schedules harming the St. Lucie estuary.',
            date: '2024-02-28',
            source: AP,
          },
          did: {
            summary: 'Co-sponsored Everglades Restoration Act increasing Army Corps funding for CERP projects.',
            date: '2023-06-22',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'mast-cp3',
          issue: 'STOCK Act Disclosures',
          statement: 'Periodic transaction reports filed with the House Clerk under the STOCK Act.',
          category: 'Ethics',
          status: 'Kept',
          said: {
            summary: 'STOCK Act requires members to disclose stock transactions within statutory windows.',
            date: '2012-04-04',
            source: {
              name: 'STOCK Act (P.L. 112-105)',
              url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038',
              tier: 'official',
              description: 'Federal financial disclosure law for Congress',
            },
          },
          did: {
            summary:
              'Filed House PTR #20024743 per House Clerk financial disclosure records.',
            date: '2026-01-07',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20024743.pdf',
              tier: 'official',
              date: '2026-06-23',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        },
      ],
      termConsistency: [
        { year: 2023, score: 80, keyChanges: ['Everglades co-sponsorships'] },
        { year: 2024, score: 82, keyChanges: ['Lake Okeechobee discharge statements'] },
        { year: 2025, score: 81, keyChanges: [] },
      ],
    },
  }),

  scaffold({
    id: 'rep-franklin',
    bioguideId: 'F000472',
    name: 'Scott Franklin',
    firstName: 'Scott',
    lastName: 'Franklin',
    party: 'Republican',
    state: 'Florida',
    stateCode: 'FL',
    district: '18th',
    chamber: 'house',
    level: 'federal',
    termStart: '2023-01-03',
    nextElection: '2026',
    bio: 'Scott Franklin represents FL-18 (Polk County/Lakeland). Navy veteran and former mayor of Lakeland. Serves on Armed Services and Science committees.',
    topIssues: [
      {
        name: 'Defense',
        position: 'Increased military spending; space force priorities',
        detail: 'Advocates for Space Force funding and Florida space coast defense contracts.',
        category: 'Defense',
        evidence: [
          { type: 'vote', description: 'Voted YEA on NDAA FY2024 ($886B authorization).', date: '2023-12-14', source: CONGRESS_GOV },
          { type: 'legislation', description: 'Co-sponsored Space National Guard Establishment Act.', date: '2024-04-10', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Agriculture',
        position: 'Florida citrus industry support',
        detail: 'Advocates federal relief for citrus greening disease affecting Florida groves.',
        category: 'Economy',
        evidence: [
          { type: 'legislation', description: 'Co-sponsored Citrus Disease Research and Development Act extending USDA research funding.', date: '2023-11-02', source: CONGRESS_GOV },
          { type: 'statement', description: 'Requested USDA emergency declaration for Hurricane Ian citrus crop losses.', date: '2022-11-15', source: AP },
        ] as EvidenceItem[],
      },
    ],
    consistency: {
      overallScore: 79,
      partyLineVotePercentage: 95,
      lobbyistAlignmentPercentage: 35,
      campaignPromises: [
        {
          id: 'frank-cp1',
          issue: 'Defense Authorization',
          statement: 'Advocates for Space Force funding and Florida space coast defense contracts.',
          category: 'Defense',
          status: 'Kept',
          said: {
            summary:
              'Public advocacy for increased military spending and Space Force priorities for Florida space coast.',
            date: '2023-12-01',
            source: CONGRESS_GOV,
          },
          did: {
            summary: 'Voted YEA on NDAA FY2024 ($886B authorization).',
            date: '2023-12-14',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'frank-cp2',
          issue: 'Florida Citrus Industry',
          statement: 'Advocates federal relief for citrus greening disease affecting Florida groves.',
          category: 'Economy',
          status: 'In Progress',
          said: {
            summary:
              'Requested USDA emergency declaration for Hurricane Ian citrus crop losses in Florida.',
            date: '2022-11-15',
            source: AP,
          },
          did: {
            summary: 'Co-sponsored Citrus Disease Research and Development Act extending USDA research funding.',
            date: '2023-11-02',
            source: CONGRESS_GOV,
          },
        },
        {
          id: 'frank-cp3',
          issue: 'STOCK Act Disclosures',
          statement: 'Periodic transaction reports filed with the House Clerk under the STOCK Act.',
          category: 'Ethics',
          status: 'Kept',
          said: {
            summary: 'STOCK Act requires members to disclose stock transactions within statutory windows.',
            date: '2012-04-04',
            source: {
              name: 'STOCK Act (P.L. 112-105)',
              url: 'https://www.congress.gov/bill/112th-congress/senate-bill/2038',
              tier: 'official',
              description: 'Federal financial disclosure law for Congress',
            },
          },
          did: {
            summary:
              'Filed House PTR #20034050 (disclosed 2026-02-12) including Hershey Company sales per House Clerk records.',
            date: '2026-02-12',
            source: {
              name: 'House Clerk Financial Disclosure',
              url: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034050.pdf',
              tier: 'official',
              date: '2026-06-23',
              description: 'STOCK Act PTR filed with the U.S. House',
            },
          },
        },
      ],
      termConsistency: [
        { year: 2023, score: 78, keyChanges: ['NDAA Yea vote; citrus research co-sponsorship'] },
        { year: 2024, score: 80, keyChanges: ['Space National Guard co-sponsorship'] },
        { year: 2025, score: 79, keyChanges: [] },
      ],
    },
  }),

  // ── Kentucky (supplement featured state) ──────────────────────────────────
  scaffold({
    id: 'sen-paul',
    bioguideId: 'P000603',
    name: 'Rand Paul',
    firstName: 'Rand',
    lastName: 'Paul',
    party: 'Republican',
    state: 'Kentucky',
    stateCode: 'KY',
    chamber: 'senate',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/P000603.jpg',
    termStart: '2023-01-03',
    nextElection: '2028',
    bio: 'Rand Paul has served as U.S. Senator from Kentucky since 2011. Ophthalmologist; libertarian-leaning Republican. Known for filibusters on surveillance and spending.',
    topIssues: [
      {
        name: 'Civil Liberties',
        position: 'Anti-surveillance; oppose FISA reauthorization',
        detail: 'Led opposition to NSA bulk data collection and Patriot Act extensions.',
        category: 'Civil Liberties',
        evidence: [
          { type: 'vote', description: 'Voted NAY on S.3908 FISA Section 702 reauthorization (2024).', date: '2024-04-12', source: SENATE_GOV },
          { type: 'legislation', description: 'Introduced Fourth Amendment is Not For Sale Act restricting government purchase of personal data.', date: '2023-04-18', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Foreign Policy',
        position: 'Non-interventionist; skeptical of Ukraine aid',
        detail: 'Opposed large Ukraine aid packages; advocates diplomatic solutions.',
        category: 'Foreign Policy',
        evidence: [
          { type: 'vote', description: 'Voted NAY on Ukraine Security Supplemental ($61B) — April 2024.', date: '2024-04-23', source: SENATE_GOV },
          { type: 'statement', description: 'Floor speech arguing Ukraine aid lacks oversight and prolongs conflict without exit strategy.', date: '2024-04-23', source: SENATE_GOV },
        ] as EvidenceItem[],
      },
    ],
  }),

  // ── New York (supplement featured state) ──────────────────────────────────
  scaffold({
    id: 'sen-schumer',
    bioguideId: 'S000148',
    name: 'Chuck Schumer',
    firstName: 'Chuck',
    lastName: 'Schumer',
    party: 'Democrat',
    state: 'New York',
    stateCode: 'NY',
    chamber: 'senate',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/S000148.jpg',
    termStart: '2023-01-03',
    nextElection: '2028',
    bio: 'Chuck Schumer is Senate Majority Leader and senior senator from New York since 1999. Former House member; key architect of CHIPS Act and Inflation Reduction Act.',
    topIssues: [
      {
        name: 'Economy',
        position: 'Industrial policy; CHIPS Act champion',
        detail: 'Led Senate passage of semiconductor subsidies and climate investment legislation.',
        category: 'Economy',
        evidence: [
          { type: 'vote', description: 'Voted YEA on CHIPS and Science Act (2022) — $52.7B semiconductor subsidies.', date: '2022-07-27', source: SENATE_GOV },
          { type: 'action', description: 'As Majority Leader, scheduled and managed floor process for Inflation Reduction Act passage (2022).', date: '2022-08-07', source: CONGRESS_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Healthcare',
        position: 'Medicare drug price negotiation',
        detail: 'Supported IRA provisions allowing Medicare to negotiate drug prices.',
        category: 'Healthcare',
        evidence: [
          { type: 'vote', description: 'Voted YEA on Inflation Reduction Act including Medicare negotiation authority.', date: '2022-08-07', source: SENATE_GOV },
          { type: 'statement', description: 'Public statement claiming IRA would cap insulin at $35/month for Medicare beneficiaries.', date: '2022-08-07', source: AP },
        ] as EvidenceItem[],
      },
    ],
  }),

  scaffold({
    id: 'sen-gillibrand',
    bioguideId: 'G000555',
    name: 'Kirsten Gillibrand',
    firstName: 'Kirsten',
    lastName: 'Gillibrand',
    party: 'Democrat',
    state: 'New York',
    stateCode: 'NY',
    chamber: 'senate',
    level: 'federal',
    imageUrl: 'https://theunitedstates.io/images/congress/450x550/G000555.jpg',
    termStart: '2023-01-03',
    nextElection: '2030',
    bio: 'Kirsten Gillibrand has served as U.S. Senator from New York since 2009. Former House member. Advocates for military sexual assault reform and paid family leave.',
    topIssues: [
      {
        name: 'Military Justice',
        position: 'Independent prosecutor for sexual assault cases',
        detail: 'Led decade-long effort to remove commanders from sexual assault prosecution decisions.',
        category: 'Defense',
        evidence: [
          { type: 'legislation', description: 'Authored Military Justice Improvement Act provisions incorporated into FY2022 NDAA.', date: '2021-12-15', source: CONGRESS_GOV },
          { type: 'vote', description: 'Voted YEA on NDAA FY2022 with independent special trial counsel for sexual assault.', date: '2021-12-15', source: SENATE_GOV },
        ] as EvidenceItem[],
      },
      {
        name: 'Paid Family Leave',
        position: 'Federal paid leave program',
        detail: 'Introduced FAMILY Act creating national paid family and medical leave insurance.',
        category: 'Economy',
        evidence: [
          { type: 'legislation', description: 'Introduced S.463 — Family and Medical Insurance Leave (FAMILY) Act (2023).', date: '2023-02-28', source: CONGRESS_GOV },
          { type: 'statement', description: 'Advocated for paid leave inclusion in Build Back Better reconciliation package.', date: '2021-10-28', source: AP },
        ] as EvidenceItem[],
      },
    ],
  }),
];
