# File inventory audit — utilization · quality · necessity · accuracy (W4)

**Generated:** 2026-07-19T12:09:03Z · **Baseline:** data/reports/file-inventory.json (210 files)
**Type:** FINDINGS ONLY — no deletions until Claude briefs.

## W3c accuracy finding

PILOT_PROFILE_CHECKLIST rows 5–6 claimed **done**; S000033 manifest has honest-gap for both. Checklist corrected; guard freezes status.

## Full file table

| Path | Purpose | Used-by | Claimed vs reality | Verdict | Evidence |
|------|---------|---------|-------------------|---------|----------|
| app/compare/CompareContent.tsx | App route or layout | app/compare/page.tsx | — | KEEP | importer scan |
| app/compare/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/congress/CongressContent.tsx | App route or layout | app/congress/page.tsx | — | KEEP | importer scan |
| app/congress/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/counties/[fips]/page.tsx | App route or layout | DEAD-PATH — no in-app links reach it | Honest-gap shell only; county data never wired | FIX | USAMap county literals empty |
| app/dashboard/DashboardContent.tsx | App route or layout | app/dashboard/page.tsx | — | KEEP | importer scan |
| app/dashboard/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/elections/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/finance/FinanceContent.tsx | App route or layout | app/finance/page.tsx | — | KEEP | importer scan |
| app/finance/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/layout.tsx | App route or layout | scan: 0 importers (verify) | — | MERGE | override |
| app/legislation/LegislationContent.tsx | App route or layout | app/legislation/page.tsx | — | KEEP | importer scan |
| app/legislation/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/lobbying/[id]/page.tsx | App route or layout | DEAD — notFound()-only; no inbound links | — | DELETE | rg /lobbying/ dynamic links → 0 |
| app/lobbying/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/officials/[id]/page.tsx | App route or layout | DEAD — notFound()-only stub | — | DELETE | PR #43 deletes route |
| app/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/politicians/PoliticiansContent.tsx | App route or layout | app/politicians/page.tsx | — | KEEP | importer scan |
| app/politicians/[id]/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/politicians/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/sitemap.ts | App route or layout | Next.js /sitemap.xml | Was 1-URL stub on main; full rebuild in PR #43 | FIX | 613 entries after W3b |
| app/sources/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| app/states/[code]/page.tsx | App route or layout | Next.js route entry | — | KEEP | importer scan |
| components/counties/OfficialCard.tsx | UI component | USAMap.tsx (import only — runtime DEAD) | Linked to /officials/[id] 404 on main; fixed in PR #43 | FIX | countyByFips never populated; W3a repoints links |
| components/dashboard/StateRosterControls.tsx | UI component | app/dashboard/DashboardContent.tsx, app/politicians/PoliticiansContent.tsx, components/states/FloridaStatePoliticians.tsx | — | KEEP | importer scan |
| components/elections/CandidateTopicAccordion.tsx | UI component | DEAD — no importers | — | DELETE | elections page is static empty-state |
| components/finance/FollowTheMoneyPanel.tsx | UI component | app/finance/FinanceContent.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/layout/Footer.tsx | UI component | app/layout.tsx | — | KEEP | importer scan |
| components/layout/Navigation.tsx | UI component | app/layout.tsx | — | KEEP | importer scan |
| components/map/MapExplorer.tsx | UI component | app/page.tsx | — | KEEP | importer scan |
| components/map/USAMap.tsx | UI component | components/map/MapExplorer.tsx | — | KEEP | importer scan |
| components/politicians/ConsistencyScore.tsx | Politician profile UI | DEAD — only CredibilityConsistency | — | DELETE | core-rules §4 removes Consistency Score |
| components/politicians/ControversySection.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/CredibilityConsistency.tsx | Politician profile UI | DEAD — no importers | — | DELETE | Wave 2 schedules Consistency Score removal |
| components/politicians/DonorChart.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/EarlierRecordSection.tsx | Politician profile UI | components/politicians/CredibilityConsistency.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/ExecutiveActions.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/ExpandableEvidenceRow.tsx | Politician profile UI | components/elections/CandidateTopicAccordion.tsx, components/politicians/CredibilityConsistency.tsx, components/politicians/EarlierRecordSection.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/PoliticianProfileClient.tsx | Politician profile UI | app/politicians/[id]/page.tsx | — | KEEP | importer scan |
| components/politicians/ProfileNewsExplorer.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/ProfileRecordByTopicPanel.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/ProfileSectionAccordion.tsx | Politician profile UI | components/politicians/ConsistencyScore.tsx, components/politicians/PublicActionsAccordion.tsx, components/politicians/RelatedOfficialRecords.tsx | — | KEEP | importer scan |
| components/politicians/PublicActionsAccordion.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/RelatedOfficialRecords.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/SaidDidPanel.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/StockTrades.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/politicians/VoteRow.tsx | Politician profile UI | components/politicians/PublicActionsAccordion.tsx, components/politicians/VotingRecord.tsx | — | KEEP | importer scan |
| components/politicians/VotingRecord.tsx | Politician profile UI | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/records/FloridaCountyEconomicContext.tsx | UI component | DEAD — no importers | — | DELETE | rg → definition only |
| components/records/FloridaRecordPanel.tsx | UI component | app/finance/FinanceContent.tsx, app/legislation/LegislationContent.tsx, app/lobbying/page.tsx, components/map/USAMap.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/records/VoteviewIdeologyPanel.tsx | UI component | components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| components/search/HomeSearchBar.tsx | UI component | app/page.tsx | — | KEEP | importer scan |
| components/search/SearchBar.tsx | UI component | DEAD — no importers; home uses HomeSearchBar | — | DELETE | rg import SearchBar → 0 |
| components/states/FloridaCourtDecisionRow.tsx | UI component | components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| components/states/FloridaLegislationBillRow.tsx | UI component | components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| components/states/FloridaStateDashboard.tsx | UI component | app/states/[code]/page.tsx | — | KEEP | importer scan |
| components/states/FloridaStatePoliticians.tsx | UI component | components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| components/states/SampleBadge.tsx | UI component | components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| components/ui/ExpandableQuoteBlock.tsx | UI component | components/politicians/ProfileRecordByTopicPanel.tsx, components/politicians/SaidDidPanel.tsx | — | KEEP | importer scan |
| components/ui/PoliticianAvatar.tsx | UI component | app/compare/CompareContent.tsx, app/dashboard/DashboardContent.tsx, app/finance/FinanceContent.tsx, app/politicians/PoliticiansContent.tsx, components/map/USAMap.tsx | — | KEEP | importer scan |
| components/ui/SourceBadge.tsx | UI component | app/compare/CompareContent.tsx, app/finance/FinanceContent.tsx, app/legislation/LegislationContent.tsx, app/sources/page.tsx, components/politicians/ControversySection.tsx | — | KEEP | importer scan |
| components/ui/SourceProvenance.tsx | UI component | app/legislation/LegislationContent.tsx, components/elections/CandidateTopicAccordion.tsx, components/finance/FollowTheMoneyPanel.tsx, components/politicians/ConsistencyScore.tsx, components/politicians/CredibilityConsistency.tsx | — | KEEP | importer scan |
| components/ui/SourceTierHelp.tsx | UI component | components/politicians/PoliticianProfileClient.tsx, components/politicians/StockTrades.tsx, components/politicians/VotingRecord.tsx, components/ui/SourceBadge.tsx, components/ui/TierDot.tsx | — | KEEP | importer scan |
| components/ui/TierDot.tsx | UI component | components/politicians/DonorChart.tsx, components/politicians/PoliticianProfileClient.tsx, components/records/FloridaRecordPanel.tsx, components/states/FloridaCourtDecisionRow.tsx, components/states/FloridaLegislationBillRow.tsx | — | KEEP | importer scan |
| components/ui/TrackButton.tsx | UI component | app/dashboard/DashboardContent.tsx, components/politicians/PoliticianProfileClient.tsx | — | KEEP | importer scan |
| lib/data/allPoliticians.ts | Data accessor / transform | app/compare/page.tsx, app/congress/page.tsx, app/dashboard/page.tsx, app/finance/page.tsx, app/legislation/page.tsx | — | KEEP | importer scan |
| lib/data/billCitizenImpact.ts | Data accessor / transform | components/politicians/ProfileRecordByTopicPanel.tsx | — | KEEP | importer scan |
| lib/data/branches.ts | Data accessor / transform | lib/dashboard/rosterSearchParams.ts, lib/dashboard/stateRosterClient.ts | — | KEEP | importer scan |
| lib/data/buildMapProps.ts | Data accessor / transform | app/page.tsx | — | KEEP | importer scan |
| lib/data/buildOrgVoteTopicLinks.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, scripts/archive/migrate-gold-profiles-batch1.ts, scripts/archive/migrate-s000033-profile.ts | — | KEEP | importer scan |
| lib/data/buildSaidDidDiffs.ts | Data accessor / transform | app/politicians/[id]/page.tsx, scripts/__tests__/sourceIntegrity.test.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/archive/migrate-gold-profiles-batch1.ts, scripts/audit-profile-credibility.ts | — | KEEP | importer scan |
| lib/data/buildTopicConsistencyTimeline.ts | Data accessor / transform | DEAD | — | DELETE | 0 external importers |
| lib/data/candidateIssues.ts | Data accessor / transform | components/elections/CandidateTopicAccordion.tsx | — | KEEP | importer scan |
| lib/data/ceremonialCrecFilter.ts | Data accessor / transform | components/politicians/ProfileRecordByTopicPanel.tsx, scripts/__tests__/ceremonialCrecFilter.test.ts | — | KEEP | importer scan |
| lib/data/congressClient.ts | Data accessor / transform | scripts/ingest/florida/ingest-congress-florida.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/congressVotes.ts | Data accessor / transform | app/dashboard/page.tsx, app/finance/FinanceContent.tsx, app/finance/page.tsx, app/politicians/[id]/page.tsx, app/politicians/page.tsx | — | KEEP | importer scan |
| lib/data/crecDisplayText.ts | Data accessor / transform | components/politicians/ProfileRecordByTopicPanel.tsx, components/politicians/SaidDidPanel.tsx, scripts/apply-crec-sync-to-profiles.ts, scripts/lib/profileMigrate.ts, scripts/stamp-profile-display-text.ts | — | KEEP | importer scan |
| lib/data/derivePromiseStatus.ts | Data accessor / transform | scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| lib/data/diskCache.ts | Data accessor / transform | scan: 0 importers (verify) | — | MERGE | override |
| lib/data/displaySummary.ts | Data accessor / transform | components/politicians/DonorChart.tsx, components/politicians/ExpandableEvidenceRow.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, components/politicians/SaidDidPanel.tsx | — | KEEP | importer scan |
| lib/data/electionCompare.ts | Data accessor / transform | DEAD — CompareContent uses @/lib/electionCompare | — | DELETE | duplicate of root module |
| lib/data/executiveOfficials.ts | Data accessor / transform | scan: 0 importers (verify) | — | MERGE | override |
| lib/data/executiveRoster.ts | Data accessor / transform | scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/fecClient.ts | Data accessor / transform | scripts/ingest/florida/ingest-fec-florida.ts, scripts/sync-fec-finance.ts, scripts/sync-fec-national.ts, scripts/sync-fec-schedule-a-pilot.ts, scripts/sync-fec-schedule-a.ts | — | KEEP | importer scan |
| lib/data/fecFinance.ts | Data accessor / transform | app/compare/CompareContent.tsx, app/compare/page.tsx, app/dashboard/page.tsx, app/finance/FinanceContent.tsx, app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/fecOrgRegistry.ts | Data accessor / transform | scripts/__tests__/fecOrgJoin.test.ts, scripts/sync-fec-schedule-a-pilot.ts | — | KEEP | importer scan |
| lib/data/fecScheduleA.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/finance/FollowTheMoneyPanel.tsx, components/politicians/PoliticianProfileClient.tsx, scripts/archive/migrate-gold-profiles-batch1.ts, scripts/archive/migrate-s000033-profile.ts | — | KEEP | importer scan |
| lib/data/floridaDashboard.ts | Data accessor / transform | app/states/[code]/page.tsx, components/states/FloridaStateDashboard.tsx | — | KEEP | importer scan |
| lib/data/generated/profiles/index.ts | Generated pipeline data | lib/data/trustedSources.ts, scripts/__tests__/migratedNotLightweight.test.ts | — | KEEP | importer scan |
| lib/data/generatedPoliticians.ts | Data accessor / transform | scan: 0 importers (verify) | — | MERGE | override |
| lib/data/governorMapColors.ts | Data accessor / transform | lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/governors.ts | Data accessor / transform | lib/data/sourceCatalog.ts, scripts/__tests__/governorIdentityGuard.test.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/housePtrClient.ts | Data accessor / transform | scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| lib/data/htmlEntities.ts | Data accessor / transform | lib/displaySummary.ts, scripts/lib/profileReprocess.ts, scripts/reprocess-profiles.ts, scripts/reprocess-topic-positions-bundle.ts, scripts/sync-news-rss.ts | — | KEEP | importer scan |
| lib/data/issuesFromTopicPositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx, scripts/report-pilot-coverage.ts | — | KEEP | importer scan |
| lib/data/judicialOfficials.ts | Data accessor / transform | scan: 0 importers (verify) | — | MERGE | override |
| lib/data/legislation.ts | Data accessor / transform | app/legislation/LegislationContent.tsx, app/legislation/page.tsx, app/states/[code]/page.tsx, components/layout/Navigation.tsx | — | KEEP | importer scan |
| lib/data/memberDeep.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx | — | KEEP | importer scan |
| lib/data/memberProfile.ts | Data accessor / transform | app/politicians/[id]/page.tsx, scripts/__tests__/migratedNotLightweight.test.ts, scripts/__tests__/optimizationGuards.test.ts, scripts/__tests__/sourceIntegrity.test.ts, scripts/refresh-migrated-profile-votes.ts | — | KEEP | importer scan |
| lib/data/nationalCongressVotes.ts | Data accessor / transform | scripts/__tests__/sourceIntegrity.test.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/archive/migrate-gold-profiles-batch1.ts, scripts/lib/profileMigrate.ts, scripts/refresh-migrated-profile-votes.ts | — | KEEP | importer scan |
| lib/data/nationalFecFinance.ts | Data accessor / transform | scripts/archive/migrate-gold-profiles-batch1.ts, scripts/lib/profileMigrate.ts, scripts/refresh-migrated-profile-votes.ts | — | KEEP | importer scan |
| lib/data/newsFeedRegistry.ts | Data accessor / transform | scripts/__tests__/newsRegistry.test.ts, scripts/sync-news-rss.ts | — | KEEP | importer scan |
| lib/data/officeResolution.ts | Data accessor / transform | app/politicians/[id]/page.tsx, lib/data/politicianSearchIndex.ts, scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/partyVoteBreakdown.ts | Data accessor / transform | scripts/ingest/florida/ingest-congress-florida.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/photos.ts | Data accessor / transform | lib/data/sourceCatalog.ts, scripts/__tests__/governorIdentityGuard.test.ts, scripts/__tests__/identityIntegrityGuard.test.ts | — | KEEP | importer scan |
| lib/data/politicianSearchIndex.ts | Data accessor / transform | app/page.tsx, app/politicians/page.tsx, components/search/HomeSearchBar.tsx, components/search/SearchBar.tsx | — | KEEP | importer scan |
| lib/data/profileCategoryIntegrity.ts | Data accessor / transform | scripts/__tests__/profileCategoryIntegrity.test.ts, scripts/lib/profileManifestSync.ts | — | KEEP | importer scan |
| lib/data/profileLatestRecord.ts | Data accessor / transform | DEAD | — | DELETE | 0 importers |
| lib/data/profileRecordByTopic.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, scripts/__tests__/classifyTopic.test.ts, scripts/apply-crec-sync-to-profiles.ts | — | KEEP | importer scan |
| lib/data/profileSnapshot.ts | Data accessor / transform | scripts/__tests__/profileSnapshots.test.ts, scripts/profile-snapshot-update.ts | — | KEEP | importer scan |
| lib/data/profileVotesSufficiency.ts | Data accessor / transform | scripts/__tests__/sourceIntegrity.test.ts | — | KEEP | importer scan |
| lib/data/provenance.ts | Data accessor / transform | scripts/ingest/florida/ingest-florida-tax-burden.ts, scripts/lib/florida-dashboard-credibility.ts, scripts/lib/ingest-utils.ts | — | KEEP | importer scan |
| lib/data/recordJuxtapositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx | — | KEEP | importer scan |
| lib/data/reference-sources.ts | Data accessor / transform | DEAD — docs only | — | DELETE | 0 code importers |
| lib/data/resilientFetch.ts | Data accessor / transform | scripts/__tests__/optimizationGuards.test.ts, scripts/lib/resilientFetch.ts, scripts/sync-news-rss.ts | — | KEEP | importer scan |
| lib/data/sanitizeProfileUiData.ts | Data accessor / transform | scripts/apply-crec-sync-to-profiles.ts, scripts/archive/fetch-batch1-news.ts, scripts/archive/migrate-gold-profiles-batch1.ts, scripts/lib/profileMigrate.ts | — | KEEP | importer scan |
| lib/data/scotusRoster.ts | Data accessor / transform | scripts/verify-office-resolution.ts | — | KEEP | importer scan |
| lib/data/senatePtrClient.ts | Data accessor / transform | scripts/sync-stock-trades.ts | — | KEEP | importer scan |
| lib/data/senateVotesClient.ts | Data accessor / transform | scripts/ingest/florida/ingest-congress-florida.ts, scripts/refresh-senate-cast-votes.ts, scripts/sync-congress-votes.ts, scripts/sync-votes-national.ts | — | KEEP | importer scan |
| lib/data/slices/filingsSecedgar.ts | Data accessor / transform | app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/slices/financeFldoe.ts | Data accessor / transform | app/finance/page.tsx | — | KEEP | importer scan |
| lib/data/slices/judiciaryCourts.ts | Data accessor / transform | app/states/[code]/page.tsx, lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/slices/legislationFlorida.ts | Data accessor / transform | app/legislation/page.tsx, app/states/[code]/page.tsx | — | KEEP | importer scan |
| lib/data/slices/lobbyingFllobbyist.ts | Data accessor / transform | app/lobbying/page.tsx | — | KEEP | importer scan |
| lib/data/slices/newsFlorida.ts | Data accessor / transform | app/politicians/[id]/page.tsx | — | KEEP | importer scan |
| lib/data/slices/stateEconomic.ts | Data accessor / transform | app/states/[code]/page.tsx, components/records/FloridaRecordPanel.tsx, components/states/FloridaStateDashboard.tsx, lib/data/buildMapProps.ts | — | KEEP | importer scan |
| lib/data/slices/voteview.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, lib/data/sourceCatalog.ts | — | KEEP | importer scan |
| lib/data/snapshotTypes.ts | Data accessor / transform | app/finance/FinanceContent.tsx, app/legislation/LegislationContent.tsx, components/map/USAMap.tsx, components/politicians/PoliticianProfileClient.tsx, components/records/FloridaCountyEconomicContext.tsx | — | KEEP | importer scan |
| lib/data/sourceCatalog.ts | Data accessor / transform | lib/data/SOURCE_LOOKUP.md, lib/data/reference-sources.ts | — | KEEP | importer scan |
| lib/data/sourceIntegrity.ts | Data accessor / transform | lib/data/README.md, scripts/__tests__/sourceIntegrity.test.ts, scripts/__tests__/topicPositionsBundle.test.ts, scripts/audit-profile-credibility.ts, scripts/lib/profileMigrate.ts | — | KEEP | importer scan |
| lib/data/sourceTiers.ts | Data accessor / transform | components/politicians/ProfileNewsExplorer.tsx, components/ui/SourceBadge.tsx, components/ui/SourceProvenance.tsx, components/ui/SourceTierHelp.tsx | — | KEEP | importer scan |
| lib/data/stockTrades.ts | Data accessor / transform | app/congress/page.tsx, app/dashboard/page.tsx, app/politicians/[id]/page.tsx, app/politicians/page.tsx, app/states/[code]/page.tsx | — | KEEP | importer scan |
| lib/data/topicAliases.ts | Data accessor / transform | components/politicians/ProfileRecordByTopicPanel.tsx, lib/recordTopicBuckets.ts, scripts/apply-crec-sync-to-profiles.ts, scripts/sync-topic-positions.ts | — | KEEP | importer scan |
| lib/data/topicCoverage.ts | Data accessor / transform | components/elections/CandidateTopicAccordion.tsx, components/politicians/CredibilityConsistency.tsx, components/politicians/PoliticianProfileClient.tsx, lib/candidateIssues.ts, lib/data/SOURCE_LOOKUP.md | — | KEEP | importer scan |
| lib/data/topicPositions.ts | Data accessor / transform | app/politicians/[id]/page.tsx, components/politicians/PoliticianProfileClient.tsx, components/politicians/ProfileRecordByTopicPanel.tsx, scripts/__tests__/profileMigratePreserve.test.ts, scripts/__tests__/topicPositionsPreserve.test.ts | — | KEEP | importer scan |
| lib/data/trustedSources.ts | Data accessor / transform | scripts/sync-legislation.ts | — | KEEP | importer scan |
| lib/data/voteDisplay.ts | Data accessor / transform | components/politicians/RelatedOfficialRecords.tsx, components/politicians/VoteRow.tsx | — | KEEP | importer scan |
| lib/data/voteDonorConnections.ts | Data accessor / transform | components/politicians/VoteRow.tsx | — | KEEP | importer scan |
| lib/data/zipLookup.ts | Data accessor / transform | app/dashboard/DashboardContent.tsx, components/search/HomeSearchBar.tsx | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bea-rpp-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-cpi-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-education-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-employment-growth-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-metro-cpi-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-national-benchmarks-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-bls-occupations-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-census-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-civic-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-congress-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-courtlistener-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fara-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fec-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fedregister-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fldoe-finance-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-fllobbyist-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-counties.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-state-rankings.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-florida-tax-burden.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-gdelt-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-govinfo-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-govtrack-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-legiscan-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-lobbying-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-meric-col-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-news-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-openstates-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-sam-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-secedgar-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-usaspending-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/ingest/florida/ingest-voteview-florida.ts | Florida/data ingest script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/lib/approvedMediaQuotes.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/articleVerificationCache.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/bls-api.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/census-attainment.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/courtListenerDetail.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/courtListenerSummary.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/crecOpener.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/crecProceduralFilter.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/dataPaths.ts | Pipeline shared library | scripts/agent-preflight.ts | — | KEEP | importer scan |
| scripts/lib/florida-dashboard-credibility.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/ingest-utils.ts | Pipeline shared library | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/lib/irs-federal-tax.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/profileDisplayIdentity.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/profileManifestSync.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/profileMigrate.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/profileReprocess.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/resilientFetch.ts | Pipeline shared library | scripts/__tests__/syncKernelGuard.test.ts | — | KEEP | importer scan |
| scripts/lib/syncKernel.ts | Pipeline shared library | scripts/__tests__/syncKernelGuard.test.ts | — | KEEP | importer scan |
| scripts/lib/syncLock.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/tax-foundation-state-tax.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/lib/topicPositionsPreserve.ts | Pipeline shared library | scan: 0 importers (verify) | — | MERGE | override |
| scripts/profile-build.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/profile-snapshot-update.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/reprocess-profiles.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/reprocess-topic-positions-bundle.ts | Source module | scan: 0 importers (verify) | — | MERGE | override |
| scripts/sync-congress-votes.ts | National sync script | lib/data/congressClient.ts | — | KEEP | importer scan |
| scripts/sync-fec-finance.ts | National sync script | lib/data/fecClient.ts | — | KEEP | importer scan |
| scripts/sync-fec-national.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-fec-schedule-a-pilot.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-fec-schedule-a.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-legislation.ts | National sync script | lib/data/legislation.ts | — | KEEP | importer scan |
| scripts/sync-legislators.ts | National sync script | lib/data/officeResolution.ts | — | KEEP | importer scan |
| scripts/sync-news-national.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-news-rss.ts | National sync script | scripts/__tests__/newsRegistry.test.ts | — | KEEP | importer scan |
| scripts/sync-profile-manifest.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-profile-news.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-stock-trades.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |
| scripts/sync-topic-positions.ts | National sync script | scripts/lib/crecOpener.ts | — | KEEP | importer scan |
| scripts/sync-votes-national.ts | National sync script | package.json npm script entrypoint | — | KEEP | importer scan |

Total rows: 210

