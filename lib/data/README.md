# Mock political data

This directory contains **illustrative mock data** for development and demos. It is not a live government database.

## Production data sources

A production deployment would integrate authoritative sources referenced in the [GWU Political Science database guide](https://libguides.gwu.edu/poliscidatabases), including:

| Source | Use |
|--------|-----|
| [FEC](https://www.fec.gov) | Campaign finance, donor disclosures |
| [Congress.gov](https://www.congress.gov) | Bills, roll-call votes, member records |
| [GovTrack.us](https://www.govtrack.us) | Voting record aggregation, bill tracking |
| [Ballotpedia](https://ballotpedia.org) | Elections, offices, biographical context |
| [Senate/House STOCK Act disclosures](https://www.senate.gov) | Financial trades |
| State legislature & secretary of state APIs | Governors, state lawmakers, county officials |
| NACo / county government sites | Local elected officials |

## Coverage notes

- **Federal officials**: Featured states (FL, KY, NY, VT) have expanded profiles; other states show partial or no federal roster in mock data.
- **Counties**: Only a sample of counties nationwide have official profiles. Counties without entries should display an integration-in-progress message in the UI.
- **Evidence items**: Issue positions use `EvidenceItem` arrays with `official` and `nonpartisan` source tiers; verify all claims against primary sources before production use.
