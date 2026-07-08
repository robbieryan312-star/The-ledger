# Profile credibility re-audit — 7 locked profiles

**Generated:** 2026-07-08T04:18:34.395Z
**Mode:** read-only (no data mutations)
**Members:** S000033, O000172, M000355, M001184, W000817, C001098, P000197

## Summary

| bioguideId | Name | Defect rows | P0 | P1 | P2 |
|------------|------|-------------|----|----|-----|
| S000033 | Bernie Sanders | 1 | 0 | 0 | 1 |
| O000172 | Alexandria Ocasio-Cortez | 3 | 0 | 2 | 1 |
| M000355 | Mitch McConnell | 3 | 0 | 2 | 1 |
| M001184 | Thomas Massie | 3 | 0 | 2 | 1 |
| W000817 | Elizabeth Warren | 3 | 0 | 0 | 3 |
| C001098 | Ted Cruz | 4 | 0 | 1 | 3 |
| P000197 | Nancy Pelosi | 3 | 0 | 0 | 3 |

**Total defect rows:** 20

## Per-member detail

### S000033 — Bernie Sanders (1 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/S000033/orgVoteLinks.json |

### O000172 — Alexandria Ocasio-Cortez (3 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| manifest | P1 | manifest-data-mismatch | manifest.categories.controversies=honest-gap but controversies.json has content | profiles/O000172/manifest.json |
| manifest | P1 | manifest-data-mismatch | manifest.categories.endorsements=honest-gap but endorsements.json has content | profiles/O000172/manifest.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/O000172/orgVoteLinks.json |

### M000355 — Mitch McConnell (3 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| manifest | P1 | manifest-data-mismatch | manifest.categories.controversies=honest-gap but controversies.json has content | profiles/M000355/manifest.json |
| manifest | P1 | manifest-data-mismatch | manifest.categories.endorsements=honest-gap but endorsements.json has content | profiles/M000355/manifest.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/M000355/orgVoteLinks.json |

### M001184 — Thomas Massie (3 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| manifest | P1 | manifest-data-mismatch | manifest.categories.controversies=honest-gap but controversies.json has content | profiles/M001184/manifest.json |
| manifest | P1 | manifest-data-mismatch | manifest.categories.endorsements=honest-gap but endorsements.json has content | profiles/M001184/manifest.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/M001184/orgVoteLinks.json |

### W000817 — Elizabeth Warren (3 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| controversies | P2 | no-file-status-field | Empty controversies relies on manifest-only status (file has no status field) | profiles/W000817/controversies.json |
| endorsements | P2 | no-file-status-field | Empty endorsements relies on manifest-only status (file has no status field) | profiles/W000817/endorsements.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/W000817/orgVoteLinks.json |

### C001098 — Ted Cruz (4 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| manifest | P1 | manifest-data-mismatch | manifest.categories.statements=none-in-range but statements.json has content | profiles/C001098/manifest.json |
| controversies | P2 | no-file-status-field | Empty controversies relies on manifest-only status (file has no status field) | profiles/C001098/controversies.json |
| endorsements | P2 | no-file-status-field | Empty endorsements relies on manifest-only status (file has no status field) | profiles/C001098/endorsements.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/C001098/orgVoteLinks.json |

### P000197 — Nancy Pelosi (3 defects)

| Category | Severity | Check | Detail | Path |
|----------|----------|-------|--------|------|
| controversies | P2 | no-file-status-field | Empty controversies relies on manifest-only status (file has no status field) | profiles/P000197/controversies.json |
| endorsements | P2 | no-file-status-field | Empty endorsements relies on manifest-only status (file has no status field) | profiles/P000197/endorsements.json |
| orgVoteLinks | P2 | no-file-status-field | Empty orgVoteLinks relies on manifest-only status (file has no status field) | profiles/P000197/orgVoteLinks.json |

---

_Report produced by `scripts/audit-profile-credibility.ts`. Fixes are out of scope for this pass — Claude rules on remediation._
