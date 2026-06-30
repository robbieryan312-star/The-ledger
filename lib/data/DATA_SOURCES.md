# The Ledger — Data Sources

> **Production source routing:** see [`SOURCE_LOOKUP.md`](./SOURCE_LOOKUP.md) and [`sourceCatalog.ts`](./sourceCatalog.ts).  
> This file describes mock vs live data history; the catalog is authoritative for agents.

This document describes what is **mock/demo data** in the current build versus the **production integration path**.

## Demo (current)

| Area | File(s) | Notes |
|------|---------|-------|
| Federal politicians | `mockPoliticians.ts`, `additionalPoliticians.ts` | Curated profiles with evidence-backed `topIssues`, votes, finance, controversies |
| Stock trades | `mockStockTrades.ts` | 56 STOCK Act–style disclosures across 5 featured officials |
| Lobbying & advocacy groups | `mockLobbyingGroups.ts` | Demo profiles for advocacy/trade groups with sourced history, issue positions, party distribution bars, top recipient samples, and explicit caveats |
| Elections & candidates | `mockElections.ts` | Illustrative 2026/2028 races; candidate `topIssues` include `evidence[]` where supported |
| Counties & local officials | `mockCounties.ts` | Sample FL/TX/CA/NY counties; counties without data show an integration message on the map |
| ZIP lookup | `zipLookup.ts` | Small demo ZIP crosswalk (e.g. `33426` → Palm Beach, FL) |
| State metadata | `mockStates` in `mockPoliticians.ts` | `activePoliticians` reflects profiled officials in the demo DB, not full congressional rosters |

All demo records use realistic source tiers (`official`, `nonpartisan`, `media`) and URLs where applicable. Positions are phrased as what available records show, not editorial verdicts.

## Demo coverage policy

The current demo uses a minimal tiered data policy:

- **Federal and state profiles:** comprehensive demo coverage is allowed when supported by cited votes, actions, filings, or public statements.
- **Local profiles:** show action-record coverage only, such as official duties, county records, prosecutions, budgets, or public actions. Do not infer broad ideological positions from thin local data.
- **Missing records:** when a topic has no verified vote, action, filing, or statement in the demo dataset, the UI should say “No verified record available in demo data” or “Limited demo coverage” rather than hiding the topic or inventing a position.

## Production path (not implemented)

When moving beyond the demo, plan to integrate:

| Source | Use |
|--------|-----|
| [FEC](https://www.fec.gov) | Campaign finance, PAC filings, candidate committees |
| [Congress.gov](https://www.congress.gov) | Bills, roll-call votes, member records |
| [GovTrack.us](https://www.govtrack.us) | Vote summaries, bill status, member ideology scores |
| [Lobbying Disclosure Act filings](https://lda.senate.gov/system/public/) | Registered lobbying clients, issues, lobbyists, covered officials, and quarterly activity |
| [Foreign Agents Registration Act filings](https://www.justice.gov/nsd-fara) | Registrant, foreign principal, activity, political contributions, and disbursement records where legally reported |
| OpenSecrets-style aggregates | Crosswalks between donors, PACs, industries, outside spending, lobbying clients, and recipient parties |
| Official group sites | Organization history, stated platform, candidate endorsements, policy priorities, and public issue pages, clearly labeled as advocacy-source material |
| [Ballotpedia](https://ballotpedia.org) | Elections, candidates, state/local offices |
| [STOCK Act disclosures](https://www.congress.gov/bill/112th-congress/senate-bill/2038) via [Senate Stock Watcher](https://senatestockwatcher.com) / [House Stock Watcher](https://housestockwatcher.com) | Congressional securities trades |
| [GWU Political Science Data Guide](https://guides.library.gwu.edu/polisci/data) | Directory of civic datasets and research APIs |
| State & county portals | Governor orders, state legislatures, county clerk/sheriff/SA sites |
| USPS ZIP crosswalk | Full ZIP → county/district mapping for My Ledger |

## Recommended integration order

1. **Congress.gov + GovTrack** — votes and sponsorship for federal profiles  
2. **FEC + OpenSecrets-style aggregates** — campaign finance (already cited in UI copy)  
3. **STOCK Act watchers** — live trade feed and conflict scoring  
4. **Ballotpedia / state SOS** — elections and gubernatorial/local races  
5. **County/NACo directories** — local officials on the map and county pages  

## Lobbying transparency architecture note

Future lobbying profiles should separate source records from interpretation:

- **Donor and recipient records:** FEC committee filings, independent-expenditure reports, electioneering communications, and candidate committee receipts. Keep direct PAC contributions, outside spending, and bundled/affiliated activity as distinct record types.
- **Lobbying records:** LDA issues, clients, registrants, lobbyists, covered officials, and quarterly amounts. Link the profile to the LDA filing and show the issue codes or narrative text that support each issue tag.
- **Foreign-affiliated records:** FARA registrations, foreign principal disclosures, activity reports, disbursements, and political contribution records where legally reported. Do not infer foreign direction from domestic advocacy records alone.
- **Aggregate research:** OpenSecrets-style aggregates are useful for party distribution bars, top recipient summaries, industry crosswalks, and historical trends. Treat them as secondary summaries backed by primary filings.
- **Official group sources:** Organization websites and policy pages can support history, stated agenda, endorsements, scorecards, and platform sections. Label them as official advocacy-source material rather than neutral records.
- **Congressional bill records:** Congress.gov should anchor bill IDs, sponsorship, text, status, and roll-call votes. The product can show whether a group publicly supported or opposed a bill, but should not claim a legislator voted because of a group.
- **Labels:** domestic PAC, foreign-connected PAC, FARA registrant, issue advocacy, trade association, nonprofit, super PAC, or hybrid profile, based on the record being shown.

For example, AIPAC should be described neutrally as a pro-Israel advocacy/lobbying organization. Any historical or reported terminology should be attributed to the source and date. The product should present records, links, and category labels without asserting motive or misconduct beyond what the underlying source supports.

Every lobbying/advocacy group profile should carry a caveat equivalent to: “Patterns are based on disclosed donations, endorsements, lobbying filings, and outside-spending records; they are not claims about motive, coordination, or improper influence.” Demo records may use illustrative totals for UI testing, but production pages need exact cycle, committee/entity, jurisdiction, source URL, and last-updated metadata.

## Environment

No API keys are required for the mock build. Production will need caching, rate limits, and clear “last updated” timestamps on every data surface.
