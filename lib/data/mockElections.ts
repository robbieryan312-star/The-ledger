import { Election, EvidenceItem } from '../types';

const CONGRESS_GOV = { name: 'Congress.gov', url: 'https://www.congress.gov', tier: 'official' as const };
const BALLOTPEDIA = { name: 'Ballotpedia', url: 'https://ballotpedia.org', tier: 'nonpartisan' as const };
const FL_GOV = { name: 'FL Office of the Governor', url: 'https://www.flgov.com', tier: 'official' as const };
const AP = { name: 'Associated Press', url: 'https://apnews.com', tier: 'nonpartisan' as const };

export const mockElections: Election[] = [
  // ── U.S. PRESIDENTIAL ELECTION 2028 ──────────────────────────────────────
  // Trump is constitutionally term-limited (two non-consecutive terms: 2017-2021, 2025-2029).
  // Both parties are in the early primary phase as of June 2026.
  // Primary probabilities are illustrative estimates based on polling averages — see
  // RealClearPolitics.com and FiveThirtyEight for live aggregates.
  {
    id: 'us-president-2028',
    title: 'U.S. Presidential Election 2028 — Primary Phase',
    date: '2028-11-07',
    state: 'National',
    stateCode: 'NAT',
    level: 'federal',
    office: 'President of the United States',
    chamber: 'president',
    isUpcoming: true,
    isPrimary: true,
    dataNote: 'Both parties are in early primary phases. Primary probabilities are illustrative estimates — verify at RealClearPolitics.com.',
    raceRating: 'Toss-up',
    raceRatingSource: 'Illustrative — too early to project',
    candidates: [
      {
        id: 'pres-r-vance',
        name: 'JD Vance',
        party: 'Republican',
        primaryProbability: 38,
        fundsRaised: 12400000,
        endorsements: ['Donald Trump', 'Heritage Foundation'],
        topIssues: [
          { name: 'Economy', position: 'Industrial revival; tariff policy', detail: 'Advocates reshoring manufacturing via tariffs and industrial policy; aligns with Trump economic nationalism', category: 'Economy' },
          { name: 'Immigration', position: 'Mass deportation; border wall', detail: 'Strong supporter of Trump-era immigration enforcement; continues VP-era policy', category: 'Immigration' },
          { name: 'Foreign Policy', position: 'Non-interventionist; skeptic of NATO expansion', detail: 'Skeptical of Ukraine aid; favors reorienting U.S. foreign policy away from Europe toward Asia', category: 'Foreign Policy' },
        ],
      },
      {
        id: 'pres-r-desantis',
        name: 'Ron DeSantis',
        party: 'Republican',
        primaryProbability: 22,
        fundsRaised: 8100000,
        endorsements: ['FL Republican Party'],
        topIssues: [
          { name: 'Education', position: 'Parental rights; oppose DEI in schools', detail: 'Signed Stop WOKE Act, HB 1467 book review law, and expanded school choice in Florida', category: 'Education' },
          { name: 'Economy', position: 'Deregulation; tax cuts', detail: 'Promoted Florida as low-tax business destination; touts job growth during governorship', category: 'Economy' },
          { name: 'Healthcare', position: 'Oppose vaccine mandates; medical freedom', detail: 'Led Florida opposition to federal COVID-19 vaccination mandates for businesses', category: 'Healthcare' },
        ],
      },
      {
        id: 'pres-r-rubio',
        name: 'Marco Rubio',
        party: 'Republican',
        primaryProbability: 18,
        fundsRaised: 6700000,
        endorsements: ['FL Republican Party'],
        topIssues: [
          { name: 'Foreign Policy', position: 'Strong U.S.-Israel alliance; China hawkishness', detail: 'Former Senate Foreign Relations member; Secretary of State under Trump; known China and Iran hawk', category: 'Foreign Policy' },
          { name: 'Economy', position: 'Tax cuts; pro-business', detail: 'Authored child tax credit expansion in 2017 Tax Cuts and Jobs Act; supports reducing corporate tax', category: 'Economy' },
          { name: 'Immigration', position: 'Secure border; reformed legal immigration', detail: 'Co-authored 2013 Gang of Eight immigration reform bill; reversed to enforcement-first stance', category: 'Immigration' },
        ],
      },
      {
        id: 'pres-d-newsom',
        name: 'Gavin Newsom',
        party: 'Democrat',
        primaryProbability: 32,
        fundsRaised: 14200000,
        endorsements: ['CA Democratic Party', 'CA Labor Federation'],
        topIssues: [
          { name: 'Climate', position: '100% clean electricity by 2035; ban gas car sales', detail: 'Signed AB 205 and SB 100; CA first state to mandate all new vehicle sales be zero-emission by 2035', category: 'Environment' },
          { name: 'Healthcare', position: 'Universal coverage; Medi-Cal expansion', detail: 'Signed CA universal single-payer framework; expanded Medi-Cal to all income-eligible adults regardless of immigration status', category: 'Healthcare' },
          { name: 'Economy', position: 'Tech innovation; progressive taxation', detail: 'Defended CA tech industry; supports wealth tax on top earners and capital gains reforms', category: 'Economy' },
        ],
      },
      {
        id: 'pres-d-whitmer',
        name: 'Gretchen Whitmer',
        party: 'Democrat',
        primaryProbability: 25,
        fundsRaised: 9300000,
        endorsements: ['MI Democratic Party', 'UAW'],
        topIssues: [
          { name: 'Economy', position: 'Rebuild middle class; union jobs', detail: 'Rebuilt Michigan roads, signed "Fix the Damn Roads" plan; championed EV battery manufacturing in MI', category: 'Economy' },
          { name: 'Reproductive Rights', position: 'Codify Roe; full abortion access', detail: 'Fought Michigan abortion ban after Dobbs; led Prop 3 (2022) to enshrine abortion rights in MI constitution', category: 'Healthcare' },
          { name: 'Education', position: 'Universal pre-K; free community college', detail: 'Signed MI free community college law (Michigan Achievement Scholarship); pre-K expansion', category: 'Education' },
        ],
      },
      {
        id: 'pres-d-harris',
        name: 'Kamala Harris',
        party: 'Democrat',
        primaryProbability: 18,
        fundsRaised: 11800000,
        endorsements: ['AFSCME', 'Planned Parenthood Action Fund'],
        topIssues: [
          { name: 'Reproductive Rights', position: 'Restore Roe v. Wade; federal protection', detail: '2024 presidential nominee; made reproductive rights centerpiece of campaign; favors federal legislation', category: 'Healthcare' },
          { name: 'Economy', position: 'Middle-class tax cuts; housing affordability', detail: '2024 platform: $6,000 child tax credit, $25,000 first-time homebuyer assistance, cap on rent increases', category: 'Economy' },
          { name: 'Immigration', position: 'Bipartisan border deal; legal pathway for DACA', detail: 'Championed bipartisan Senate border security bill (Feb 2024) that was blocked; supports DACA protections', category: 'Immigration' },
        ],
      },
    ],
    polls: [
      {
        pollster: 'Morning Consult',
        methodology: 'Online Panel',
        sourceBias: 'Center',
        date: '2026-05',
        sampleSize: 3842,
        marginOfError: 1.6,
        pollType: 'primary',
        results: [
          { candidateId: 'pres-r-vance', percentage: 34 },
          { candidateId: 'pres-r-desantis', percentage: 22 },
          { candidateId: 'pres-r-rubio', percentage: 18 },
        ],
      },
      {
        pollster: 'Morning Consult',
        methodology: 'Online Panel',
        sourceBias: 'Center',
        date: '2026-05',
        sampleSize: 2914,
        marginOfError: 1.8,
        pollType: 'primary',
        results: [
          { candidateId: 'pres-d-newsom', percentage: 28 },
          { candidateId: 'pres-d-whitmer', percentage: 24 },
          { candidateId: 'pres-d-harris', percentage: 19 },
        ],
      },
    ],
  },

  // ── FLORIDA GOVERNOR 2026 ─────────────────────────────────────────────────
  // Source: Ballotpedia.org — verify current candidates at ballotpedia.org/Florida_gubernatorial_election,_2026
  // FL U.S. Senate seats (Scott, Moody) are not on the 2026 ballot; U.S. House district
  // races are not integrated here — see additionalBallotRacesNote on the state map panel.
  {
    id: 'fl-gov-2026',
    title: 'Florida Governor 2026 — Open Seat (DeSantis Term-Limited)',
    date: '2026-11-03',
    state: 'Florida',
    stateCode: 'FL',
    level: 'state',
    office: 'Governor',
    chamber: 'governor',
    isUpcoming: true,
    isPrimary: false,
    registrationDeadline: '2026-10-06',
    earlyVotingStart: '2026-10-24',
    dataNote: 'Candidate field is actively forming. Verify at Ballotpedia.org or dos.myflorida.com.',
    raceRating: 'Likely R',
    raceRatingSource: 'Illustrative — based on FL partisan trend',
    candidates: [
      {
        id: 'c-donalds',
        name: 'Byron Donalds',
        party: 'Republican',
        incumbentId: 'rep-donalds',
        winProbability: 65,
        fundsRaised: 8700000,
        endorsements: ['Donald Trump', 'FL Republican Party'],
        topIssues: [
          {
            name: 'Economy',
            position: 'Lower taxes; business growth; fiscal conservatism',
            detail: 'Member of House Budget Committee; strong record opposing deficit spending and tax increases',
            category: 'Economy',
            evidence: [
              { type: 'vote', description: 'Voted NAY on Fiscal Responsibility Act (2023 debt ceiling deal) citing insufficient spending cuts.', date: '2023-05-31', source: CONGRESS_GOV },
              { type: 'statement', description: 'Campaign launch speech pledged to continue DeSantis-era low-tax, pro-business Florida model statewide.', date: '2025-11-12', source: AP },
            ] as EvidenceItem[],
          },
          {
            name: 'Border / Immigration',
            position: 'Strict enforcement; oppose sanctuary policies',
            detail: 'Consistent vote record on border security legislation; ally of Trump immigration agenda',
            category: 'Immigration',
            evidence: [
              { type: 'vote', description: 'Voted YEA on H.R.2 Secure the Border Act (2023).', date: '2023-05-11', source: CONGRESS_GOV },
              { type: 'legislation', description: 'Co-sponsored Laken Riley Act requiring ICE detention for certain undocumented arrestees.', date: '2024-01-12', source: CONGRESS_GOV },
              { type: 'statement', description: 'Endorsed Florida SB 1718-style E-Verify mandates as model for federal policy.', date: '2025-10-20', source: BALLOTPEDIA },
            ] as EvidenceItem[],
          },
          {
            name: 'Education',
            position: 'School choice; parental rights',
            detail: 'Supports Family Empowerment Scholarship expansion and continuation of DeSantis education agenda',
            category: 'Education',
            evidence: [
              { type: 'vote', description: 'Voted YEA on Parents Bill of Rights Act (2023).', date: '2023-03-24', source: CONGRESS_GOV },
              { type: 'action', description: 'Publicly pledged to sign universal school choice expansion as governor, citing HB 1 (2023) model.', date: '2025-09-08', source: FL_GOV },
            ] as EvidenceItem[],
          },
        ],
      },
      {
        id: 'c-fishback',
        name: 'James Fishback',
        party: 'Democrat',
        winProbability: 35,
        fundsRaised: 3200000,
        endorsements: ['FL Democratic Party'],
        topIssues: [
          {
            name: 'Economy',
            position: 'AI & workforce investment; economic opportunity',
            detail: 'Entrepreneur and advocate for AI-driven economic growth and job training programs',
            category: 'Economy',
            evidence: [
              { type: 'statement', description: 'Campaign platform proposes $500M state AI workforce training fund and venture capital tax credits.', date: '2025-12-01', source: BALLOTPEDIA },
              { type: 'action', description: 'Founded Agorism Inc., an investment firm focused on Florida tech startups — cited as policy experience.', date: '2024-06-15', source: AP },
            ] as EvidenceItem[],
          },
          {
            name: 'Healthcare',
            position: 'Expand healthcare access; repeal 6-week ban',
            detail: 'Supports reproductive rights restoration and Medicaid expansion in Florida',
            category: 'Healthcare',
            evidence: [
              { type: 'statement', description: 'Pledged to restore abortion access to 15-week threshold and expand Medicaid if elected.', date: '2025-11-20', source: AP },
              { type: 'legislation', description: 'Endorsed Florida Democratic legislative package to expand ACA marketplace outreach.', date: '2025-10-05', source: BALLOTPEDIA },
            ] as EvidenceItem[],
          },
          {
            name: 'Education',
            position: 'Increase teacher pay; reverse book restrictions',
            detail: 'Opposes HB 1467 book review mandates; supports public school funding',
            category: 'Education',
            evidence: [
              { type: 'statement', description: 'Campaign calls for repealing mandatory library book review process enacted under HB 1467.', date: '2025-11-15', source: AP },
              { type: 'action', description: 'Proposed $10,000 minimum teacher salary grant program modeled on federal American Teacher Act.', date: '2025-12-10', source: BALLOTPEDIA },
            ] as EvidenceItem[],
          },
        ],
      },
    ],
    polls: [
      {
        pollster: 'Quinnipiac University',
        methodology: 'Live Phone',
        sourceBias: 'Nonpartisan',
        date: '2026-05',
        sampleSize: 923,
        marginOfError: 3.5,
        pollType: 'general',
        results: [
          { candidateId: 'c-donalds', percentage: 52 },
          { candidateId: 'c-fishback', percentage: 41 },
        ],
      },
    ],
  },

  // ── CALIFORNIA GOVERNOR 2026 ──────────────────────────────────────────────
  // Newsom is constitutionally term-limited (two consecutive terms) — cannot seek third consecutive term.
  // Source: Ballotpedia.org — verify at ballotpedia.org/California_gubernatorial_election,_2026
  {
    id: 'ca-gov-2026',
    title: 'California Governor 2026 — Open Seat (Newsom Term-Limited)',
    date: '2026-11-04',
    state: 'California',
    stateCode: 'CA',
    level: 'state',
    office: 'Governor',
    chamber: 'governor',
    isUpcoming: true,
    isPrimary: false,
    registrationDeadline: '2026-10-19',
    earlyVotingStart: '2026-10-05',
    dataNote: 'This is an open-seat race. The candidate field is actively forming. Verify at Ballotpedia.org.',
    raceRating: 'Solid D',
    raceRatingSource: 'Illustrative — based on CA partisan trend',
    candidates: [
      {
        id: 'ca-c1',
        name: 'Eleni Kounalakis',
        party: 'Democrat',
        winProbability: 72,
        fundsRaised: 11400000,
        endorsements: ['CA Democratic Party', 'CA Labor Federation'],
        topIssues: [
          { name: 'Climate', position: 'Carbon neutrality; clean energy economy', detail: "Current Lt. Governor; strong climate record including support for CA's 100% clean energy grid mandate", category: 'Environment' },
          { name: 'Housing', position: 'Streamline permitting; build more housing', detail: "Supports housing supply legislation to reduce California's housing shortage", category: 'Housing' },
          { name: 'Economy', position: 'Tech and clean energy job growth', detail: 'Focus on keeping California competitive in technology and emerging industries', category: 'Economy' },
        ],
      },
      {
        id: 'ca-c2',
        name: 'Republican Candidate TBD',
        party: 'Republican',
        winProbability: 28,
        fundsRaised: 0,
        endorsements: [],
        topIssues: [
          { name: 'Economy', position: 'Reduce taxes and regulations', detail: 'Field actively forming — see Ballotpedia.org for current declared candidates', category: 'Economy' },
        ],
      },
    ],
    polls: [
      {
        pollster: 'UC Berkeley Institute of Governmental Studies',
        methodology: 'Online Panel',
        sourceBias: 'Nonpartisan',
        date: '2026-04',
        sampleSize: 1573,
        marginOfError: 2.5,
        pollType: 'general',
        results: [
          { candidateId: 'ca-c1', percentage: 58 },
          { candidateId: 'ca-c2', percentage: 29 },
        ],
      },
    ],
  },

  // ── TEXAS U.S. SENATE 2026 ────────────────────────────────────────────────
  // Sen. John Cornyn (R) is up for re-election in 2026. Ted Cruz won re-election in 2024.
  // Source: Ballotpedia.org — verify at ballotpedia.org/United_States_Senate_election_in_Texas,_2026
  {
    id: 'tx-sen-2026',
    title: 'Texas U.S. Senate 2026 — Cornyn Re-Election',
    date: '2026-11-03',
    state: 'Texas',
    stateCode: 'TX',
    level: 'federal',
    office: 'U.S. Senate',
    chamber: 'senate',
    isUpcoming: true,
    isPrimary: false,
    registrationDeadline: '2026-10-05',
    dataNote: 'Democratic challenger field not yet declared. Verify at Ballotpedia.org.',
    raceRating: 'Solid R',
    raceRatingSource: 'Illustrative — based on TX partisan trend and incumbent advantage',
    candidates: [
      {
        id: 'tx-c1',
        name: 'John Cornyn',
        party: 'Republican',
        winProbability: 72,
        approvalRating: 44,
        approvalPollster: 'University of Texas / Texas Tribune',
        approvalSampleSize: 1247,
        approvalDate: '2026-04',
        fundsRaised: 18900000,
        endorsements: ['TX Republican Party', 'NRA', 'TX Oil & Gas Association'],
        incumbentId: 'john-cornyn',
        topIssues: [
          { name: 'National Security', position: 'Strong defense; intelligence funding', detail: 'Member of Senate Intelligence and Finance committees; known for bipartisan work on gun background check reform (Bipartisan Safer Communities Act, 2022)', category: 'National Security' },
          { name: 'Energy', position: 'Fossil fuel protection; LNG exports', detail: 'Strong supporter of Texas oil, gas, and LNG industry; opposes EPA restrictions on energy production', category: 'Economy' },
          { name: 'Border Security', position: 'Physical barrier; enhanced enforcement', detail: "One of Senate's longest-serving immigration hardliners; supports border wall and increased deportation funding", category: 'Immigration' },
        ],
      },
      {
        id: 'tx-c2',
        name: 'Democratic Challenger TBD',
        party: 'Democrat',
        winProbability: 28,
        fundsRaised: 0,
        endorsements: [],
        topIssues: [
          { name: 'Healthcare', position: 'Expand Medicaid; protect ACA', detail: 'Field forming — see Ballotpedia.org for current declared candidates', category: 'Healthcare' },
        ],
      },
    ],
    polls: [
      {
        pollster: 'University of Texas / Texas Tribune',
        methodology: 'Live Phone',
        sourceBias: 'Nonpartisan',
        date: '2026-04',
        sampleSize: 1241,
        marginOfError: 2.8,
        pollType: 'general',
        results: [
          { candidateId: 'tx-c1', percentage: 54 },
          { candidateId: 'tx-c2', percentage: 31 },
        ],
      },
    ],
  },

  // ── NEW YORK 14TH CONGRESSIONAL 2024 (completed) ─────────────────────────
  {
    id: 'ny-14-2024',
    title: 'New York 14th Congressional District 2024',
    date: '2024-11-05',
    state: 'New York',
    stateCode: 'NY',
    level: 'federal',
    office: 'U.S. House of Representatives',
    chamber: 'house',
    district: '14th',
    isUpcoming: false,
    isPrimary: false,
    candidates: [
      {
        id: 'c5', name: 'Alexandria Ocasio-Cortez', party: 'Democrat',
        topIssues: [
          { name: 'Climate', position: 'Green New Deal', detail: 'Ambitious climate and jobs program', category: 'Environment' },
          { name: 'Healthcare', position: 'Medicare for All', detail: 'Universal single-payer healthcare', category: 'Healthcare' },
        ],
        fundsRaised: 9800000, endorsements: ['NY Democratic Party', 'Working Families Party', 'Sunrise Movement'],
        incumbentId: 'alexandria-ocasio-cortez',
      },
      {
        id: 'c6', name: 'Tina Forte', party: 'Republican',
        topIssues: [
          { name: 'Public Safety', position: 'Increase Policing', detail: 'More police, tougher crime laws', category: 'Public Safety' },
          { name: 'Economy', position: 'Lower Taxes', detail: 'Reduce taxes on small businesses', category: 'Economy' },
        ],
        fundsRaised: 1200000, endorsements: ['NY Republican Party'],
      },
    ],
  },

  // ── CHICAGO MAYOR 2027 ────────────────────────────────────────────────────
  {
    id: 'chicago-mayor-2027',
    title: 'Chicago Mayor 2027',
    date: '2027-02-23',
    state: 'Illinois',
    stateCode: 'IL',
    level: 'local',
    office: 'Mayor',
    chamber: 'mayor',
    isUpcoming: true,
    isPrimary: true,
    registrationDeadline: '2027-02-09',
    dataNote: 'Field actively forming — verify at Ballotpedia.org.',
    raceRating: 'Solid D',
    raceRatingSource: 'Illustrative — Chicago has voted Democratic for mayor since 1927',
    candidates: [
      {
        id: 'c7', name: 'Brandon Johnson', party: 'Democrat',
        approvalRating: 37,
        approvalPollster: 'Chicago Tribune / WGN-TV',
        approvalSampleSize: 701,
        approvalDate: '2026-03',
        topIssues: [
          { name: 'Public Safety', position: 'Community Investment', detail: 'Address root causes of crime through investment', category: 'Public Safety' },
          { name: 'Education', position: 'CPS Funding', detail: 'Increase Chicago Public Schools funding', category: 'Education' },
        ],
        fundsRaised: 5200000, endorsements: ['Chicago Teachers Union', 'IL Democratic Party'],
        incumbentId: 'brandon-johnson',
      },
    ],
  },

  // ── KY-4 2024 PRIMARY — Massie vs AIPAC-backed challenger (completed) ─────
  {
    id: 'ky-4-primary-2024',
    title: "Kentucky 4th Congressional District — 2024 Republican Primary",
    date: '2024-05-21',
    state: 'Kentucky',
    stateCode: 'KY',
    level: 'federal',
    office: 'U.S. House of Representatives',
    chamber: 'house',
    district: '4th',
    isUpcoming: false,
    isPrimary: true,
    candidates: [
      {
        id: 'c-massie',
        name: 'Thomas Massie',
        party: 'Republican',
        topIssues: [
          { name: 'Foreign Aid', position: 'Oppose all foreign aid; America First', detail: 'Voted NO on Ukraine aid, Israel aid, and all foreign assistance bills', category: 'Foreign Policy' },
          { name: 'Fiscal Policy', position: 'Balance the budget; no debt ceiling increases', detail: 'Opposes deficit spending in any form', category: 'Economy' },
        ],
        fundsRaised: 3200000,
        endorsements: ['Ron Paul', 'Rand Paul', 'Club for Growth', 'Gun Owners of America'],
        incumbentId: 'rep-massie',
      },
      {
        id: 'c-ausbrooks',
        name: 'Jimmy Ausbrooks',
        party: 'Republican',
        topIssues: [
          { name: 'Israel Support', position: 'Strong U.S.-Israel alliance; support aid', detail: 'Backed by AIPAC specifically because of support for Israel assistance bills', category: 'Foreign Policy' },
          { name: 'National Security', position: 'Strong defense spending', detail: 'Supports conventional Republican defense posture', category: 'National Security' },
        ],
        fundsRaised: 1400000,
        endorsements: ['AIPAC / United Democracy Project ($1.1M+ in outside spending)', 'Republican Jewish Coalition'],
      },
    ],
  },
];
