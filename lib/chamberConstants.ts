import type { Chamber } from './types';

/** Chamber values for executive-branch officials (not imported from officeResolution — avoids bundling legislators JSON in client). */
export const EXECUTIVE_CHAMBERS: Chamber[] = ['president', 'vice_president', 'cabinet'];

/** Chamber values for judicial officials. */
export const JUDICIAL_CHAMBERS: Chamber[] = ['scotus'];
