import { Source } from '@/lib/types';

export type AdvocacyGroupCategory =
  | 'foreign-policy'
  | 'trade-association'
  | 'gun-rights'
  | 'reproductive-rights'
  | 'anti-abortion';

/** Domestic U.S. advocacy vs. foreign-government / foreign-policy lobbying (FARA-adjacent). */
export type LobbyScope = 'domestic' | 'foreign';

export interface PartySpending {
  party: 'Democratic' | 'Republican' | 'Independent/Other';
  amount: number;
  percentage: number;
  note?: string;
}

export interface LobbyingGroupSource extends Source {
  sourceType: 'filing' | 'aggregate' | 'official-site' | 'legislative-record' | 'news-context';
}

export interface LobbyingGroup {
  id: string;
  name: string;
  shortName: string;
  category: AdvocacyGroupCategory;
  /** Domestic U.S. issue advocacy vs. foreign-government / foreign-policy focus. */
  lobbyScope: LobbyScope;
  formerNames: { name: string; years?: string; sourceNote: string }[];
  description: string;
  issueFocus: string[];
  currentStatus: string;
  website: string;
  sources: LobbyingGroupSource[];
  spendingByParty: {
    cycle: string;
    recordType: string;
    disclosureNote: string;
    parties: PartySpending[];
  };
  topRecipients: {
    name: string;
    party: 'D' | 'R' | 'I' | 'Mixed';
    office: string;
    amount: number;
    cycle: string;
    recordType: string;
    sourceNote: string;
  }[];
  promotedBillsIssues: {
    title: string;
    billId?: string;
    chamber?: string;
    cycle?: string;
    positionLabel: string;
    summary: string;
    source: LobbyingGroupSource;
  }[];
  historyTimeline: {
    year: string;
    title: string;
    detail: string;
    source: LobbyingGroupSource;
  }[];
  stanceSections: {
    title: string;
    summary: string;
    source: LobbyingGroupSource;
  }[];
  dataCompleteness: {
    level: 'High' | 'Medium' | 'Demo sample';
    lastUpdated: string;
    notes: string[];
  };
  caveat: string;
}

const FEC: LobbyingGroupSource = {
  name: 'Federal Election Commission',
  url: 'https://www.fec.gov/data/',
  tier: 'official',
  sourceType: 'filing',
  description: 'Official federal campaign finance filings and independent expenditure records',
};

const CONGRESS_GOV: LobbyingGroupSource = {
  name: 'Congress.gov',
  url: 'https://www.congress.gov',
  tier: 'official',
  sourceType: 'legislative-record',
  description: 'Official federal bill, sponsorship, and legislative status records',
};

const LDA: LobbyingGroupSource = {
  name: 'U.S. Senate LDA Database',
  url: 'https://lda.senate.gov/system/public/',
  tier: 'official',
  sourceType: 'filing',
  description: 'Lobbying Disclosure Act registration and quarterly activity reports',
};

const OPENSECRETS: LobbyingGroupSource = {
  name: 'OpenSecrets',
  url: 'https://www.opensecrets.org',
  tier: 'nonpartisan',
  sourceType: 'aggregate',
  description: 'Nonpartisan campaign finance, lobbying, and outside-spending aggregates',
};

export const mockLobbyingGroups: LobbyingGroup[] = [
  {
    id: 'aipac',
    name: 'American Israel Public Affairs Committee',
    shortName: 'AIPAC',
    category: 'foreign-policy',
    lobbyScope: 'foreign',
    formerNames: [
      {
        name: 'American Zionist Committee for Public Affairs',
        years: '1950s',
        sourceNote: 'Historically reported predecessor name; shown as context, not a current legal name.',
      },
    ],
    description:
      'AIPAC is a U.S.-based pro-Israel advocacy and lobbying organization that advocates for a close U.S.-Israel relationship. Its political network includes affiliated PAC and outside-spending activity that is disclosed separately in campaign finance records.',
    issueFocus: ['U.S.-Israel relations', 'Foreign aid', 'Middle East policy', 'Defense cooperation'],
    currentStatus: 'Active advocacy organization with federal lobbying and affiliated electoral spending records.',
    website: 'https://www.aipac.org',
    sources: [
      { ...LDA, description: 'Searchable lobbying filings for AIPAC and related registrants' },
      { ...FEC, description: 'FEC records for AIPAC PAC and affiliated independent expenditures' },
      { ...OPENSECRETS, url: 'https://www.opensecrets.org/orgs/american-israel-public-affairs-cmte/summary?id=D000046963' },
      { name: 'AIPAC', url: 'https://www.aipac.org/about', tier: 'official', sourceType: 'official-site', description: 'Organization description and policy priorities' },
    ],
    spendingByParty: {
      cycle: '2024',
      recordType: 'PAC and outside-spending demo aggregate',
      disclosureNote: 'Illustrative demo values based on disclosed-record patterns; verify exact totals against FEC/OpenSecrets before publication.',
      parties: [
        { party: 'Democratic', amount: 8800000, percentage: 48 },
        { party: 'Republican', amount: 9300000, percentage: 51 },
        { party: 'Independent/Other', amount: 200000, percentage: 1 },
      ],
    },
    topRecipients: [
      { name: 'United Democracy Project activity', party: 'Mixed', office: 'Independent expenditures', amount: 9100000, cycle: '2024', recordType: 'Outside spending', sourceNote: 'Demo aggregate for races involving multiple parties and primaries.' },
      { name: 'Pro-Israel America PAC recipients', party: 'Mixed', office: 'Federal candidates', amount: 2100000, cycle: '2024', recordType: 'PAC contributions', sourceNote: 'Representative bundled/PAC activity; exact recipient list should be refreshed from FEC.' },
      { name: 'House foreign-affairs candidates', party: 'Mixed', office: 'U.S. House', amount: 1200000, cycle: '2024', recordType: 'PAC contributions', sourceNote: 'Grouped demo category for UI display.' },
    ],
    promotedBillsIssues: [
      {
        title: 'Security assistance and defense cooperation for Israel',
        billId: 'H.R.815',
        chamber: '118th Congress',
        cycle: '2024',
        positionLabel: 'Supported policy area',
        summary: 'Profile records should connect advocacy statements to official bill pages and voting records without asserting why any member voted.',
        source: CONGRESS_GOV,
      },
      {
        title: 'Countering Iran and regional security measures',
        positionLabel: 'Stated advocacy priority',
        summary: 'AIPAC publicly emphasizes policies it describes as strengthening U.S.-Israel security cooperation and countering Iranian threats.',
        source: { name: 'AIPAC policy priorities', url: 'https://www.aipac.org/policy', tier: 'official', sourceType: 'official-site' },
      },
    ],
    historyTimeline: [
      { year: '1950s', title: 'Predecessor organization name reported', detail: 'Historical accounts identify the American Zionist Committee for Public Affairs as a predecessor name before AIPAC branding.', source: OPENSECRETS },
      { year: '1960s-present', title: 'Federal advocacy presence', detail: 'The organization became a prominent pro-Israel advocacy group active in federal policy debates.', source: { name: 'AIPAC about page', url: 'https://www.aipac.org/about', tier: 'official', sourceType: 'official-site' } },
      { year: '2020s', title: 'Expanded electoral spending visibility', detail: 'Affiliated PAC and independent-expenditure activity became a visible part of federal election coverage.', source: FEC },
    ],
    stanceSections: [
      { title: 'U.S.-Israel Relationship', summary: 'Supports policies described by the organization as strengthening U.S.-Israel security, diplomatic, and economic ties.', source: { name: 'AIPAC policy priorities', url: 'https://www.aipac.org/policy', tier: 'official', sourceType: 'official-site' } },
      { title: 'Foreign Assistance', summary: 'Advocates continued U.S. security assistance for Israel; bill-level records should be shown through Congress.gov and roll-call votes.', source: CONGRESS_GOV },
    ],
    dataCompleteness: {
      level: 'Demo sample',
      lastUpdated: '2026-06-23',
      notes: [
        'Spending totals are demo estimates for UI behavior and should be replaced by live FEC/OpenSecrets imports.',
        'Lobbying filings, PAC contributions, and independent expenditures should remain separate record types in production.',
      ],
    },
    caveat: 'Patterns shown are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.',
  },
  {
    id: 'national-association-of-realtors',
    name: 'National Association of Realtors',
    shortName: 'NAR',
    category: 'trade-association',
    lobbyScope: 'domestic',
    formerNames: [
      { name: 'National Association of Real Estate Boards', years: '1908-1972', sourceNote: 'Historical name used before adoption of the Realtor branding.' },
    ],
    description:
      'The National Association of Realtors is a real estate trade association representing brokers, agents, and related professionals. Its advocacy generally centers on housing markets, property rights, tax policy, lending, and real estate regulation.',
    issueFocus: ['Housing', 'Mortgage finance', 'Property tax', 'Real estate regulation', 'Flood insurance'],
    currentStatus: 'Active trade association with federal lobbying filings and bipartisan PAC contribution records.',
    website: 'https://www.nar.realtor',
    sources: [
      LDA,
      FEC,
      { ...OPENSECRETS, url: 'https://www.opensecrets.org/orgs/national-assn-of-realtors/summary?id=D000000062' },
      { name: 'NAR Advocacy', url: 'https://www.nar.realtor/advocacy', tier: 'official', sourceType: 'official-site' },
    ],
    spendingByParty: {
      cycle: '2024',
      recordType: 'PAC contribution demo aggregate',
      disclosureNote: 'Demo values intentionally show a bipartisan distribution example; verify exact totals by cycle before production use.',
      parties: [
        { party: 'Democratic', amount: 2500000, percentage: 47 },
        { party: 'Republican', amount: 2750000, percentage: 52 },
        { party: 'Independent/Other', amount: 50000, percentage: 1 },
      ],
    },
    topRecipients: [
      { name: 'House Financial Services members', party: 'Mixed', office: 'U.S. House', amount: 820000, cycle: '2024', recordType: 'PAC contributions', sourceNote: 'Grouped demo category tied to housing and lending policy jurisdiction.' },
      { name: 'Ways and Means / tax policy members', party: 'Mixed', office: 'Congress', amount: 610000, cycle: '2024', recordType: 'PAC contributions', sourceNote: 'Grouped demo category for property and tax policy relevance.' },
      { name: 'State Realtor-aligned candidates', party: 'Mixed', office: 'State offices', amount: 450000, cycle: '2024', recordType: 'State/local advocacy sample', sourceNote: 'Representative placeholder pending state-level import.' },
    ],
    promotedBillsIssues: [
      { title: 'National Flood Insurance Program reauthorization', positionLabel: 'Stated advocacy priority', summary: 'Real estate groups often track flood insurance availability and affordability because it affects property transactions.', source: CONGRESS_GOV },
      { title: 'Housing supply and affordability policy', positionLabel: 'Stated advocacy priority', summary: 'NAR advocacy materials emphasize housing inventory, lending access, and homeownership policy.', source: { name: 'NAR Advocacy', url: 'https://www.nar.realtor/advocacy', tier: 'official', sourceType: 'official-site' } },
    ],
    historyTimeline: [
      { year: '1908', title: 'Association founded', detail: 'Founded as a national real estate trade association.', source: { name: 'NAR history', url: 'https://www.nar.realtor/about-nar/history', tier: 'official', sourceType: 'official-site' } },
      { year: '1970s', title: 'Current name adopted', detail: 'The association adopted the National Association of Realtors name after previously operating as the National Association of Real Estate Boards.', source: { name: 'NAR history', url: 'https://www.nar.realtor/about-nar/history', tier: 'official', sourceType: 'official-site' } },
      { year: 'Current cycles', title: 'Bipartisan PAC pattern', detail: 'Disclosed PAC records commonly show contributions to both major parties, often emphasizing committee relevance over ideology.', source: OPENSECRETS },
    ],
    stanceSections: [
      { title: 'Housing Supply', summary: 'Supports policies the organization says increase housing inventory and reduce barriers to homeownership.', source: { name: 'NAR Advocacy', url: 'https://www.nar.realtor/advocacy', tier: 'official', sourceType: 'official-site' } },
      { title: 'Real Estate Finance', summary: 'Tracks mortgage finance, flood insurance, tax, and lending rules that affect real estate transactions.', source: LDA },
    ],
    dataCompleteness: {
      level: 'Demo sample',
      lastUpdated: '2026-06-23',
      notes: [
        'Designed to demonstrate bipartisan distribution bars and committee-relevance framing.',
        'Production should include federal PAC, lobbying, and state Realtor association records as separate layers.',
      ],
    },
    caveat: 'Patterns shown are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.',
  },
  {
    id: 'nra-political-victory-fund',
    name: 'NRA Political Victory Fund',
    shortName: 'NRA-PVF',
    category: 'gun-rights',
    lobbyScope: 'domestic',
    formerNames: [],
    description:
      'The NRA Political Victory Fund is the National Rifle Association affiliated political action committee. Its election activity and ratings are connected to gun-rights policy positions and candidate support records.',
    issueFocus: ['Second Amendment', 'Firearms regulation', 'Concealed carry', 'Background checks'],
    currentStatus: 'Active PAC with disclosed federal candidate support records; related NRA entities may have separate lobbying filings.',
    website: 'https://www.nrapvf.org',
    sources: [
      FEC,
      { ...OPENSECRETS, url: 'https://www.opensecrets.org/orgs/national-rifle-assn/summary?id=D000000082' },
      { name: 'NRA-PVF', url: 'https://www.nrapvf.org', tier: 'official', sourceType: 'official-site' },
      CONGRESS_GOV,
    ],
    spendingByParty: {
      cycle: '2024',
      recordType: 'PAC contribution and independent-expenditure demo aggregate',
      disclosureNote: 'Demo values reflect a Republican-heavy pattern commonly visible in gun-rights PAC records; verify exact totals by entity and cycle.',
      parties: [
        { party: 'Democratic', amount: 60000, percentage: 3 },
        { party: 'Republican', amount: 1940000, percentage: 96 },
        { party: 'Independent/Other', amount: 20000, percentage: 1 },
      ],
    },
    topRecipients: [
      { name: 'Pro-gun-rights House candidates', party: 'R', office: 'U.S. House', amount: 740000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'Pro-gun-rights Senate candidates', party: 'R', office: 'U.S. Senate', amount: 510000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'State-level firearm policy races', party: 'R', office: 'State offices', amount: 260000, cycle: '2024', recordType: 'State advocacy sample', sourceNote: 'Representative placeholder pending state-level import.' },
    ],
    promotedBillsIssues: [
      { title: 'Bipartisan Safer Communities Act', billId: 'S.2938', chamber: '117th Congress', cycle: '2022', positionLabel: 'Opposed policy area', summary: 'Gun-rights groups opposed several federal gun safety provisions; show official bill text and votes alongside advocacy statements.', source: CONGRESS_GOV },
      { title: 'Concealed carry reciprocity proposals', positionLabel: 'Supported policy area', summary: 'NRA-PVF materials have supported federal and state proposals to expand recognition of concealed carry permits.', source: { name: 'NRA-PVF', url: 'https://www.nrapvf.org', tier: 'official', sourceType: 'official-site' } },
    ],
    historyTimeline: [
      { year: '1871', title: 'NRA founded', detail: 'The National Rifle Association was founded in the 19th century; its PAC is a separate election activity vehicle.', source: { name: 'NRA history', url: 'https://home.nra.org/about-the-nra/', tier: 'official', sourceType: 'official-site' } },
      { year: '1970s', title: 'Modern political advocacy expands', detail: 'The NRA became a major participant in firearm policy politics and candidate ratings.', source: OPENSECRETS },
      { year: 'Current cycles', title: 'PAC and rating activity', detail: 'NRA-PVF publishes candidate grades and disclosed federal spending appears in FEC records.', source: FEC },
    ],
    stanceSections: [
      { title: 'Firearm Ownership Rights', summary: 'Supports broad Second Amendment protections and opposes many new firearm restrictions.', source: { name: 'NRA-PVF', url: 'https://www.nrapvf.org', tier: 'official', sourceType: 'official-site' } },
      { title: 'Candidate Ratings', summary: 'Uses questionnaires, voting records, and public positions to issue candidate grades; ratings are advocacy products, not official government records.', source: { name: 'NRA-PVF grades', url: 'https://www.nrapvf.org/grades/', tier: 'official', sourceType: 'official-site' } },
    ],
    dataCompleteness: {
      level: 'Demo sample',
      lastUpdated: '2026-06-23',
      notes: [
        'Profile intentionally separates NRA-PVF PAC activity from broader NRA lobbying and nonprofit activity.',
        'Production should crosswalk candidate ratings, PAC spending, lobbying filings, and bill votes as separate evidence types.',
      ],
    },
    caveat: 'Patterns shown are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.',
  },
  {
    id: 'planned-parenthood-action-fund',
    name: 'Planned Parenthood Action Fund',
    shortName: 'PPAF',
    category: 'reproductive-rights',
    lobbyScope: 'domestic',
    formerNames: [],
    description:
      'Planned Parenthood Action Fund is the advocacy and political arm associated with Planned Parenthood. It supports candidates and policies aligned with abortion rights, reproductive health access, contraception, and related health policy.',
    issueFocus: ['Abortion rights', 'Reproductive healthcare', 'Contraception', 'Medicaid and health access'],
    currentStatus: 'Active advocacy organization with electoral, endorsement, and lobbying-adjacent records across affiliated entities.',
    website: 'https://www.plannedparenthoodaction.org',
    sources: [
      FEC,
      { ...OPENSECRETS, url: 'https://www.opensecrets.org/orgs/planned-parenthood/summary?id=D000000591' },
      { name: 'Planned Parenthood Action Fund', url: 'https://www.plannedparenthoodaction.org', tier: 'official', sourceType: 'official-site' },
      CONGRESS_GOV,
    ],
    spendingByParty: {
      cycle: '2024',
      recordType: 'PAC/endorsement demo aggregate',
      disclosureNote: 'Demo values reflect a Democratic-heavy pattern visible in abortion-rights electoral advocacy; verify exact totals by entity and cycle.',
      parties: [
        { party: 'Democratic', amount: 3300000, percentage: 97 },
        { party: 'Republican', amount: 70000, percentage: 2 },
        { party: 'Independent/Other', amount: 30000, percentage: 1 },
      ],
    },
    topRecipients: [
      { name: 'Abortion-rights House candidates', party: 'D', office: 'U.S. House', amount: 980000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'Abortion-rights Senate candidates', party: 'D', office: 'U.S. Senate', amount: 870000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'State ballot and judicial races', party: 'Mixed', office: 'State offices', amount: 620000, cycle: '2024', recordType: 'State advocacy sample', sourceNote: 'Representative placeholder pending state-level import.' },
    ],
    promotedBillsIssues: [
      { title: "Women's Health Protection Act", billId: 'H.R.3755 / S.1975', chamber: '117th Congress', positionLabel: 'Supported policy area', summary: 'Abortion-rights groups supported federal legislation to protect abortion access after state restrictions increased.', source: CONGRESS_GOV },
      { title: 'Contraception and preventive care access', positionLabel: 'Stated advocacy priority', summary: 'The organization advocates for contraception access and broader reproductive healthcare coverage.', source: { name: 'Planned Parenthood Action Fund issues', url: 'https://www.plannedparenthoodaction.org/issues', tier: 'official', sourceType: 'official-site' } },
    ],
    historyTimeline: [
      { year: '1989', title: 'Action Fund established', detail: 'Planned Parenthood Action Fund operates as an advocacy and political organization connected to Planned Parenthood policy priorities.', source: { name: 'PPAF about page', url: 'https://www.plannedparenthoodaction.org/about-us', tier: 'official', sourceType: 'official-site' } },
      { year: '2022', title: 'Post-Dobbs advocacy expands', detail: 'After the Supreme Court decision in Dobbs, reproductive-rights groups increased focus on federal, state, and ballot-measure activity.', source: { name: 'Supreme Court Dobbs opinion', url: 'https://www.supremecourt.gov/opinions/21pdf/19-1392_6j37.pdf', tier: 'official', sourceType: 'legislative-record' } },
      { year: 'Current cycles', title: 'Candidate endorsements and spending', detail: 'Endorsements and election activity are disclosed through organizational pages, FEC records, and state-level campaign finance systems.', source: FEC },
    ],
    stanceSections: [
      { title: 'Abortion Access', summary: 'Supports legal access to abortion and opposes many state and federal restrictions.', source: { name: 'PPAF issues', url: 'https://www.plannedparenthoodaction.org/issues/abortion', tier: 'official', sourceType: 'official-site' } },
      { title: 'Reproductive Healthcare', summary: 'Supports policies related to contraception, preventive care, Medicaid access, and reproductive health services.', source: { name: 'PPAF issues', url: 'https://www.plannedparenthoodaction.org/issues', tier: 'official', sourceType: 'official-site' } },
    ],
    dataCompleteness: {
      level: 'Demo sample',
      lastUpdated: '2026-06-23',
      notes: [
        'Spending and endorsement records should be separated from health-provider records in production.',
        'State ballot-measure activity needs state campaign-finance imports, not only federal FEC data.',
      ],
    },
    caveat: 'Patterns shown are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.',
  },
  {
    id: 'sba-pro-life-america',
    name: 'Susan B. Anthony Pro-Life America',
    shortName: 'SBA Pro-Life America',
    category: 'anti-abortion',
    lobbyScope: 'domestic',
    formerNames: [
      { name: 'Susan B. Anthony List', years: '1990s-2022', sourceNote: 'Former public name before rebrand to Susan B. Anthony Pro-Life America.' },
    ],
    description:
      'Susan B. Anthony Pro-Life America is an anti-abortion advocacy organization that supports candidates and policies opposing abortion and promoting restrictions on abortion access.',
    issueFocus: ['Anti-abortion policy', 'Judicial nominations', 'Pregnancy resource centers', 'State abortion restrictions'],
    currentStatus: 'Active advocacy organization with federal election spending and endorsement activity.',
    website: 'https://sbaprolife.org',
    sources: [
      FEC,
      { ...OPENSECRETS, url: 'https://www.opensecrets.org/orgs/susan-b-anthony-list/summary?id=D000024874' },
      { name: 'SBA Pro-Life America', url: 'https://sbaprolife.org', tier: 'official', sourceType: 'official-site' },
      CONGRESS_GOV,
    ],
    spendingByParty: {
      cycle: '2024',
      recordType: 'PAC/independent-expenditure demo aggregate',
      disclosureNote: 'Demo values reflect a Republican-heavy pattern visible in anti-abortion electoral advocacy; verify exact totals by entity and cycle.',
      parties: [
        { party: 'Democratic', amount: 40000, percentage: 1 },
        { party: 'Republican', amount: 3950000, percentage: 98 },
        { party: 'Independent/Other', amount: 10000, percentage: 1 },
      ],
    },
    topRecipients: [
      { name: 'Anti-abortion House candidates', party: 'R', office: 'U.S. House', amount: 1220000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'Anti-abortion Senate candidates', party: 'R', office: 'U.S. Senate', amount: 1160000, cycle: '2024', recordType: 'PAC/IE demo aggregate', sourceNote: 'Grouped demo category; exact candidate list should come from FEC.' },
      { name: 'State abortion-policy races', party: 'R', office: 'State offices', amount: 760000, cycle: '2024', recordType: 'State advocacy sample', sourceNote: 'Representative placeholder pending state-level import.' },
    ],
    promotedBillsIssues: [
      { title: 'Federal and state abortion restriction proposals', positionLabel: 'Supported policy area', summary: 'The organization supports laws restricting abortion access and opposes federal abortion-rights legislation.', source: { name: 'SBA Pro-Life America issues', url: 'https://sbaprolife.org', tier: 'official', sourceType: 'official-site' } },
      { title: "Women's Health Protection Act", billId: 'H.R.3755 / S.1975', chamber: '117th Congress', positionLabel: 'Opposed policy area', summary: 'Anti-abortion groups opposed federal legislation to protect abortion access; official bill records should be paired with advocacy statements.', source: CONGRESS_GOV },
    ],
    historyTimeline: [
      { year: '1990s', title: 'Organization founded', detail: 'Founded as Susan B. Anthony List, focused on electing anti-abortion candidates.', source: { name: 'SBA Pro-Life America about page', url: 'https://sbaprolife.org/about', tier: 'official', sourceType: 'official-site' } },
      { year: '2022', title: 'Rebrand after Dobbs era begins', detail: 'The organization rebranded as Susan B. Anthony Pro-Life America around the post-Dobbs policy environment.', source: { name: 'SBA Pro-Life America', url: 'https://sbaprolife.org', tier: 'official', sourceType: 'official-site' } },
      { year: 'Current cycles', title: 'Federal and state election activity', detail: 'Disclosed election activity appears in FEC and state campaign finance systems, with federal aggregates available through OpenSecrets.', source: FEC },
    ],
    stanceSections: [
      { title: 'Abortion Restrictions', summary: 'Supports legal restrictions on abortion and candidates aligned with anti-abortion policy goals.', source: { name: 'SBA Pro-Life America', url: 'https://sbaprolife.org', tier: 'official', sourceType: 'official-site' } },
      { title: 'Candidate Endorsements', summary: 'Publishes endorsements and scorecard-style advocacy materials; these should be labeled as organizational advocacy, not neutral ratings.', source: { name: 'SBA Pro-Life America candidates', url: 'https://sbaprolife.org/candidates', tier: 'official', sourceType: 'official-site' } },
    ],
    dataCompleteness: {
      level: 'Demo sample',
      lastUpdated: '2026-06-23',
      notes: [
        'Included as a counterpoint to the Planned Parenthood profile for a more balanced reproductive-policy demo set.',
        'Production should separate federal FEC activity from state ballot, judicial, and legislative advocacy records.',
      ],
    },
    caveat: 'Patterns shown are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.',
  },
];

export const lobbyingGroupCategories: { value: AdvocacyGroupCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Issues' },
  { value: 'foreign-policy', label: 'Foreign Policy' },
  { value: 'trade-association', label: 'Trade Associations' },
  { value: 'gun-rights', label: 'Gun Rights' },
  { value: 'reproductive-rights', label: 'Reproductive Rights' },
  { value: 'anti-abortion', label: 'Anti-Abortion' },
];

export const lobbyingScopeOptions: { value: LobbyScope | 'all'; label: string }[] = [
  { value: 'all', label: 'All scopes' },
  { value: 'domestic', label: 'Domestic advocacy' },
  { value: 'foreign', label: 'Foreign-policy lobbying' },
];

export function lobbyScopeLabel(scope: LobbyScope): string {
  return scope === 'foreign' ? 'Foreign-policy lobbying' : 'Domestic advocacy';
}

export function getTotalSpending(group: LobbyingGroup): number {
  return group.spendingByParty.parties.reduce((sum, party) => sum + party.amount, 0);
}

export function getDominantParty(group: LobbyingGroup): PartySpending {
  return [...group.spendingByParty.parties].sort((a, b) => b.amount - a.amount)[0];
}
