# File inventory audit — utilization · quality · necessity · accuracy

**GENERATED** — do not edit by hand. Regenerate:
`npm run audit:inventory && npm run audit:inventory-md`

**Generated:** 2026-07-19T19:41:57Z · **Baseline:** data/reports/file-inventory.json (274 files)
**Type:** FINDINGS ONLY — no deletions until Claude briefs.

## W3c accuracy finding

PILOT_PROFILE_CHECKLIST rows 5–6 claimed **done**; S000033 manifest has honest-gap for both. Checklist corrected; guard freezes status.

## Full file table

| Path | Purpose | Used-by | Claimed vs reality | Verdict | Evidence |
|------|---------|---------|-------------------|---------|----------|
| app/compare/CompareContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/compare/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/congress/CongressContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/congress/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/counties/[fips]/page.tsx | App route or layout | DEAD-PATH — no in-app links reach it | Honest-gap shell only; county data never wired | FIX | USAMap county literals empty |
| app/dashboard/DashboardContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/dashboard/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/elections/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/finance/FinanceContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/finance/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/layout.tsx | App route or layout | Next.js root layout (framework entry) | — | KEEP | Next.js app shell — no code importers |
| app/legislation/LegislationContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/legislation/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/lobbying/[id]/page.tsx | App route or layout | DEAD — notFound()-only; no inbound links | — | DELETE | rg /lobbying/ dynamic links → 0 |
| app/lobbying/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/politicians/PoliticiansContent.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/politicians/[id]/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/politicians/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/sitemap.ts | App route or layout | Next.js /sitemap.xml | Was 1-URL stub on main; full rebuild in PR #43 | FIX | 613 entries after W3b |
| app/sources/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/states/[code]/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| components/counties/OfficialCard.tsx | UI component | USAMap.tsx (import only — runtime DEAD) | Linked to /officials/[id] 404 on main; fixed in PR #43 | FIX | countyByFips never populated; W3a repoints links |
| components/dashboard/StateRosterControls.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/elections/CandidateTopicAccordion.tsx | UI component | DEAD — no importers | — | DELETE | elections page is static empty-state |
| components/finance/FollowTheMoneyPanel.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/layout/Footer.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/layout/Navigation.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/map/MapExplorer.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/map/USAMap.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ConsistencyScore.tsx | Politician profile UI | DEAD — only CredibilityConsistency | — | DELETE | core-rules §4 removes Consistency Score |
| components/politicians/ControversySection.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/CredibilityConsistency.tsx | Politician profile UI | DEAD — no importers | — | DELETE | Wave 2 schedules Consistency Score removal |
| components/politicians/DonorChart.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/EarlierRecordSection.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ExecutiveActions.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ExpandableEvidenceRow.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/PoliticianProfileClient.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ProfileNewsExplorer.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ProfileRecordByTopicPanel.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/ProfileSectionAccordion.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/PublicActionsAccordion.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/RelatedOfficialRecords.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/SaidDidPanel.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/StockTrades.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/VoteRow.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/politicians/VotingRecord.tsx | Politician profile UI | scan: 0 importers (verify) | — | MERGE | override |
| components/records/FloridaCountyEconomicContext.tsx | UI component | DEAD — no importers | — | DELETE | rg → definition only |
| components/records/FloridaRecordPanel.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/records/VoteviewIdeologyPanel.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/search/HomeSearchBar.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/search/SearchBar.tsx | UI component | DEAD — no importers; home uses HomeSearchBar | — | DELETE | rg import SearchBar → 0 |
| components/states/FloridaCourtDecisionRow.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/states/FloridaLegislationBillRow.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/states/FloridaStateDashboard.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/states/FloridaStatePoliticians.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/states/SampleBadge.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/ExpandableQuoteBlock.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/PoliticianAvatar.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/SourceBadge.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/SourceProvenance.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/SourceTierHelp.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/TierDot.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| components/ui/TrackButton.tsx | UI component | scan: 0 importers (verify) | — | MERGE | override |
| lib/data/allPoliticians.ts | Data accessor / transform | app/compare/page.tsx, app/congress/page.tsx, app/dashboard/page.tsx, app/finance/page.tsx, app/legislation/page.tsx | — | KEEP | importer scan |
| lib/data/billCitizenImpact.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| lib/data/branches.ts | Data accessor / transform | lib/data/allPoliticians.ts | — | KEEP | importer scan |
| lib/data/buildMapProps.ts | Data accessor / transform | app/page.tsx | — | KEEP | importer scan |
| lib/data/buildOrgVoteTopicLinks.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, lib/data/memberProfile.ts, scripts/lib/profileMigrate.ts | — | KEEP | importer scan |
| lib/data/buildSaidDidDiffs.ts | Data accessor / transform | app/politicians/[id]/page.tsx, lib/data/profileSnapshot.ts, scripts/__tests__/sourceIntegrity.test.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/audit-profile-credibility.ts | — | KEEP | importer scan |
| lib/data/buildTopicConsistencyTimeline.ts | Data accessor / transform | DEAD | — | DELETE | 0 external importers |
| lib/data/candidateIssues.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| lib/data/ceremonialCrecFilter.ts | Data accessor / transform | lib/data/issuesFromTopicPositions.ts, scripts/__tests__/ceremonialCrecFilter.test.ts | — | KEEP | importer scan |
| lib/data/congressClient.ts | Data accessor / transform | scripts/ingest/florida/ingest-congress-florida.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/congressVotes.ts | Data accessor / transform | app/dashboard/page.tsx, app/finance/FinanceContent.tsx, app/finance/page.tsx, app/politicians/[id]/page.tsx, app/politicians/page.tsx | — | KEEP | importer scan |
| lib/data/crecDisplayText.ts | Data accessor / transform | lib/data/issuesFromTopicPositions.ts, lib/data/profileSnapshot.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/lib/profileMigrate.ts, scripts/stamp-profile-display-text.ts | — | KEEP | importer scan |
| lib/data/derivePromiseStatus.ts | Data accessor / transform | scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| lib/data/diskCache.ts | Data accessor / transform | lib/data/congressClient.ts, lib/data/senateVotesClient.ts | — | KEEP | importer scan |
| lib/data/displaySummary.ts | Data accessor / transform | lib/data/issuesFromTopicPositions.ts, lib/data/memberProfile.ts, lib/data/profileSnapshot.ts, lib/data/topicPositions.ts, scripts/lib/profileReprocess.ts | — | KEEP | importer scan |
| lib/data/electionCompare.ts | Data accessor / transform | DEAD — CompareContent uses @/lib/electionCompare | — | DELETE | duplicate of root module |
| lib/data/executiveOfficials.ts | Data accessor / transform | lib/data/allPoliticians.ts | — | KEEP | importer scan |
| lib/data/executiveRoster.ts | Data accessor / transform | lib/data/officeResolution.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/fecClient.ts | Data accessor / transform | lib/data/__fixtures__/fecOrgJoin.fixture.ts, lib/data/fecOrgRegistry.ts, lib/data/fecScheduleA.ts, scripts/ingest/florida/ingest-fec-florida.ts, scripts/sync-fec-finance.ts | — | KEEP | importer scan |
| lib/data/fecFinance.ts | Data accessor / transform | app/compare/CompareContent.tsx, app/compare/page.tsx, app/dashboard/page.tsx, app/finance/FinanceContent.tsx, app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/fecOrgRegistry.ts | Data accessor / transform | lib/data/buildOrgVoteTopicLinks.ts, scripts/__tests__/fecOrgJoin.test.ts, scripts/sync-fec-schedule-a-pilot.ts | — | KEEP | importer scan |
| lib/data/fecScheduleA.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/finance/FollowTheMoneyPanel.tsx, components/politicians/PoliticianProfileClient.tsx, lib/data/buildOrgVoteTopicLinks.ts, lib/data/profileLatestRecord.ts | — | KEEP | importer scan |
| lib/data/floridaDashboard.ts | Data accessor / transform | app/states/[code]/page.tsx, components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| lib/data/generated/profiles/index.ts | Generated pipeline data | lib/data/memberProfile.ts, scripts/__tests__/migratedNotLightweight.test.ts | — | KEEP | importer scan |
| lib/data/generatedPoliticians.ts | Data accessor / transform | lib/data/allPoliticians.ts | — | KEEP | importer scan |
| lib/data/governorMapColors.ts | Data accessor / transform | lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/governors.ts | Data accessor / transform | lib/data/generatedPoliticians.ts, lib/data/governorMapColors.ts, lib/data/officeResolution.ts, scripts/__tests__/governorIdentityGuard.test.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/housePtrClient.ts | Data accessor / transform | scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| lib/data/htmlEntities.ts | Data accessor / transform | lib/data/sourceIntegrity.ts, lib/data/topicPositions.ts, scripts/lib/profileReprocess.ts, scripts/reprocess-profiles.ts, scripts/reprocess-topic-positions-bundle.ts | — | KEEP | importer scan |
| lib/data/issuesFromTopicPositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx, lib/data/profileSnapshot.ts, scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| lib/data/judicialOfficials.ts | Data accessor / transform | lib/data/allPoliticians.ts | — | KEEP | importer scan |
| lib/data/legislation.ts | Data accessor / transform | app/legislation/LegislationContent.tsx, app/legislation/page.tsx, lib/data/profileRecordByTopic.ts | — | KEEP | importer scan |
| lib/data/memberDeep.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx | — | KEEP | importer scan |
| lib/data/memberProfile.ts | Data accessor / transform | app/politicians/[id]/page.tsx, lib/data/congressVotes.ts, lib/data/fecFinance.ts, lib/data/profileSnapshot.ts, lib/data/topicPositions.ts | — | KEEP | importer scan |
| lib/data/nationalCongressVotes.ts | Data accessor / transform | scripts/__tests__/sourceIntegrity.test.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/lib/profileMigrate.ts, scripts/refresh-migrated-profile-votes.ts | — | KEEP | importer scan |
| lib/data/nationalFecFinance.ts | Data accessor / transform | scripts/lib/profileMigrate.ts, scripts/refresh-migrated-profile-votes.ts | — | KEEP | importer scan |
| lib/data/newsFeedRegistry.ts | Data accessor / transform | lib/data/sourceIntegrity.ts, scripts/__tests__/newsRegistry.test.ts, scripts/sync-news-rss.ts | — | KEEP | importer scan |
| lib/data/officeResolution.ts | Data accessor / transform | app/politicians/[id]/page.tsx, lib/data/allPoliticians.ts, lib/data/politicianSearchIndex.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/partyVoteBreakdown.ts | Data accessor / transform | lib/data/senateVotesClient.ts, scripts/ingest/florida/ingest-congress-florida.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/photos.ts | Data accessor / transform | lib/data/allPoliticians.ts, lib/data/executiveOfficials.ts, lib/data/generatedPoliticians.ts, scripts/__tests__/governorIdentityGuard.test.ts, scripts/__tests__/identityIntegrityGuard.test.ts | — | KEEP | importer scan |
| lib/data/politicianSearchIndex.ts | Data accessor / transform | app/page.tsx, app/politicians/page.tsx | — | KEEP | importer scan |
| lib/data/profileCategoryIntegrity.ts | Data accessor / transform | scripts/__tests__/profileCategoryIntegrity.test.ts, scripts/lib/profileManifestSync.ts | — | KEEP | importer scan |
| lib/data/profileLatestRecord.ts | Data accessor / transform | DEAD | — | DELETE | 0 importers |
| lib/data/profileRecordByTopic.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, lib/data/buildOrgVoteTopicLinks.ts, lib/data/buildSaidDidDiffs.ts | — | KEEP | importer scan |
| lib/data/profileSnapshot.ts | Data accessor / transform | scripts/__tests__/profileSnapshots.test.ts, scripts/profile-snapshot-update.ts | — | KEEP | importer scan |
| lib/data/profileVotesSufficiency.ts | Data accessor / transform | scripts/__tests__/sourceIntegrity.test.ts | — | KEEP | importer scan |
| lib/data/provenance.ts | Data accessor / transform | lib/data/floridaDashboard.ts, scripts/ingest/florida/ingest-florida-tax-burden.ts, scripts/lib/florida-dashboard-credibility.ts, scripts/lib/ingest-utils.ts | — | KEEP | importer scan |
| lib/data/recordJuxtapositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx | — | KEEP | importer scan |
| lib/data/reference-sources.ts | Data accessor / transform | DEAD — docs only | — | DELETE | 0 code importers |
| lib/data/resilientFetch.ts | Data accessor / transform | lib/data/congressClient.ts, lib/data/fecClient.ts, lib/data/housePtrClient.ts, lib/data/senatePtrClient.ts, lib/data/senateVotesClient.ts | — | KEEP | importer scan |
| lib/data/sanitizeProfileUiData.ts | Data accessor / transform | scripts/apply-crec-sync-to-profiles.ts, scripts/archive/fetch-batch1-news.ts, scripts/lib/profileMigrate.ts | — | KEEP | importer scan |
| lib/data/scotusRoster.ts | Data accessor / transform | lib/data/judicialOfficials.ts, lib/data/officeResolution.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/senatePtrClient.ts | Data accessor / transform | scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| lib/data/senateVotesClient.ts | Data accessor / transform | scripts/ingest/florida/ingest-congress-florida.ts, scripts/refresh-senate-cast-votes.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/slices/filingsSecedgar.ts | Data accessor / transform | app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/slices/financeFldoe.ts | Data accessor / transform | app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/slices/judiciaryCourts.ts | Data accessor / transform | app/states/[code]/page.tsx, lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/slices/legislationFlorida.ts | Data accessor / transform | app/legislation/page.tsx, app/states/[code]/page.tsx | — | KEEP | importer scan |
| lib/data/slices/lobbyingFllobbyist.ts | Data accessor / transform | app/lobbying/page.tsx | — | KEEP | importer scan |
| lib/data/slices/newsFlorida.ts | Data accessor / transform | app/politicians/[id]/page.tsx | — | KEEP | importer scan |
| lib/data/slices/stateEconomic.ts | Data accessor / transform | app/states/[code]/page.tsx, lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/slices/voteview.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| lib/data/snapshotTypes.ts | Data accessor / transform | lib/data/slices/filingsSecedgar.ts, lib/data/slices/financeFldoe.ts, lib/data/slices/judiciaryCourts.ts, lib/data/slices/legislationFlorida.ts, lib/data/slices/lobbyingFllobbyist.ts | — | KEEP | importer scan |
| lib/data/sourceCatalog.ts | Data accessor / transform | lib/data/reference-sources.ts | — | KEEP | importer scan |
| lib/data/sourceIntegrity.ts | Data accessor / transform | lib/data/buildSaidDidDiffs.ts, lib/data/issuesFromTopicPositions.ts, lib/data/profileSnapshot.ts, lib/data/sanitizeProfileUiData.ts, lib/data/topicPositions.ts | — | KEEP | importer scan |
| lib/data/sourceTiers.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| lib/data/stockTrades.ts | Data accessor / transform | app/congress/page.tsx, app/dashboard/page.tsx, app/politicians/[id]/page.tsx, app/politicians/page.tsx, app/states/[code]/page.tsx | — | KEEP | importer scan |
| lib/data/supportedStates.ts | Data accessor / transform | app/sitemap.ts, app/states/[code]/page.tsx, scripts/__tests__/sitemapGuard.test.ts | — | KEEP | importer scan |
| lib/data/topicAliases.ts | Data accessor / transform | lib/data/issuesFromTopicPositions.ts, lib/data/memberDeep.ts, lib/data/profileRecordByTopic.ts, lib/data/sourceIntegrity.ts, scripts/apply-crec-sync-to-profiles.ts | — | KEEP | importer scan |
| lib/data/topicCoverage.ts | Data accessor / transform | lib/data/issuesFromTopicPositions.ts, scripts/lib/articleVerificationCache.ts, scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| lib/data/topicPositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, lib/data/buildSaidDidDiffs.ts, lib/data/buildTopicConsistencyTimeline.ts | — | KEEP | importer scan |
| lib/data/trustedSources.ts | Data accessor / transform | scripts/sync-legislation.ts | — | KEEP | importer scan |
| lib/data/voteDisplay.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| lib/data/voteDonorConnections.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| lib/data/zipLookup.ts | Data accessor / transform | DEAD shim — 0 lib/data path consumers | — | DELETE | override |
| scripts/__tests__/blsMetroCpiYoy.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/ceremonialCrecFilter.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/classifyTopic.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/clientBundleGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/copyCompliance.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/courtListenerSummary.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/crecProceduralFilter.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/dataLayoutGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/deadRouteLinkGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/docsConsistencyGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/docsIntegrityGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/envTruthGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/fecOrgJoin.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/floridaIngestPreserve.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/governorIdentityGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/identityIntegrityGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/mericPeriodDisplay.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/migratedNotLightweight.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/newsRegistry.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/optimizationGuards.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/profileCategoryIntegrity.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/profileCredibilityAudit.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/profileMigratePreserve.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/profileSnapshots.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/renderIntegrityGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/sitemapGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/sourceIntegrity.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/stateEconomicDisplay.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/stockTradesCheckpoint.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/syncKernelGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/topicPositionsBundle.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/topicPositionsPreserve.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/__tests__/unverifiedOfficialDataGuard.test.ts | Build-gated guard test | prebuild test: guard wired in package.json | — | KEEP | importer scan |
| scripts/agent-demo-check.ts | Source module | package.json: agent:demo | — | KEEP | importer scan |
| scripts/agent-preflight.ts | Source module | package.json: agent:preflight | — | KEEP | importer scan |
| scripts/agent-verify.ts | Source module | package.json: agent:verify | — | KEEP | importer scan |
| scripts/apply-crec-sync-to-profiles.ts | National sync script | scan: 0 importers (verify) | — | MERGE | override |
| scripts/archive/benchmark-ingest-sample.ts | Archived one-off script | archived — no npm script | — | KEEP | importer scan |
| scripts/archive/fetch-batch1-news.ts | Archived one-off script | archived — no npm script | — | KEEP | importer scan |
| scripts/archive/migrate-gold-profiles-batch1.ts | Archived one-off script | archived — no npm script | — | KEEP | importer scan |
| scripts/archive/migrate-s000033-profile.ts | Archived one-off script | archived — no npm script | — | KEEP | importer scan |
| scripts/archive/test-cosponsor-pipeline.ts | Archived one-off script | archived — no npm script | — | KEEP | importer scan |
| scripts/audit-file-layer.ts | Source module | package.json: audit:layer | — | KEEP | importer scan |
| scripts/audit-overreject.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/audit-profile-credibility.ts | Source module | scripts/__tests__/profileCredibilityAudit.test.ts | — | KEEP | importer scan |
| scripts/build-data-slices.ts | Source module | package.json: build:data-slices | — | KEEP | importer scan |
| scripts/build-sources-index.ts | Source module | package.json: build:sources-index | — | KEEP | importer scan |
| scripts/compare-topic-batch.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/generate-file-inventory-audit.ts | Source module | package.json: audit:inventory-md | — | KEEP | importer scan |
| scripts/generate-file-inventory.ts | Source module | package.json: audit:inventory | — | KEEP | importer scan |
| scripts/generate-profile-index.ts | Source module | package.json: generate:profile-index | — | KEEP | importer scan |
| scripts/generate-roster.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/ingest-member-deep.ts | Source module | scripts/archive/benchmark-ingest-sample.ts, scripts/archive/test-cosponsor-pipeline.ts | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bea-rpp-florida.ts | Florida/data ingest script | package.json: ingest:bea-rpp-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-cpi-florida.ts | Florida/data ingest script | package.json: ingest:bls-cpi-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-education-florida.ts | Florida/data ingest script | package.json: ingest:bls-education-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-employment-growth-florida.ts | Florida/data ingest script | package.json: ingest:bls-growth-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-florida.ts | Florida/data ingest script | package.json: ingest:bls-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-metro-cpi-florida.ts | Florida/data ingest script | package.json: ingest:bls-metro-cpi-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-national-benchmarks-florida.ts | Florida/data ingest script | package.json: ingest:bls-benchmarks-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-occupations-florida.ts | Florida/data ingest script | package.json: ingest:bls-occupations-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-census-florida.ts | Florida/data ingest script | package.json: ingest:census-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-civic-florida.ts | Florida/data ingest script | package.json: ingest:civic-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-congress-florida.ts | Florida/data ingest script | package.json: ingest:congress-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-courtlistener-florida.ts | Florida/data ingest script | package.json: ingest:courts-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fara-florida.ts | Florida/data ingest script | package.json: ingest:fara-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fec-florida.ts | Florida/data ingest script | package.json: ingest:fec-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fedregister-florida.ts | Florida/data ingest script | package.json: ingest:fedregister-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fldoe-finance-florida.ts | Florida/data ingest script | package.json: ingest:fldoe-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fllobbyist-florida.ts | Florida/data ingest script | package.json: ingest:fllobbyist-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-counties.ts | Florida/data ingest script | package.json: ingest:fl-counties | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-state-rankings.ts | Florida/data ingest script | package.json: ingest:fl-state-rankings | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-tax-burden.ts | Florida/data ingest script | package.json: ingest:fl-tax | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-gdelt-florida.ts | Florida/data ingest script | package.json: ingest:gdelt-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-govinfo-florida.ts | Florida/data ingest script | package.json: ingest:govinfo-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-govtrack-florida.ts | Florida/data ingest script | package.json: ingest:govtrack-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-legiscan-florida.ts | Florida/data ingest script | package.json: ingest:legiscan-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-lobbying-florida.ts | Florida/data ingest script | package.json: ingest:lobbying-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-meric-col-florida.ts | Florida/data ingest script | package.json: ingest:meric-col-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-news-florida.ts | Florida/data ingest script | package.json: ingest:news-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-openstates-florida.ts | Florida/data ingest script | package.json: ingest:openstates-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-sam-florida.ts | Florida/data ingest script | package.json: ingest:sam-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-secedgar-florida.ts | Florida/data ingest script | package.json: ingest:secedgar-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-usaspending-florida.ts | Florida/data ingest script | package.json: ingest:usaspending-fl | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-voteview-florida.ts | Florida/data ingest script | package.json: ingest:voteview-fl | — | KEEP | importer scan |
| scripts/lib/approvedMediaQuotes.ts | Pipeline shared library | scripts/report-pilot-coverage.ts, scripts/sync-topic-positions.ts | — | KEEP | importer scan |
| scripts/lib/articleVerificationCache.ts | Pipeline shared library | scripts/lib/approvedMediaQuotes.ts, scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| scripts/lib/bls-api.ts | Pipeline shared library | scripts/__tests__/blsMetroCpiYoy.test.ts, scripts/ingest/florida/ingest-bls-cpi-florida.ts, scripts/ingest/florida/ingest-bls-education-florida.ts, scripts/ingest/florida/ingest-bls-employment-growth-florida.ts, scripts/ingest/florida/ingest-bls-metro-cpi-florida.ts | — | KEEP | importer scan |
| scripts/lib/census-attainment.ts | Pipeline shared library | scripts/ingest/florida/ingest-florida-counties.ts, scripts/ingest/florida/ingest-florida-state-rankings.ts | — | KEEP | importer scan |
| scripts/lib/courtListenerDetail.ts | Pipeline shared library | scripts/ingest/florida/ingest-courtlistener-florida.ts, scripts/lib/courtListenerSummary.ts | — | KEEP | importer scan |
| scripts/lib/courtListenerSummary.ts | Pipeline shared library | scripts/__tests__/courtListenerSummary.test.ts, scripts/ingest/florida/ingest-courtlistener-florida.ts | — | KEEP | importer scan |
| scripts/lib/crecOpener.ts | Pipeline shared library | scripts/__tests__/crecProceduralFilter.test.ts, scripts/audit-overreject.ts, scripts/sync-topic-positions.ts | — | KEEP | importer scan |
| scripts/lib/crecProceduralFilter.ts | Pipeline shared library | scripts/__tests__/crecProceduralFilter.test.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/audit-overreject.ts, scripts/audit-profile-credibility.ts, scripts/lib/profileMigrate.ts | — | KEEP | importer scan |
| scripts/lib/dataPaths.ts | Pipeline shared library | scripts/sync-fec-national.ts, scripts/sync-fec-schedule-a-pilot.ts, scripts/sync-fec-schedule-a.ts, scripts/sync-topic-positions.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| scripts/lib/florida-dashboard-credibility.ts | Pipeline shared library | scripts/__tests__/unverifiedOfficialDataGuard.test.ts | — | KEEP | importer scan |
| scripts/lib/ingest-utils.ts | Pipeline shared library | scripts/__tests__/floridaIngestPreserve.test.ts, scripts/archive/benchmark-ingest-sample.ts, scripts/archive/test-cosponsor-pipeline.ts, scripts/ingest-member-deep.ts, scripts/ingest/florida/ingest-bea-rpp-florida.ts | — | KEEP | importer scan |
| scripts/lib/irs-federal-tax.ts | Pipeline shared library | scripts/ingest/florida/ingest-florida-tax-burden.ts | — | KEEP | importer scan |
| scripts/lib/profileDisplayIdentity.ts | Pipeline shared library | scripts/__tests__/optimizationGuards.test.ts, scripts/audit-profile-credibility.ts, scripts/generate-profile-index.ts | — | KEEP | importer scan |
| scripts/lib/profileManifestSync.ts | Pipeline shared library | scripts/lib/profileMigrate.ts, scripts/lib/profileReprocess.ts, scripts/sync-profile-manifest.ts | — | KEEP | importer scan |
| scripts/lib/profileMigrate.ts | Pipeline shared library | scripts/__tests__/profileMigratePreserve.test.ts, scripts/profile-build.ts | — | KEEP | importer scan |
| scripts/lib/profileReprocess.ts | Pipeline shared library | scripts/profile-build.ts, scripts/reprocess-profiles.ts | — | KEEP | importer scan |
| scripts/lib/resilientFetch.ts | Pipeline shared library | scripts/sync-fec-national.ts, scripts/sync-stock-trades.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| scripts/lib/sync-scope.ts | Pipeline shared library | scripts/sync-fec-national.ts, scripts/sync-news-national.ts | — | KEEP | importer scan |
| scripts/lib/syncKernel.ts | Pipeline shared library | scripts/lib/resilientFetch.ts, scripts/sync-fec-national.ts, scripts/sync-legislation.ts, scripts/sync-news-national.ts, scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| scripts/lib/syncLock.ts | Pipeline shared library | scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| scripts/lib/tax-foundation-state-tax.ts | Pipeline shared library | scripts/ingest/florida/ingest-florida-tax-burden.ts | — | KEEP | importer scan |
| scripts/lib/topicPositionsPreserve.ts | Pipeline shared library | scripts/__tests__/topicPositionsPreserve.test.ts, scripts/sync-topic-positions.ts | — | KEEP | importer scan |
| scripts/profile-build.ts | Source module | package.json: profile:build | — | KEEP | importer scan |
| scripts/profile-snapshot-update.ts | Source module | package.json: snapshot:update | — | KEEP | importer scan |
| scripts/refresh-migrated-profile-votes.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/refresh-senate-cast-votes.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/render-integrity-check.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/report-data-gaps.ts | Source module | package.json: report:gaps | — | KEEP | importer scan |
| scripts/report-pilot-coverage.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/reprocess-profiles.ts | Source module | package.json: reprocess:profiles | — | KEEP | importer scan |
| scripts/reprocess-topic-positions-bundle.ts | Source module | package.json: reprocess:topic-positions-bundle | — | KEEP | importer scan |
| scripts/stamp-profile-display-text.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/sync-congress-votes.ts | National sync script | package.json: sync:votes | — | KEEP | importer scan |
| scripts/sync-fec-finance.ts | National sync script | package.json: sync:fec | — | KEEP | importer scan |
| scripts/sync-fec-national.ts | National sync script | package.json: sync:fec-national | — | KEEP | importer scan |
| scripts/sync-fec-schedule-a-pilot.ts | National sync script | package.json: sync:fec-schedule-a-pilot | — | KEEP | importer scan |
| scripts/sync-fec-schedule-a.ts | National sync script | package.json: sync:fec-schedule-a | — | KEEP | importer scan |
| scripts/sync-legislation.ts | National sync script | package.json: sync:legislation | — | KEEP | importer scan |
| scripts/sync-legislators.ts | National sync script | package.json: sync:legislators | — | KEEP | importer scan |
| scripts/sync-news-national.ts | National sync script | package.json: sync:news-national | — | KEEP | importer scan |
| scripts/sync-news-rss.ts | National sync script | scripts/__tests__/newsRegistry.test.ts | — | KEEP | importer scan |
| scripts/sync-profile-manifest.ts | National sync script | package.json: sync:profile-manifest | — | KEEP | importer scan |
| scripts/sync-profile-news.ts | National sync script | package.json npm script entrypoint (unverified) | — | KEEP | importer scan |
| scripts/sync-stock-trades.ts | National sync script | package.json: sync:stock-trades | — | KEEP | importer scan |
| scripts/sync-topic-positions.ts | National sync script | package.json: sync:topic-positions | — | KEEP | importer scan |
| scripts/sync-votes-national.ts | National sync script | package.json: sync:votes-national | — | KEEP | importer scan |
| scripts/verify-agent-keys.ts | Source module | package.json: verify:agent-keys | — | KEEP | importer scan |
| scripts/verify-lobbying-votes.ts | Source module | package.json: verify:lobbying-votes | — | KEEP | importer scan |
| scripts/verify-office-resolution.ts | Source module | package.json: verify:office | — | KEEP | importer scan |
| scripts/verify-phase17b-batch.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |

Total rows: 274

