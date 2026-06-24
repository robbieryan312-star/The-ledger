import { Source } from '@/lib/types';
import {
  CONGRESS_GOV as CONGRESS_GOV_TRUSTED,
  FEC as FEC_TRUSTED,
  LDA_SENATE,
  OPENSECRETS as OPENSECRETS_TRUSTED,
  PEW_ABORTION_DOBBS_2024,
  PEW_ECONOMIC_HOUSING_CONCERN_2024,
  PEW_GUN_ATTITUDES_2024,
  PEW_HOUSING_AFFORDABILITY_2024,
  PEW_ISRAEL_HAMAS_WAR_2024,
  PEW_US_ROLE_ISRAEL_WAR_2024,
  toSource,
} from '@/lib/data/trustedSources';

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
  sourceType: 'filing' | 'aggregate' | 'official-site' | 'legislative-record' | 'news-context' | 'research';
}

/** Individual federal officeholder linked to disclosed PAC or lobby-connected contributions. */
export interface FederalRecipient {
  politicianId: string;
  name: string;
  party: 'D' | 'R' | 'I' | 'Mixed';
  office: string;
  amount: number;
  cycle: string;
  recordType: string;
  sourceNote: string;
  /** True when amount is illustrative/demo rather than a live FEC line item. */
  isDemo: boolean;
}

/** How a linked recipient voted on legislation the group lobbied on or publicly tracked. */
export interface RecipientVoteOnBill {
  politicianId: string;
  vote: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  date: string;
  isDemo: boolean;
  congressGovUrl?: string;
  note?: string;
}

export interface RelatedLobbyVote {
  billId: string;
  billTitle: string;
  chamber: string;
  cycle: string;
  groupPositionLabel: string;
  congressGovUrl: string;
  source: LobbyingGroupSource;
  recipientVotes: RecipientVoteOnBill[];
  disclosureNote?: string;
}

/** Aggregate spending bucket (non-individual). */
export interface LobbyingRecipient {
  name: string;
  politicianId?: string;
  party: 'D' | 'R' | 'I' | 'Mixed';
  office: string;
  amount: number;
  cycle: string;
  recordType: string;
  sourceNote: string;
}

/** Tier 2 research context — public-opinion background adjacent to advocacy topics. */
export interface ResearchContextItem {
  topic: string;
  summary: string;
  source: LobbyingGroupSource;
  recordDate: string;
  asOf: string;
  relevanceNote?: string;
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
    methodologyNote: string;
    parties: PartySpending[];
  };
  federalRecipients: FederalRecipient[];
  relatedVotes: RelatedLobbyVote[];
  topRecipients: LobbyingRecipient[];
  researchContext?: ResearchContextItem[];
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
  /**
   * Legal registrations shown as sourced facts — the authoritative "what kind of
   * organization is this" descriptor (LDA lobbying, FEC committees, IRS tax status,
   * and FARA only where actually registered). Replaces any inferred functional label.
   */
  registrations?: {
    type: string;
    status: string;
    detail: string;
    source: LobbyingGroupSource;
  }[];
  /**
   * The organization's OWN stated agenda, in its own attributed claims — presented for
   * context with source links so users judge for themselves, never as The Ledger's
   * characterization. Quotes/paraphrases must be attributable to the linked source.
   */
  statedAgenda?: {
    intro: string;
    claims: { text: string; source: LobbyingGroupSource }[];
  };
  caveat: string;
}

const FEC: LobbyingGroupSource = {
  ...toSource(FEC_TRUSTED),
  sourceType: 'filing',
};

const CONGRESS_GOV: LobbyingGroupSource = {
  ...toSource(CONGRESS_GOV_TRUSTED),
  sourceType: 'legislative-record',
};

const LDA: LobbyingGroupSource = {
  ...toSource(LDA_SENATE),
  sourceType: 'filing',
};

const OPENSECRETS: LobbyingGroupSource = {
  ...toSource(OPENSECRETS_TRUSTED),
  sourceType: 'aggregate',
};

const AIPAC_SITE: LobbyingGroupSource = {
  name: 'AIPAC',
  url: 'https://www.aipac.org/about',
  tier: 'official',
  sourceType: 'official-site',
};

function pewContext(source: Source, description?: string): LobbyingGroupSource {
  return {
    ...source,
    sourceType: 'research',
    description: description ?? source.description,
  };
}

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
      'AIPAC is a U.S.-based pro-Israel advocacy organization founded in the 1950s; historical accounts report it operated under the name American Zionist Committee for Public Affairs before adopting the AIPAC branding. It advocates for a close U.S.-Israel relationship through grassroots lobbying, annual policy conferences, and affiliated PAC and independent-expenditure vehicles disclosed separately in FEC records. LDA filings show registered federal lobbying on foreign-aid and defense-cooperation measures; OpenSecrets aggregates commonly report roughly balanced direct PAC contributions across parties in recent cycles — the illustrative 2024 demo split below is approximately 48% Democratic and 51% Republican.',
    issueFocus: ['U.S.-Israel relations', 'Foreign aid', 'Middle East policy', 'Defense cooperation'],
    registrations: [
      {
        type: 'Federal lobbying (LDA)',
        status: 'Registered',
        detail:
          'Registered to lobby Congress under the Lobbying Disclosure Act; filings cover foreign-aid and defense-cooperation measures.',
        source: LDA,
      },
      {
        type: 'Affiliated committees (FEC)',
        status: 'Registered',
        detail:
          'Affiliated political committees — AIPAC PAC and the United Democracy Project (a super PAC) — are registered with the FEC and file independently.',
        source: FEC,
      },
      {
        type: 'Tax status (IRS)',
        status: '501(c)(4) social welfare organization',
        detail: 'Organized as a 501(c)(4); affiliated political committees file separately with the FEC.',
        source: { name: 'IRS Exempt Organizations', url: 'https://www.irs.gov/charities-non-profits', tier: 'official', sourceType: 'official-site' },
      },
      {
        type: 'Foreign agent (FARA)',
        status: 'Not registered',
        detail:
          'AIPAC is not listed as a registrant in the U.S. Department of Justice FARA database. AIPAC states it is not funded or directed by any foreign government.',
        source: { name: 'DOJ FARA Registry', url: 'https://efile.fara.gov', tier: 'official', sourceType: 'filing' },
      },
    ],
    statedAgenda: {
      intro:
        "The points below are AIPAC's own stated positions, drawn from its public materials and linked to the source — presented for context so readers can judge for themselves, not as The Ledger's characterization.",
      claims: [
        {
          text: 'AIPAC states its mission is to advocate for policies that strengthen the U.S.\u2013Israel relationship and to help elect candidates who support that alliance.',
          source: AIPAC_SITE,
        },
        {
          text: '\u201CAmerica is safer, stronger, and more prosperous when its relationship with Israel is ironclad.\u201D (AIPAC)',
          source: AIPAC_SITE,
        },
        {
          text: 'AIPAC describes itself as \u201Cleading the political fight to keep Congress pro-Israel,\u201D and says it works to help pro-Israel candidates win elections in both parties.',
          source: AIPAC_SITE,
        },
        {
          text: 'AIPAC states that it is not funded by or directed by the Israeli government or any foreign entity.',
          source: AIPAC_SITE,
        },
      ],
    },
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
      methodologyNote:
        'Party percentages sum disclosed direct PAC contributions and affiliated independent expenditures by recipient party registration in the stated cycle. Outside-spending entities that do not itemize to candidates are excluded from these bars. Demo figures — refresh from FEC itemized downloads before production.',
      parties: [
        { party: 'Democratic', amount: 8800000, percentage: 48 },
        { party: 'Republican', amount: 9300000, percentage: 51 },
        { party: 'Independent/Other', amount: 200000, percentage: 1 },
      ],
    },
    federalRecipients: [
      { politicianId: 'mitch-mcconnell', name: 'Mitch McConnell', party: 'R', office: 'U.S. Senate (KY)', amount: 18500, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo amount patterned on foreign-affairs committee recipients; verify against FEC itemized schedule A.', isDemo: true },
      { politicianId: 'sen-schumer', name: 'Chuck Schumer', party: 'D', office: 'U.S. Senate (NY)', amount: 16200, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo amount; Schumer has publicly addressed AIPAC conferences — FEC line items should be refreshed.', isDemo: true },
      { politicianId: 'rep-moskowitz', name: 'Jared Moskowitz', party: 'D', office: 'U.S. House (FL-23)', amount: 10000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for a featured House member on foreign-affairs jurisdiction.', isDemo: true },
      { politicianId: 'bernie-sanders', name: 'Bernie Sanders', party: 'I', office: 'U.S. Senate (VT)', amount: 0, cycle: '2024', recordType: 'No itemized PAC receipt (demo flag)', sourceNote: 'Sanders does not accept corporate PAC money per campaign policy; listed to show $0 linkage rather than omission.', isDemo: true },
    ],
    relatedVotes: [
      {
        billId: 'H.R.815',
        billTitle: 'National Security Supplemental (Israel, Ukraine, Taiwan aid)',
        chamber: '118th Congress',
        cycle: '2024',
        groupPositionLabel: 'Supported policy area',
        congressGovUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/815',
        source: CONGRESS_GOV,
        disclosureNote: 'Roll-call positions below are sourced from Congress.gov / senate.gov records where available; amounts in Federal recipients are demo.',
        recipientVotes: [
          { politicianId: 'mitch-mcconnell', vote: 'Yea', date: '2024-04-23', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/815', note: 'Senate roll-call on consolidated supplemental.' },
          { politicianId: 'bernie-sanders', vote: 'Nay', date: '2024-04-23', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/815', note: 'Sanders cited concerns about unconditional aid provisions.' },
          { politicianId: 'rep-massie', vote: 'Nay', date: '2024-02-13', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/815', note: 'House vote on Israel supplemental portion.' },
          { politicianId: 'alexandria-ocasio-cortez', vote: 'Nay', date: '2024-04-20', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/118th-congress/house-bill/815', note: 'Demo-flagged until live House roll-call is synced for this member.' },
        ],
      },
    ],
    researchContext: [
      {
        topic: 'U.S. public views on Israel aid',
        summary:
          'A Pew Research Center survey fielded Feb. 13–25, 2024 (n=12,693 adults) found Americans divided on sending military aid to Israel: 36% favored, 34% opposed, with the remainder unsure or neutral. This context is independent of any advocacy group position.',
        source: pewContext(PEW_US_ROLE_ISRAEL_WAR_2024),
        recordDate: '2024-03-21',
        asOf: '2026-06-23',
        relevanceNote: 'Background for foreign-aid debates that pro-Israel groups commonly track.',
      },
      {
        topic: 'Sympathy toward Israelis and Palestinians',
        summary:
          'The same Pew survey series reported that 57% of U.S. adults sympathized at least to some extent with both Israelis and Palestinians, including 26% who said their sympathies lay equally with both groups (published March 21, 2024).',
        source: pewContext(PEW_ISRAEL_HAMAS_WAR_2024),
        recordDate: '2024-03-21',
        asOf: '2026-06-23',
      },
    ],
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
      { title: 'U.S.-Israel Relationship', summary: 'AIPAC materials describe support for policies strengthening U.S.-Israel security, diplomatic, and economic ties. LDA filings list lobbying on foreign-aid and defense-cooperation measures in recent Congresses.', source: { name: 'AIPAC policy priorities', url: 'https://www.aipac.org/policy', tier: 'official', sourceType: 'official-site' } },
      { title: 'Foreign Assistance', summary: 'Organization advocates continued U.S. security assistance for Israel. Bill text and member roll-call positions are recorded on Congress.gov; The Ledger links votes without asserting why any member voted a given way.', source: CONGRESS_GOV },
      { title: 'Electoral Activity', summary: 'Affiliated PAC and independent-expenditure vehicles operate separately from grassroots lobbying. FEC and OpenSecrets publish itemized contribution and outside-spending records by cycle.', source: FEC },
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
      'The National Association of Realtors is a real estate trade association founded in 1908 as the National Association of Real Estate Boards; it adopted the current Realtor branding in the 1970s. With more than 1.5 million members per NAR membership reports, its advocacy centers on housing supply, mortgage finance, property tax, flood insurance, and real estate regulation. NAR\'s federal PAC (REALTOR PAC) commonly shows bipartisan contribution patterns weighted toward members of the House Financial Services and Ways and Means committees — illustrative 2024 demo figures below are approximately 47% Democratic and 52% Republican.',
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
      methodologyNote:
        'Percentages reflect REALTOR PAC itemized contributions to federal candidates by party registration in the stated cycle. Leadership PAC transfers and state-level Realtor association spending are excluded. Demo aggregate — replace with FEC schedule A import.',
      parties: [
        { party: 'Democratic', amount: 2500000, percentage: 47 },
        { party: 'Republican', amount: 2750000, percentage: 52 },
        { party: 'Independent/Other', amount: 50000, percentage: 1 },
      ],
    },
    federalRecipients: [
      { politicianId: 'rep-bean', name: 'Aaron Bean', party: 'R', office: 'U.S. House (FL-04)', amount: 15000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for a Florida House member; NAR commonly supports real-estate–heavy districts.', isDemo: true },
      { politicianId: 'sen-scott', name: 'Rick Scott', party: 'R', office: 'U.S. Senate (FL)', amount: 12000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo amount; verify against FEC itemized filings.', isDemo: true },
      { politicianId: 'alexandria-ocasio-cortez', name: 'Alexandria Ocasio-Cortez', party: 'D', office: 'U.S. House (NY-14)', amount: 5000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for Financial Services committee jurisdiction pattern.', isDemo: true },
      { politicianId: 'rep-salazar', name: 'María Elvira Salazar', party: 'R', office: 'U.S. House (FL-27)', amount: 10000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for South Florida housing-market relevance.', isDemo: true },
    ],
    relatedVotes: [
      {
        billId: 'H.R.6644',
        billTitle: 'Housing supply and affordability legislation',
        chamber: '119th Congress',
        cycle: '2026',
        groupPositionLabel: 'Supported policy area',
        congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/6644',
        source: CONGRESS_GOV,
        disclosureNote: 'NAR publicly tracks housing-supply bills; roll-call rows use Congress.gov snapshot votes where synced, else demo-flagged.',
        recipientVotes: [
          { politicianId: 'bernie-sanders', vote: 'Yea', date: '2026-06-22', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/6644', note: 'Senate motion to concur — official roll-call from congressVotes snapshot.' },
          { politicianId: 'mitch-mcconnell', vote: 'Yea', date: '2026-06-22', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/6644', note: 'Senate motion to concur — official roll-call from congressVotes snapshot.' },
          { politicianId: 'rep-bean', vote: 'Yea', date: '2026-06-15', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/6644', note: 'Demo-flagged House vote pending sync for this member.' },
          { politicianId: 'alexandria-ocasio-cortez', vote: 'Yea', date: '2026-06-15', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/119th-congress/house-bill/6644', note: 'Demo-flagged; AOC has supported housing-investment bills in prior Congresses.' },
        ],
      },
    ],
    researchContext: [
      {
        topic: 'Public concern about housing costs',
        summary:
          'Pew Research Center reported in October 2024 that 69% of U.S. adults said they were very concerned about the cost of housing, citing a Center survey — up from 61% in April 2023.',
        source: pewContext(PEW_HOUSING_AFFORDABILITY_2024),
        recordDate: '2024-10-25',
        asOf: '2026-06-23',
        relevanceNote: 'Context for housing-supply and affordability legislation NAR tracks.',
      },
      {
        topic: 'Housing as a top economic concern',
        summary:
          'A September 2024 Pew survey on economic concerns found housing costs among the issues Americans rated most worrisome, alongside food and consumer prices.',
        source: pewContext(PEW_ECONOMIC_HOUSING_CONCERN_2024),
        recordDate: '2024-09-09',
        asOf: '2026-06-23',
      },
    ],
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
      { title: 'Housing Supply', summary: 'NAR advocacy materials support policies described as increasing housing inventory and reducing barriers to homeownership, including zoning and permitting reforms at state and federal levels.', source: { name: 'NAR Advocacy', url: 'https://www.nar.realtor/advocacy', tier: 'official', sourceType: 'official-site' } },
      { title: 'Real Estate Finance', summary: 'Organization tracks mortgage finance, National Flood Insurance Program reauthorization, property tax, and lending rules that affect transactions. LDA quarterly reports list specific bills lobbied.', source: LDA },
      { title: 'Member Services vs. PAC Activity', summary: 'NAR membership services and REALTOR PAC federal contributions are separate record types; PAC itemized schedules are filed with the FEC.', source: FEC },
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
      'The NRA Political Victory Fund is the National Rifle Association\'s affiliated federal PAC, founded alongside the NRA\'s modern political advocacy expansion in the 1970s. The broader NRA was established in 1871; NRA-PVF publishes candidate questionnaires and grades while disclosing direct contributions and independent expenditures in FEC records. NRA-PVF spending commonly skews heavily Republican — illustrative 2024 demo figures show approximately 96% to Republican recipients and 3% to Democratic recipients.',
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
      methodologyNote:
        'Party bars sum NRA-PVF itemized contributions plus reported independent expenditures benefiting candidates by party registration. NRA Institute for Legislative Action lobbying filings are a separate record type. Demo aggregate.',
      parties: [
        { party: 'Democratic', amount: 60000, percentage: 3 },
        { party: 'Republican', amount: 1940000, percentage: 96 },
        { party: 'Independent/Other', amount: 20000, percentage: 1 },
      ],
    },
    federalRecipients: [
      { politicianId: 'rep-massie', name: 'Thomas Massie', party: 'R', office: 'U.S. House (KY-04)', amount: 9500, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo; Massie holds Gun Owners of America A+ ratings and is a frequent gun-rights ally.', isDemo: true },
      { politicianId: 'mitch-mcconnell', name: 'Mitch McConnell', party: 'R', office: 'U.S. Senate (KY)', amount: 10000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo patterned on Kentucky Republican recipients.', isDemo: true },
      { politicianId: 'sen-paul', name: 'Rand Paul', party: 'R', office: 'U.S. Senate (KY)', amount: 8500, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo; Paul has high gun-rights advocacy ratings.', isDemo: true },
      { politicianId: 'gov-desantis', name: 'Ron DeSantis', party: 'R', office: 'Governor (FL)', amount: 0, cycle: '2024', recordType: 'State-level (not federal PAC)', sourceNote: 'Governors are not federal PAC recipients; listed for policy alignment context only.', isDemo: true },
    ],
    relatedVotes: [
      {
        billId: 'S.2938',
        billTitle: 'Bipartisan Safer Communities Act',
        chamber: '117th Congress',
        cycle: '2022',
        groupPositionLabel: 'Opposed policy area',
        congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938',
        source: CONGRESS_GOV,
        recipientVotes: [
          { politicianId: 'mitch-mcconnell', vote: 'Yea', date: '2022-06-23', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938', note: 'McConnell was among 15 Senate Republicans who voted for the bill.' },
          { politicianId: 'rep-massie', vote: 'Nay', date: '2022-06-24', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938', note: 'House concurrence vote — Massie opposed.' },
          { politicianId: 'bernie-sanders', vote: 'Yea', date: '2022-06-23', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938', note: 'Senate passage roll-call.' },
          { politicianId: 'alexandria-ocasio-cortez', vote: 'Yea', date: '2022-06-24', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/2938', note: 'Demo-flagged House vote; AOC supported gun-safety provisions in public statements.' },
        ],
      },
    ],
    researchContext: [
      {
        topic: 'Gun rights vs. gun control priorities',
        summary:
          'Pew Research Center\'s April 2024 survey found 51% of U.S. adults said it was more important to protect the right to own guns, while 48% said controlling gun ownership was more important — a near-even split.',
        source: pewContext(PEW_GUN_ATTITUDES_2024),
        recordDate: '2024-07-24',
        asOf: '2026-06-23',
        relevanceNote: 'Public-opinion backdrop for Second Amendment policy debates NRA-PVF tracks.',
      },
      {
        topic: 'Support for stricter gun laws',
        summary:
          'The same Pew summary notes 58% of Americans favored stricter gun laws in recent Center polling — a figure that coexists with the rights-vs.-control split above.',
        source: pewContext(PEW_GUN_ATTITUDES_2024, 'Pew short read aggregating April 2024 ATP survey on gun policy attitudes'),
        recordDate: '2024-07-24',
        asOf: '2026-06-23',
      },
    ],
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
      { title: 'Firearm Ownership Rights', summary: 'NRA-PVF materials support broad Second Amendment protections and oppose many proposed federal firearm restrictions, including expanded background-check mandates beyond current law.', source: { name: 'NRA-PVF', url: 'https://www.nrapvf.org', tier: 'official', sourceType: 'official-site' } },
      { title: 'Candidate Ratings', summary: 'Publishes questionnaires and voting-record-based grades for federal candidates. Ratings are organizational advocacy products, not neutral government records.', source: { name: 'NRA-PVF grades', url: 'https://www.nrapvf.org/grades/', tier: 'official', sourceType: 'official-site' } },
      { title: 'Record Separation', summary: 'NRA-PVF PAC filings are distinct from NRA Institute for Legislative Action lobbying registrations and from state-level affiliate activity.', source: FEC },
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
      'Planned Parenthood Action Fund is the advocacy and political arm associated with Planned Parenthood, established in 1989. It supports candidates and policies aligned with abortion rights, contraception access, and reproductive healthcare coverage. FEC and organizational disclosures show electoral activity through PAC contributions, independent expenditures, and endorsements; spending commonly skews Democratic — illustrative 2024 demo figures show approximately 97% to Democratic recipients.',
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
      methodologyNote:
        'Party percentages sum PPAF PAC itemized contributions and reported IE benefiting federal candidates by party registration. Health-provider records and 501(c)(3) activity are excluded. Demo aggregate.',
      parties: [
        { party: 'Democratic', amount: 3300000, percentage: 97 },
        { party: 'Republican', amount: 70000, percentage: 2 },
        { party: 'Independent/Other', amount: 30000, percentage: 1 },
      ],
    },
    federalRecipients: [
      { politicianId: 'alexandria-ocasio-cortez', name: 'Alexandria Ocasio-Cortez', party: 'D', office: 'U.S. House (NY-14)', amount: 5000, cycle: '2024', recordType: 'Endorsement / IE (demo)', sourceNote: 'Illustrative demo; PPAF endorsed AOC in prior cycles per organizational pages.', isDemo: true },
      { politicianId: 'sen-gillibrand', name: 'Kirsten Gillibrand', party: 'D', office: 'U.S. Senate (NY)', amount: 10000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for a featured Senate Democrat with reproductive-rights record.', isDemo: true },
      { politicianId: 'rep-moskowitz', name: 'Jared Moskowitz', party: 'D', office: 'U.S. House (FL-23)', amount: 2500, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo amount.', isDemo: true },
      { politicianId: 'mitch-mcconnell', name: 'Mitch McConnell', party: 'R', office: 'U.S. Senate (KY)', amount: 0, cycle: '2024', recordType: 'No itemized receipt (demo flag)', sourceNote: 'Listed as $0 — PPAF opposes McConnell-aligned anti-abortion judicial strategy per public advocacy materials.', isDemo: true },
    ],
    relatedVotes: [
      {
        billId: 'H.R.3755',
        billTitle: "Women's Health Protection Act",
        chamber: '117th Congress',
        cycle: '2021',
        groupPositionLabel: 'Supported policy area',
        congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755',
        source: CONGRESS_GOV,
        recipientVotes: [
          { politicianId: 'alexandria-ocasio-cortez', vote: 'Yea', date: '2021-09-24', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755', note: 'House passage roll-call — Ocasio-Cortez co-sponsored.' },
          { politicianId: 'sen-gillibrand', vote: 'Yea', date: '2022-05-11', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/1975', note: 'Demo-flagged Senate cloture vote; Gillibrand co-sponsored Senate companion.' },
          { politicianId: 'mitch-mcconnell', vote: 'Nay', date: '2022-05-11', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/1975', note: 'Demo-flagged; McConnell opposed federal abortion-rights legislation.' },
          { politicianId: 'rep-massie', vote: 'Nay', date: '2021-09-24', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755', note: 'Demo-flagged House vote.' },
        ],
      },
    ],
    researchContext: [
      {
        topic: 'Public support for legal abortion',
        summary:
          'Pew Research Center surveyed 8,709 adults April 8–14, 2024 and reported 63% said abortion should be legal in all or most cases, up 4 points since 2021 (published May 13, 2024).',
        source: pewContext(PEW_ABORTION_DOBBS_2024),
        recordDate: '2024-05-13',
        asOf: '2026-06-23',
        relevanceNote: 'Public-opinion context for reproductive-rights electoral advocacy.',
      },
    ],
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
      'Susan B. Anthony Pro-Life America is an anti-abortion advocacy organization founded in the 1990s as Susan B. Anthony List; it rebranded to the current name in 2022. It supports candidates and policies restricting abortion access and opposes federal abortion-rights legislation. FEC records show PAC and independent-expenditure activity that commonly skews Republican — illustrative 2024 demo figures show approximately 98% to Republican recipients.',
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
      methodologyNote:
        'Party bars sum SBA Pro-Life America PAC contributions and independent expenditures by recipient party registration. State ballot and judicial-race spending is excluded from federal bars. Demo aggregate.',
      parties: [
        { party: 'Democratic', amount: 40000, percentage: 1 },
        { party: 'Republican', amount: 3950000, percentage: 98 },
        { party: 'Independent/Other', amount: 10000, percentage: 1 },
      ],
    },
    federalRecipients: [
      { politicianId: 'rep-donalds', name: 'Byron Donalds', party: 'R', office: 'U.S. House (FL-19)', amount: 10000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo; Donalds has publicly aligned with anti-abortion policy positions.', isDemo: true },
      { politicianId: 'mitch-mcconnell', name: 'Mitch McConnell', party: 'R', office: 'U.S. Senate (KY)', amount: 7500, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo patterned on Senate Republican recipients.', isDemo: true },
      { politicianId: 'sen-moody', name: 'Ashley Moody', party: 'R', office: 'U.S. Senate (FL)', amount: 5000, cycle: '2024', recordType: 'PAC contribution (demo)', sourceNote: 'Illustrative demo for a newly seated Florida Republican senator.', isDemo: true },
      { politicianId: 'bernie-sanders', name: 'Bernie Sanders', party: 'I', office: 'U.S. Senate (VT)', amount: 0, cycle: '2024', recordType: 'No itemized receipt (demo flag)', sourceNote: 'Listed as $0 — organization opposes Sanders-aligned abortion-rights positions.', isDemo: true },
    ],
    relatedVotes: [
      {
        billId: 'H.R.3755',
        billTitle: "Women's Health Protection Act",
        chamber: '117th Congress',
        cycle: '2021',
        groupPositionLabel: 'Opposed policy area',
        congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755',
        source: CONGRESS_GOV,
        recipientVotes: [
          { politicianId: 'rep-donalds', vote: 'Nay', date: '2021-09-24', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755', note: 'Demo-flagged; Donalds was not yet in Congress — illustrative opposition pattern.' },
          { politicianId: 'mitch-mcconnell', vote: 'Nay', date: '2022-05-11', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/senate-bill/1975', note: 'Demo-flagged Senate cloture vote.' },
          { politicianId: 'alexandria-ocasio-cortez', vote: 'Yea', date: '2021-09-24', isDemo: false, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755', note: 'House passage roll-call.' },
          { politicianId: 'gov-desantis', vote: 'Nay', date: '2023-04-13', isDemo: true, congressGovUrl: 'https://www.congress.gov/bill/117th-congress/house-bill/3755', note: 'Governor action context — signed FL 6-week ban; not a federal roll-call.' },
        ],
      },
    ],
    researchContext: [
      {
        topic: 'Public views on abortion legality',
        summary:
          'Pew Research Center (May 2024) reported 36% of U.S. adults said abortion should be illegal in all or most cases — the complement to the 63% who favored legality in the same survey. Partisan divides were wide: 85% of Democrats favored legal abortion vs. 41% of Republicans.',
        source: pewContext(PEW_ABORTION_DOBBS_2024),
        recordDate: '2024-05-13',
        asOf: '2026-06-23',
        relevanceNote: 'Public-opinion context for anti-abortion electoral strategy.',
      },
    ],
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
      { title: 'Abortion Restrictions', summary: 'Organization materials support legal restrictions on abortion and candidates aligned with anti-abortion policy goals at federal and state levels.', source: { name: 'SBA Pro-Life America', url: 'https://sbaprolife.org', tier: 'official', sourceType: 'official-site' } },
      { title: 'Judicial Nominations', summary: 'Public advocacy emphasizes confirming judges described as respecting prior abortion jurisprudence before Dobbs and state-level authority afterward.', source: { name: 'SBA Pro-Life America about page', url: 'https://sbaprolife.org/about', tier: 'official', sourceType: 'official-site' } },
      { title: 'Candidate Endorsements', summary: 'Publishes endorsements and scorecard-style materials labeled as organizational advocacy, not neutral third-party ratings.', source: { name: 'SBA Pro-Life America candidates', url: 'https://sbaprolife.org/candidates', tier: 'official', sourceType: 'official-site' } },
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
