/**
 * Frozen fixtures for renderIntegrityGuard — append-only.
 * Education-tier panel overflow was a real owner-caught defect.
 */
export const RENDER_INTEGRITY_PAGES = [
  { path: '/states/FL', label: 'Florida state profile' },
] as const;

/** Add after profile template propagation (handoff step 3) */
export const RENDER_INTEGRITY_PROFILE_PAGES_DEFERRED = [
  { path: '/politicians/bernie-sanders', label: 'Sanders migrated profile' },
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

export const RENDER_INTEGRITY_SCREENSHOT_DIR = 'data/reports/render-integrity';
