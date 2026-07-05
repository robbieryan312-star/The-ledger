# data/florida/ — Florida pilot snapshots (state-expansion template)

One directory per source, one snapshot each — output of the Florida ingestion pilot
(the template for future state expansions, scope priority 3). Written by
`scripts/ingest/florida/ingest-<source>-florida.ts` (`npm run ingest:<source>-fl`), read by
the slice builders (`npm run build:data-slices`) into `lib/data/slices/`. Refreshed daily by
the `refresh-data.yml` workflow (no-key sources always; keyed sources when secret set).

Sources: bls, census, civic, congress (FL delegation), courts, fara, fedregister, fldoe,
fllobbyist, gdelt (deletion candidate — no consumer), govinfo, govtrack, legiscan, lobbying,
news, openstates, sam, secedgar, spending, voteview.

Why this exists alongside `national/`: the pilot proved per-source ingestion end-to-end on
one state. National member depth lives in `lib/data/generated/profiles/` instead — different
architecture (per-destination files), not missing data.
