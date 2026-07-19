/**
 * Frozen fixtures for renderIntegrityGuard — append-only.
 * Education-tier panel overflow was a real owner-caught defect.
 */
export const RENDER_INTEGRITY_PAGES = [
  { path: '/states/FL', label: 'Florida state profile' },
] as const;

/**
 * Migrated politician profiles whose expandable issue drawers are checked at mobile
 * width (S2 / Phase P task 1). Promoted from the former DEFERRED list once the
 * profile template's drawer layout was fixed.
 */
export const RENDER_INTEGRITY_PROFILE_PAGES = [
  { path: '/politicians/bernie-sanders', label: 'Sanders migrated profile' },
  { path: '/politicians/elizabeth-warren', label: 'Warren migrated profile' },
  { path: '/politicians/alexandria-ocasio-cortez', label: 'Ocasio-Cortez migrated profile' },
] as const;

export const RENDER_INTEGRITY_VIEWPORTS = [
  { width: 390, height: 844, label: 'mobile' },
  { width: 1280, height: 900, label: 'desktop' },
] as const;

/** Selector for education earnings panel — must not overflow viewport horizontally */
export const RENDER_INTEGRITY_EDUCATION_PANEL_SELECTOR =
  '[data-testid="fl-education-earnings-panel"]';

export const RENDER_INTEGRITY_KNOWN_BAD = {
  defect: 'education-table-column-overflow',
  description:
    'Education tier columns extended past card edge on narrow viewports — fixed with fluid grid',
  viewport: { width: 390, height: 844 },
};

export const RENDER_INTEGRITY_POLITICIAN_IMAGE_KNOWN_BAD = {
  defect: 'politician-portrait-fallback-hidden-by-section-skip',
  description:
    'A blanket #politicians image exemption let broken official portraits render as initials while the guard passed',
  selector: '#politicians [data-ledger-avatar="fallback"]',
};

/**
 * Owner-reported defect (2026-07-19, mobile screenshots of a migrated profile):
 * an expanded issue drawer rendered inside a single cell of the 2-column mobile topic
 * grid — squeezed to ~half viewport width with a dead-empty sibling cell, text wrapping
 * one word per line, and the same quote printed three times (gold headline, italic body,
 * and the evidence row). Fixed by making the open topic span the full grid width
 * (col-span-full) and collapsing the redundant evidence row to provenance-only.
 * The guard asserts, at 390×844 with drawers open, that no ≥2-column grid cell is both
 * tall (≥300px) and narrower than 90% of its grid container's width (i.e. an open drawer
 * must be col-span-full, not squeezed into one column), and no tall sibling cell is empty.
 */
export const RENDER_INTEGRITY_PROFILE_DRAWER_KNOWN_BAD = {
  defect: 'profile-issue-drawer-half-width-triple-quote',
  description:
    'Expanded issue drawer squeezed into a half-width mobile grid cell with a dead sibling column and a triple-printed quote',
  viewport: { width: 390, height: 844 },
  minDrawerWidthRatio: 0.9,
  siblingEmptyHeightPx: 300,
};

export const RENDER_INTEGRITY_SCREENSHOT_DIR = 'data/reports/render-integrity';
