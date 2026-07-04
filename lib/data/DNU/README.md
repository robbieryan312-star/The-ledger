# Quarantined hand-authored data (DO NOT USE)

These files contain hand-authored mock/demo data that has been exiled from the app interface.

**NEVER imported by app code.** Retained solely as leads for pipeline collection cross-checks.

Nothing here may be copied into generated data without passing the full verification gate
with a specific retrievable source (URL + date + tier + corroboration per ledger-data-policy).

## Files
- mockPoliticians.ts — former featured profile scaffolding (controversies, endorsements, trades, etc.)
- additionalPoliticians.ts — supplemental featured profiles
- mockStockTrades.ts — synthetic stock trade demo data
- mockLobbyingGroups.ts — synthetic lobbying demo data
- mockElections.ts — synthetic election demo data
- mockCounties.ts — synthetic county official demo data

## Policy
Real facts re-enter the platform ONLY through sync pipelines that produce files in
lib/data/generated/ with verifiable sources. Hand-copying from these files is banned.
