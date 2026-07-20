# B2 content-map — DATA_INTEGRATION_PLAN.md → ARCHITECTURE.md

**Source:** `lib/data/DATA_INTEGRATION_PLAN.md` (stubbed)  
**Survivor:** `ARCHITECTURE.md`

| Source (DIP) | Destination (ARCHITECTURE) | Action |
|--------------|---------------------------|--------|
| §1 Principles 1–5 | ledger-core-rules §3 + ARCH § Corroboration | Tier table **dropped** → reference §3 |
| §2 TS shapes | ARCH § Data integration — shapes | Merged; points to lib/types + officeResolution.ts |
| §3 Recency algorithm | ARCH § Office resolution algorithm | Merged |
| §4 Corroboration rule | ARCH § Corroboration rule | Merged |
| §5 Ranked roadmap | ARCH § Source integration roadmap | Merged; tier → code values |
| §6 Pipeline status | ARCH § Pipeline status | Merged; **6→7** migrated |
| §7 National coverage | ARCH § Pipeline status | Merged; **6→7** migrated |
| §8 Stock trades checkpoint | ARCH § Stock trades checkpoint | Merged |
| FEC sync workflow | ARCH § FEC refresh workflow | Merged |
| Status checklist | ARCH § Pipeline status + sync tables | Key bullets merged |
| FUTURE_ROADMAP link | DIP stub → docs/archive/FUTURE_ROADMAP.md | Pointer only |

**ARCHITECTURE fixes:** sourceCatalog.ts; CENSUS_API_KEY; NEWSAPI_KEY deferred; 7/537; RSS-primary news.
