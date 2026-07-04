import { CountyData, CountyOfficial } from '@/lib/types';

// Sample county official data — illustrative for demonstration purposes.
// Real production data would integrate with official government directories
// (e.g., NACo, state secretary of state offices, county official websites).

const GOV_SOURCE = { name: 'County Government Website', tier: 'official' as const };
const BALLOTPEDIA = { name: 'Ballotpedia', tier: 'nonpartisan' as const };

export const mockCounties: CountyData[] = [

  // ── FLORIDA ──────────────────────────────────────────────────────────────

  {
    fips: '12086',
    name: 'Miami-Dade',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Miami',
    population: 2701767,
    website: 'https://www.miamidade.gov',
    officials: [
      {
        id: 'miami-dade-mayor',
        name: 'Daniella Levine Cava',
        position: 'County Mayor',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        nextElection: '2024-11',
        bio: 'Elected County Mayor in 2020, the first woman to hold the position. Former social worker and county commissioner. Priorities include climate resilience, affordable housing, and transportation.',
        topIssues: [
          { name: 'Climate Resilience', position: 'Strong supporter of climate adaptation infrastructure', detail: 'Led Miami-Dade Sea Level Rise Strategy; advocated for federal funding for coastal protection.', category: 'Environment', source: GOV_SOURCE },
          { name: 'Affordable Housing', position: 'Expanded housing assistance programs', detail: 'Allocated $100M+ to affordable housing trust fund; supports mixed-income development near transit.', category: 'Housing', source: BALLOTPEDIA },
        ],
        statements: [
          { quote: 'We are the frontline of climate change in America. We don\'t have the luxury of denial.', context: 'Address to the Miami-Dade Board of County Commissioners', date: '2022-03-15', source: GOV_SOURCE },
        ],
      },
      {
        id: 'miami-dade-sa',
        name: 'Katherine Fernandez Rundle',
        position: 'State Attorney (11th Circuit)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'State Attorney for Miami-Dade County since 1993. One of the longest-serving state attorneys in Florida. Focuses on diversion programs for first-time offenders and anti-human trafficking efforts.',
        topIssues: [
          { name: 'Criminal Justice Reform', position: 'Supports diversion programs over prosecution for non-violent offenders', detail: 'Created multiple diversion programs reducing recidivism; prioritizes treatment for addiction-related offenses.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'miami-dade-soe',
        name: 'Christina White',
        position: 'Supervisor of Elections',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Supervisor of Elections since 2018. Oversaw significant election infrastructure upgrades and managed elections during the COVID-19 pandemic, expanding mail-in voting accessibility.',
        topIssues: [
          { name: 'Voter Access', position: 'Expanded early voting locations and mail ballot accessibility', detail: 'Added early voting sites in underserved communities; implemented online vote-by-mail tracking.', category: 'Elections', source: GOV_SOURCE },
        ],
      },
    ],
  },

  {
    fips: '12099',
    name: 'Palm Beach',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'West Palm Beach',
    population: 1492191,
    website: 'https://discover.pbcgov.org',
    zipCodes: ['33401', '33426', '33435', '33444', '33458', '33461', '33467', '33480'],
    mapCenter: [-80.10, 26.65],
    mapZoom: 8.5,
    officials: [
      {
        id: 'palm-beach-sheriff',
        name: 'Ric Bradshaw',
        position: 'Sheriff',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        nextElection: '2028-11',
        website: 'https://www.pbso.org',
        bio: 'Elected Sheriff of Palm Beach County since 2004. Former West Palm Beach police captain. Oversees one of Florida\'s largest law enforcement agencies with emphasis on community policing, school safety, and mental health crisis response teams.',
        topIssues: [
          { name: 'Public Safety', position: 'Expand school resource officers and community policing', detail: 'Increased SRO presence in Palm Beach County schools; launched Real Time Crime Center for faster emergency response.', category: 'Law Enforcement', source: GOV_SOURCE },
          { name: 'Mental Health', position: 'Divert mental health crises from jail to treatment', detail: 'Co-RESPOND program pairs deputies with clinicians for behavioral health calls; reduced Baker Act transports.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
        statements: [
          { quote: 'We cannot arrest our way out of every problem — mental health response saves lives and builds trust.', context: 'Palm Beach County Commission briefing', date: '2023-04-12', source: GOV_SOURCE },
        ],
      },
      {
        id: 'palm-beach-soe',
        name: 'Wendy Sartory Link',
        position: 'Supervisor of Elections',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2028-11',
        nextElection: '2028-11',
        website: 'https://www.pbcelections.org',
        bio: 'Appointed in 2019 and elected in 2020 and 2024. Former attorney and election law specialist. Led post-2020 election audits and modernization of Palm Beach County voting infrastructure.',
        topIssues: [
          { name: 'Election Integrity', position: 'Transparent audits and secure ballot handling', detail: 'Implemented live-streamed ballot tabulation; conducted post-election audits with bipartisan observers.', category: 'Elections', source: GOV_SOURCE },
          { name: 'Voter Access', position: 'Expand early voting and vote-by-mail options', detail: 'Added early voting sites in western Palm Beach County; online ballot tracking for mail voters.', category: 'Elections', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'palm-beach-sa',
        name: 'Dave Aronberg',
        position: 'State Attorney (15th Circuit)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2028-11',
        website: 'https://www.sa15.org',
        bio: 'State Attorney since 2012. Former Florida State Senator and Assistant Attorney General. Focuses on opioid prosecution, human trafficking, and elder fraud. Created Sober Homes Task Force.',
        topIssues: [
          { name: 'Opioid Crisis', position: 'Aggressive prosecution of pill mills and traffickers', detail: 'Convicted operators of illegal sober homes; partnered with DEA on opioid diversion cases.', category: 'Criminal Justice', source: GOV_SOURCE },
          { name: 'Elder Protection', position: 'Combat financial exploitation of seniors', detail: 'Elder Justice Center prosecutes fraud against retirement-age residents; community outreach programs.', category: 'Consumer Protection', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'palm-beach-clerk',
        name: 'Joseph Abruzzo',
        position: 'Clerk & Comptroller',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2028-11',
        website: 'https://www.mypalmbeachclerk.com',
        bio: 'Clerk and Comptroller since 2017. Former Florida State Senator. Manages county records, courts administration, and financial oversight. Expanded online records access for residents.',
        topIssues: [
          { name: 'Government Transparency', position: 'Digitize public records for easier access', detail: 'Online portal for court records, marriage licenses, and property documents; reduced in-person wait times.', category: 'Government', source: GOV_SOURCE },
        ],
      },
      {
        id: 'palm-beach-commissioner',
        name: 'Gregg Weiss',
        position: 'County Commissioner (District 5)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-11',
        nextElection: '2026-11',
        bio: 'County Commissioner representing central Palm Beach County since 2022. Former planning and zoning attorney. Priorities include western communities development, water quality, and responsible growth management.',
        topIssues: [
          { name: 'Growth Management', position: 'Balance development with infrastructure capacity', detail: 'Advocates impact fees for new development; supports western communities road and water improvements.', category: 'Housing', source: BALLOTPEDIA },
          { name: 'Environment', position: 'Protect Lake Okeechobee and local waterways', detail: 'Supports Everglades restoration funding; opposes discharge policies harming coastal estuaries.', category: 'Environment', source: GOV_SOURCE },
        ],
      },
    ],
    elections: [
      {
        id: 'pb-sheriff-2024',
        title: 'Palm Beach County Sheriff',
        office: 'Sheriff',
        date: '2024-11-05',
        isUpcoming: false,
        turnout: 72.4,
        candidates: [
          { name: 'Ric Bradshaw', party: 'Republican', votes: 412850, percentage: 58.2, won: true },
          { name: 'Michael Weinstein', party: 'Democrat', votes: 296420, percentage: 41.8, won: false },
        ],
      },
      {
        id: 'pb-soe-2024',
        title: 'Supervisor of Elections',
        office: 'Supervisor of Elections',
        date: '2024-11-05',
        isUpcoming: false,
        turnout: 72.4,
        candidates: [
          { name: 'Wendy Sartory Link', party: 'Democrat', votes: 389200, percentage: 55.1, won: true },
          { name: 'Bradley Layman', party: 'Republican', votes: 317080, percentage: 44.9, won: false },
        ],
      },
      {
        id: 'pb-commissioner-d5-2026',
        title: 'County Commissioner District 5',
        office: 'County Commissioner',
        date: '2026-11-03',
        isUpcoming: true,
        candidates: [
          { name: 'Gregg Weiss', party: 'Democrat', won: false },
          { name: 'TBD Challenger', party: 'Republican', won: false },
        ],
      },
      {
        id: 'pb-sa-2024',
        title: 'State Attorney (15th Circuit)',
        office: 'State Attorney',
        date: '2024-11-05',
        isUpcoming: false,
        turnout: 72.4,
        candidates: [
          { name: 'Dave Aronberg', party: 'Democrat', votes: 401500, percentage: 56.8, won: true },
          { name: 'Paul Valenti', party: 'Republican', votes: 305600, percentage: 43.2, won: false },
        ],
      },
    ],
  },

  {
    fips: '12011',
    name: 'Broward',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Fort Lauderdale',
    population: 1944375,
    website: 'https://www.broward.org',
    officials: [
      {
        id: 'broward-sheriff',
        name: 'Gregory Tony',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Appointed Sheriff in 2019 and elected in 2020. First Black Sheriff of Broward County. Former Coral Springs police officer. Reform-focused agenda emphasizing community policing and mental health response.',
        topIssues: [
          { name: 'Community Policing', position: 'Prioritizes relationship-building between law enforcement and community', detail: 'Expanded Crisis Intervention Teams; increased officer mental health training; launched youth mentorship programs.', category: 'Law Enforcement', source: GOV_SOURCE },
          { name: 'Gun Violence', position: 'Supports background check requirements and red flag laws', detail: 'Implemented Baker Act protocols; coordinates with state on risk protection orders.', category: 'Public Safety', source: BALLOTPEDIA },
        ],
        statements: [
          { quote: 'Public safety is a community effort — you cannot arrest your way out of social problems.', context: 'Broward County Commission address', date: '2021-09-22', source: GOV_SOURCE },
        ],
      },
      {
        id: 'broward-sa',
        name: 'Harold F. Pryor',
        position: 'State Attorney (17th Circuit)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Elected State Attorney in 2020. First Black State Attorney in Broward County history. Former assistant state attorney. Focuses on reducing mass incarceration and expanding diversion programs.',
        topIssues: [
          { name: 'Decarceration', position: 'Reduce over-reliance on incarceration for non-violent offenses', detail: 'Expanded pre-arrest diversion; limited cash bail requests for non-violent defendants.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '12095',
    name: 'Orange',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Orlando',
    population: 1429908,
    website: 'https://www.orangecountyfl.net',
    officials: [
      {
        id: 'orange-mayor',
        name: 'Jerry Demings',
        position: 'County Mayor',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'County Mayor since 2018. Former Orlando Police Chief and Orange County Sheriff. Priorities include transportation infrastructure, affordable housing, and economic development.',
        topIssues: [
          { name: 'Transportation', position: 'Champion of SunRail expansion and regional transit investment', detail: 'Backed $600M transportation sales tax referendum (passed 2019); advocates for expanded bus rapid transit.', category: 'Infrastructure', source: GOV_SOURCE },
        ],
      },
      {
        id: 'orange-sheriff',
        name: 'John Mina',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Elected Sheriff in 2018. Former Orlando Police Chief who commanded the response to the Pulse nightclub shooting in 2016. Focuses on community policing and mental health co-responder programs.',
        topIssues: [
          { name: 'Mental Health Response', position: 'Co-responder model for mental health crisis calls', detail: 'Partnered with behavioral health providers to send clinicians alongside deputies on mental health calls.', category: 'Public Safety', source: GOV_SOURCE },
        ],
      },
    ],
  },

  {
    fips: '12057',
    name: 'Hillsborough',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Tampa',
    population: 1471968,
    website: 'https://www.hillsboroughcounty.org',
    officials: [
      {
        id: 'hillsborough-sheriff',
        name: 'Chad Chronister',
        position: 'Sheriff',
        party: 'Republican',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Sheriff since 2017. Former chief deputy. Increased focus on human trafficking enforcement; oversaw controversial lockdown enforcement actions during COVID-19 and has publicly criticized some state and federal policies.',
        topIssues: [
          { name: 'Human Trafficking', position: 'Prioritizes human trafficking interdiction and victim services', detail: 'Created dedicated trafficking unit; partners with NGOs for survivor support services.', category: 'Law Enforcement', source: GOV_SOURCE },
        ],
      },
      {
        id: 'hillsborough-sa',
        name: 'Susan Lopez',
        position: 'State Attorney (13th Circuit)',
        party: 'Republican',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Elected State Attorney in 2020. Former circuit judge and prosecutor. Replaced a Democratic predecessor who was suspended by Governor DeSantis. Conservative approach to prosecution; opposed progressive prosecution policies.',
        topIssues: [
          { name: 'Public Safety', position: 'Prioritizes full prosecution for violent offenses', detail: 'Reversed predecessor\'s policies limiting prosecution of certain charges; emphasizes deterrence through accountability.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '12071',
    name: 'Lee',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Fort Myers',
    population: 787404,
    website: 'https://www.leegov.com',
    mapCenter: [-81.87, 26.55],
    mapZoom: 8,
    officials: [
      {
        id: 'lee-commission-chair',
        name: 'Cecil Pendergrass',
        position: 'County Commission Chair',
        party: 'Republican',
        inOffice: true,
        termEnd: '2026-11',
        bio: 'Commission Chair since 2020. Former Lee County Sheriff deputy. Focuses on hurricane preparedness, growth management, and water quality in the Caloosahatchee estuary.',
        topIssues: [
          { name: 'Hurricane Resilience', position: 'Strengthen building codes and emergency infrastructure', detail: 'Led post-Hurricane Ian recovery coordination; advocates stricter coastal construction standards.', category: 'Infrastructure', source: GOV_SOURCE },
          { name: 'Water Quality', position: 'Reduce nutrient runoff into Caloosahatchee River', detail: 'Supports septic-to-sewer conversion grants and stormwater treatment upgrades.', category: 'Environment', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'lee-sheriff',
        name: 'Carmine Marceno',
        position: 'Sheriff',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'Sheriff since 2020. Former narcotics detective. Expanded school safety programs and human trafficking enforcement after Hurricane Ian.',
        topIssues: [
          { name: 'School Safety', position: 'Expand school resource officers and threat assessment teams', detail: 'Increased SRO coverage in Lee County schools; partners with FDLE on threat reporting.', category: 'Public Safety', source: GOV_SOURCE },
        ],
      },
      {
        id: 'lee-sa',
        name: 'Amira Fox',
        position: 'State Attorney (20th Circuit)',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'State Attorney since 2019. Former assistant state attorney. Focuses on opioid prosecution, elder fraud, and repeat violent offenders.',
        topIssues: [
          { name: 'Opioid Enforcement', position: 'Aggressive prosecution of pill mills and traffickers', detail: 'Created dedicated opioid prosecution unit after post-Ian prescription fraud spike.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '12103',
    name: 'Pinellas',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Clearwater',
    population: 959107,
    website: 'https://www.pinellascounty.org',
    mapCenter: [-82.75, 27.95],
    mapZoom: 8.5,
    officials: [
      {
        id: 'pinellas-chair',
        name: 'Dave Eggers',
        position: 'County Commission Chair',
        party: 'Republican',
        inOffice: true,
        termEnd: '2026-11',
        bio: 'Commission Chair and District 4 commissioner. Former Clearwater City Council member. Priorities include beach renourishment, transportation, and public safety.',
        topIssues: [
          { name: 'Beach Protection', position: 'Federal and state funding for beach renourishment', detail: 'Advocates USACE funding for Pinellas barrier island beaches; post-storm erosion mitigation.', category: 'Environment', source: GOV_SOURCE },
          { name: 'Transportation', position: 'Expand regional transit connectivity', detail: 'Supports PSTA bus rapid transit expansion and Tampa Bay ferry pilot programs.', category: 'Infrastructure', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'pinellas-sheriff',
        name: 'Bob Gualtieri',
        position: 'Sheriff',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'Sheriff since 2011. Former Pinellas County attorney. Nationally recognized for school safety work; chaired Marjory Stoneman Douglas Public Safety Commission.',
        topIssues: [
          { name: 'School Safety', position: 'Risk protection orders and threat assessment protocols', detail: 'Led Florida school guardian program implementation; advocates red flag law enforcement training.', category: 'Public Safety', source: GOV_SOURCE },
          { name: 'Mental Health', position: 'Crisis intervention and co-responder programs', detail: 'Expanded mental health deputies paired with clinicians for behavioral health calls.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'pinellas-sa',
        name: 'Bruce Bartlett',
        position: 'State Attorney (6th Circuit)',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'State Attorney since 2017. Former chief assistant state attorney. Emphasizes prosecution of violent crime and human trafficking.',
        topIssues: [
          { name: 'Human Trafficking', position: 'Dedicated prosecution unit and victim services', detail: 'Partners with FBI and local NGOs on trafficking interdiction along I-275 corridor.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },

  {
    fips: '12031',
    name: 'Duval',
    stateName: 'Florida',
    stateCode: 'FL',
    seat: 'Jacksonville',
    population: 995567,
    website: 'https://www.coj.net',
    mapCenter: [-81.65, 30.33],
    mapZoom: 8,
    officials: [
      {
        id: 'duval-mayor',
        name: 'Donna Deegan',
        position: 'Mayor of Jacksonville',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2027-05',
        bio: 'Elected Mayor in 2023 — first woman to lead consolidated Jacksonville-Duval government. Former TV news anchor and nonprofit founder. Focuses on downtown revitalization, public safety, and inclusive economic growth.',
        topIssues: [
          { name: 'Economic Development', position: 'Downtown revitalization and small business support', detail: 'Launched Downtown Investment Authority initiatives; expanded small business grant programs.', category: 'Economy', source: GOV_SOURCE },
          { name: 'Public Safety', position: 'Community policing and violence intervention', detail: 'Expanded Cure Violence model programs; increased police recruitment incentives.', category: 'Public Safety', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'duval-sheriff',
        name: 'T.K. Waters',
        position: 'Sheriff',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'Sheriff since 2023. Former JSO chief of corrections. Focuses on jail reform, recruitment, and community engagement.',
        topIssues: [
          { name: 'Jail Reform', position: 'Reduce pretrial detention through risk-based release', detail: 'Implemented pretrial services expansion; reduced average jail census.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
      {
        id: 'duval-sa',
        name: 'Melissa Nelson',
        position: 'State Attorney (4th Circuit)',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'State Attorney since 2019. Former federal prosecutor. Created conviction integrity unit; focuses on violent crime and gang prosecution.',
        topIssues: [
          { name: 'Violent Crime', position: 'Prioritize prosecution of gun violence and repeat offenders', detail: 'Established dedicated violent crime unit; increased federal partnership on gang cases.', category: 'Criminal Justice', source: BALLOTPEDIA },
          { name: 'Wrongful Convictions', position: 'Active conviction review unit', detail: 'Conviction Integrity Unit has reviewed dozens of cases since 2019.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },

  // ── TEXAS ─────────────────────────────────────────────────────────────────

  {
    fips: '48201',
    name: 'Harris',
    stateName: 'Texas',
    stateCode: 'TX',
    seat: 'Houston',
    population: 4780913,
    website: 'https://www.harriscountytx.gov',
    officials: [
      {
        id: 'harris-judge',
        name: 'Lina Hidalgo',
        position: 'County Judge (Chief Executive)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-12',
        bio: 'Elected County Judge in 2018, the first woman and first Hispanic to hold the position. Focuses on flood control infrastructure following Hurricane Harvey, criminal justice reform, and public health.',
        topIssues: [
          { name: 'Flood Control', position: 'Champion of major flood infrastructure investment', detail: 'Oversaw $2.5B Harris County Flood Control bond; accelerated buyout programs for flood-prone properties.', category: 'Infrastructure', source: GOV_SOURCE },
          { name: 'Criminal Justice', position: 'Reduced pretrial detention through cash bail reform', detail: 'Supported consent decree eliminating cash bail for misdemeanors; reduced pretrial jail population.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
        statements: [
          { quote: 'When we make government work better for those who have been left behind, we make it work better for everyone.', context: 'Harris County State of the County Address', date: '2022-05-04', source: GOV_SOURCE },
        ],
      },
      {
        id: 'harris-sheriff',
        name: 'Ed Gonzalez',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Elected Sheriff in 2016. Former Houston police officer and city council member. Focuses on immigration enforcement limits, mental health diversion, and community policing.',
        topIssues: [
          { name: 'Immigration', position: 'Limits cooperation with ICE detainers for non-violent offenders', detail: 'Opposes 287(g) program; honors ICE detainers only for those convicted of serious crimes.', category: 'Immigration', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'harris-da',
        name: 'Kim Ogg',
        position: 'District Attorney',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Elected District Attorney in 2016. Implemented cite-and-release program for low-level marijuana offenses; created conviction integrity unit that has led to numerous exonerations.',
        topIssues: [
          { name: 'Drug Policy', position: 'Implemented cite-and-release for marijuana possession', detail: 'Officers issue citations rather than arrests for marijuana under 4 oz; reduced marijuana arrests by 90%+.', category: 'Drug Policy', source: GOV_SOURCE },
          { name: 'Wrongful Convictions', position: 'Active conviction review and exoneration unit', detail: 'Conviction Integrity Unit reviewed hundreds of cases; Harris County leads nation in exonerations per capita.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '48113',
    name: 'Dallas',
    stateName: 'Texas',
    stateCode: 'TX',
    seat: 'Dallas',
    population: 2664032,
    website: 'https://www.dallascounty.org',
    officials: [
      {
        id: 'dallas-judge',
        name: 'Clay Jenkins',
        position: 'County Judge (Chief Executive)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-12',
        bio: 'County Judge since 2011. Led Dallas County\'s public health responses to Ebola (2014) and COVID-19. Focuses on criminal justice reform, affordable housing, and health equity.',
        topIssues: [
          { name: 'Public Health', position: 'Strong advocate for science-based public health policy', detail: 'Issued early COVID-19 mask mandates; clashed with state over public health authority.', category: 'Public Health', source: GOV_SOURCE },
        ],
      },
      {
        id: 'dallas-da',
        name: 'John Creuzot',
        position: 'District Attorney',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-12',
        bio: 'Elected District Attorney in 2018. Former judge. Implemented progressive prosecution policies including declining to prosecute low-level marijuana and theft for necessity cases.',
        topIssues: [
          { name: 'Progressive Prosecution', position: 'Focuses resources on violent crime; declines low-level non-violent offenses', detail: 'Policy of not prosecuting marijuana possession under 4 oz or theft under $750 for basic necessities.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '48029',
    name: 'Bexar',
    stateName: 'Texas',
    stateCode: 'TX',
    seat: 'San Antonio',
    population: 2065114,
    website: 'https://www.bexar.org',
    officials: [
      {
        id: 'bexar-judge',
        name: 'Peter Sakai',
        position: 'County Judge (Chief Executive)',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-12',
        bio: 'Elected County Judge in 2022. Former probate judge. Focuses on mental health resources, military veteran support, and economic development.',
        topIssues: [
          { name: 'Mental Health', position: 'Expand mental health services and diversion courts', detail: 'Supports investment in behavioral health crisis centers and diversion courts for mentally ill defendants.', category: 'Mental Health', source: GOV_SOURCE },
        ],
      },
      {
        id: 'bexar-sheriff',
        name: 'Javier Salazar',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2024-11',
        bio: 'Sheriff since 2017. Former SAPD detective. Focuses on community policing and was involved in investigating alleged exploitation of migrants in charter flights.',
        topIssues: [
          { name: 'Immigration Enforcement', position: 'Cooperates with federal law but opposes mass deportation tactics', detail: 'Has publicly criticized exploitation of immigrants for political purposes; maintains community trust focus.', category: 'Immigration', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  // ── CALIFORNIA ────────────────────────────────────────────────────────────

  {
    fips: '06037',
    name: 'Los Angeles',
    stateName: 'California',
    stateCode: 'CA',
    seat: 'Los Angeles',
    population: 9829544,
    website: 'https://lacounty.gov',
    officials: [
      {
        id: 'la-board-chair',
        name: 'Lindsey Horvath',
        position: 'Board of Supervisors Chair',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-12',
        bio: 'Elected to Board of Supervisors in 2022 from 3rd District; served as Board Chair in 2024. Former West Hollywood Mayor. Focuses on homelessness, affordable housing, and climate resilience.',
        topIssues: [
          { name: 'Homelessness', position: 'Supports comprehensive services-based approach to homelessness', detail: 'Backed Inside Safe street-to-housing program; supports Measure A homelessness funding.', category: 'Housing', source: GOV_SOURCE },
        ],
      },
      {
        id: 'la-sheriff',
        name: 'Robert Luna',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-11',
        bio: 'Elected Sheriff in 2022. Former Long Beach Police Chief. Ran on a platform of reform and accountability after years of controversy at LASD under previous sheriffs. Supports civilian oversight.',
        topIssues: [
          { name: 'Departmental Reform', position: 'Reduce deputy gang culture; increase civilian oversight', detail: 'Supports Inspector General oversight; committed to policy changes on use of force and deputy misconduct.', category: 'Law Enforcement', source: BALLOTPEDIA },
          { name: 'Homelessness', position: 'Coordinates law enforcement response with social services', detail: 'Partners with LAHSA for outreach; opposes arrests as primary response to unhoused individuals.', category: 'Social Services', source: GOV_SOURCE },
        ],
        statements: [
          { quote: 'I am committed to making LASD the agency that communities deserve — professional, accountable, and trustworthy.', context: 'Inauguration speech', date: '2022-12-05', source: GOV_SOURCE },
        ],
      },
      {
        id: 'la-da',
        name: 'Nathan Hochman',
        position: 'District Attorney',
        party: 'Republican',
        inOffice: true,
        termEnd: '2028-11',
        bio: 'Elected District Attorney in 2024, defeating incumbent George Gascón. Former federal prosecutor. Campaigns on reversing progressive prosecution policies and prosecuting repeat offenders more aggressively.',
        topIssues: [
          { name: 'Crime Prosecution', position: 'Restore full prosecution of retail theft, robbery, and drug dealing', detail: 'Reversed Gascón\'s special directives; re-implementing sentencing enhancements and full charging policies.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
    ],
  },

  {
    fips: '06075',
    name: 'San Francisco',
    stateName: 'California',
    stateCode: 'CA',
    seat: 'San Francisco',
    population: 873965,
    website: 'https://sfgov.org',
    officials: [
      {
        id: 'sf-mayor',
        name: 'Daniel Lurie',
        position: 'Mayor',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2028-01',
        bio: 'Elected Mayor in November 2024; took office January 2025. Founder of Tipping Point Community, an anti-poverty nonprofit. Focused on fixing drug markets in the Tenderloin, improving city services, and business recovery.',
        topIssues: [
          { name: 'Drug Crisis', position: 'Supports expanded treatment alongside law enforcement action on open drug markets', detail: 'Declared a state of emergency in Tenderloin; pushing for expanded treatment capacity and accountability.', category: 'Public Health', source: GOV_SOURCE },
        ],
      },
      {
        id: 'sf-da',
        name: 'Brooke Jenkins',
        position: 'District Attorney',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2026-01',
        bio: 'Appointed DA in 2022 following recall of Chesa Boudin; elected in 2022. Former senior deputy DA. Takes a more traditional approach to prosecution than her predecessor.',
        topIssues: [
          { name: 'Drug Trafficking', position: 'Prioritizes prosecution of drug dealers and suppliers', detail: 'Focuses prosecution resources on dealers rather than users; supports Drug Market Agency Coordination Office.', category: 'Criminal Justice', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'sf-sheriff',
        name: 'Paul Miyamoto',
        position: 'Sheriff',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2027-01',
        bio: 'Elected Sheriff in 2019. First Asian American to serve as San Francisco Sheriff. Focuses on county jail conditions and diversion programs for individuals with mental illness.',
        topIssues: [
          { name: 'Jail Reform', position: 'Reduce county jail population through diversion', detail: 'Expanded behavioral health courts and collaborative court diversion; reduced jail census significantly.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },

  {
    fips: '06073',
    name: 'San Diego',
    stateName: 'California',
    stateCode: 'CA',
    seat: 'San Diego',
    population: 3286069,
    website: 'https://www.sandiegocounty.gov',
    officials: [
      {
        id: 'sd-board-chair',
        name: 'Jim Desmond',
        position: 'Board of Supervisors Chair',
        party: 'Republican',
        inOffice: true,
        termEnd: '2026-11',
        bio: 'Elected to Board of Supervisors in 2018 from 5th District; served as Board Chair. Former San Marcos Mayor. Focuses on fiscal responsibility, public safety, and water supply.',
        topIssues: [
          { name: 'Fiscal Policy', position: 'Reduce county spending and maintain balanced budget', detail: 'Advocates for limiting government growth; opposed to tax increases for county services.', category: 'Economy', source: GOV_SOURCE },
          { name: 'Immigration', position: 'Supports stronger border security', detail: 'Has publicly supported expanded border enforcement; opposed county sanctuary policies.', category: 'Immigration', source: BALLOTPEDIA },
        ],
      },
      {
        id: 'sd-da',
        name: 'Summer Stephan',
        position: 'District Attorney',
        party: 'Republican',
        inOffice: true,
        termEnd: '2026-11',
        bio: 'District Attorney since 2017. Former chief deputy DA. Focuses on human trafficking, child exploitation, and domestic violence prosecution.',
        topIssues: [
          { name: 'Human Trafficking', position: 'Aggressive prosecution of trafficking and exploitation', detail: 'Created specialized trafficking prosecution unit; pursues maximum penalties for traffickers.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },

  // ── NEW YORK ──────────────────────────────────────────────────────────────

  {
    fips: '36061',
    name: 'New York',
    stateName: 'New York',
    stateCode: 'NY',
    seat: 'Manhattan (New York City)',
    population: 1596273,
    website: 'https://manhattanda.org',
    officials: [
      {
        id: 'ny-boro-president',
        name: 'Mark Levine',
        position: 'Manhattan Borough President',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'Borough President since 2022. Former City Council member. Former chair of the City Council Health Committee during COVID-19. Focuses on housing, public health, and parks.',
        topIssues: [
          { name: 'Housing', position: 'Supports dense, affordable housing construction', detail: 'Advocates for "Yes In My Backyard" zoning reforms; supports converting commercial buildings to residential.', category: 'Housing', source: GOV_SOURCE },
        ],
      },
      {
        id: 'manhattan-da',
        name: 'Alvin Bragg',
        position: 'District Attorney',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'Elected District Attorney in 2021; first Black Manhattan DA. Former federal prosecutor. Notable for prosecuting Donald J. Trump on 34 felony counts of falsifying business records (conviction reached May 2024).',
        topIssues: [
          { name: 'Criminal Justice Reform', position: 'Decline prosecution of low-level offenses; focus on violent crime', detail: 'Day-1 memo declining certain low-level charges generated significant controversy; revised under pressure.', category: 'Criminal Justice', source: BALLOTPEDIA },
          { name: 'White-Collar Crime', position: 'Aggressive prosecution of financial and political corruption', detail: 'Trump prosecution is most high-profile case in Manhattan DA history; also pursuing financial crime cases.', category: 'Legal', source: { name: 'New York Times', tier: 'media' } },
        ],
      },
    ],
  },

  {
    fips: '36047',
    name: 'Kings',
    stateName: 'New York',
    stateCode: 'NY',
    seat: 'Brooklyn (New York City)',
    population: 2736074,
    website: 'https://www.kingscountypolitics.com',
    officials: [
      {
        id: 'brooklyn-boro-president',
        name: 'Antonio Reynoso',
        position: 'Brooklyn Borough President',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'Borough President since 2022. Former City Council member representing Williamsburg and Bushwick. Focuses on affordable housing, participatory budgeting, and community land trusts.',
        topIssues: [
          { name: 'Affordable Housing', position: 'Strong supporter of community land trusts and social housing', detail: 'Advocates for removing housing from speculative market; supports community control of affordable housing stock.', category: 'Housing', source: GOV_SOURCE },
        ],
      },
      {
        id: 'brooklyn-da',
        name: 'Eric Gonzalez',
        position: 'District Attorney',
        party: 'Democrat',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'District Attorney since 2017. First Latino to serve as Brooklyn DA. Focus on immigration-sensitive prosecution, wrongful conviction review, and ending mass incarceration.',
        topIssues: [
          { name: 'Immigration', position: 'Immigration-sensitive prosecution — avoids charges that trigger deportation where not warranted', detail: 'Policy considers immigration consequences of prosecution; expanded diversion for non-violent immigrant defendants.', category: 'Immigration', source: BALLOTPEDIA },
          { name: 'Wrongful Convictions', position: 'Active conviction review unit', detail: 'Conviction Review Unit has exonerated dozens of wrongfully convicted individuals since 2014.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },

  {
    fips: '36059',
    name: 'Nassau',
    stateName: 'New York',
    stateCode: 'NY',
    seat: 'Mineola',
    population: 1396152,
    website: 'https://www.nassaucountyny.gov',
    officials: [
      {
        id: 'nassau-exec',
        name: 'Bruce Blakeman',
        position: 'County Executive',
        party: 'Republican',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'Elected County Executive in 2021. Former town supervisor and legislative candidate. Focuses on reducing taxes, public safety, and reversing bail reform laws.',
        topIssues: [
          { name: 'Bail Reform', position: 'Opposes New York\'s cashless bail law', detail: 'Publicly advocates repeal of cashless bail for crimes including robbery and assault; signed resolution urging state action.', category: 'Criminal Justice', source: BALLOTPEDIA },
          { name: 'Taxes', position: 'Reduce property taxes and county spending', detail: 'Pledged no new county taxes; reversed predecessor\'s proposed service cuts while maintaining budget.', category: 'Economy', source: GOV_SOURCE },
        ],
      },
      {
        id: 'nassau-da',
        name: 'Anne Donnelly',
        position: 'District Attorney',
        party: 'Republican',
        inOffice: true,
        termEnd: '2025-12',
        bio: 'Elected District Attorney in 2021. First woman to serve as Nassau County DA. Former assistant district attorney with 30 years of experience. Focuses on violent crime, drug trafficking, and opposing cashless bail.',
        topIssues: [
          { name: 'Bail Reform', position: 'Supports bail for violent and repeat offenders', detail: 'Advocates amending NY bail reform law to allow judges discretion on bail for violent offenses.', category: 'Criminal Justice', source: GOV_SOURCE },
        ],
      },
    ],
  },
];

// Lookup by FIPS code
export const countyByFips: Record<string, CountyData> = Object.fromEntries(
  mockCounties.map((c) => [c.fips, c])
);

// Lookup by state code
export const countiesByState: Record<string, CountyData[]> = mockCounties.reduce(
  (acc, c) => {
    (acc[c.stateCode] = acc[c.stateCode] || []).push(c);
    return acc;
  },
  {} as Record<string, CountyData[]>
);

// Lookup official by ID across all counties
export const officialById: Record<string, { official: CountyOfficial; county: CountyData }> =
  Object.fromEntries(
    mockCounties.flatMap((county) =>
      county.officials.map((official) => [official.id, { official, county }])
    )
  );

export function findCountyByName(query: string): CountyData | undefined {
  const q = query.toLowerCase().replace(/\s+county$/i, '').trim();
  return mockCounties.find(
    (c) => c.name.toLowerCase() === q || c.name.toLowerCase().includes(q)
  );
}
