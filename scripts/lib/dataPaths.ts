/**
 * Canonical data/ paths for sync scripts — single source of truth.
 * National snapshots live under data/national/{votes,fec}/ (see data/national/README.md).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsLibDir = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(scriptsLibDir, '../..');

export const DATA_NATIONAL_VOTES_DIR = path.join(PROJECT_ROOT, 'data', 'national', 'votes');
export const DATA_NATIONAL_FEC_DIR = path.join(PROJECT_ROOT, 'data', 'national', 'fec');
export const NATIONAL_VOTES_FILE = path.join(DATA_NATIONAL_VOTES_DIR, 'congress-votes.json');
export const NATIONAL_FEC_FILE = path.join(DATA_NATIONAL_FEC_DIR, 'congress-finance.json');
export const NATIONAL_SCHEDULE_A_FILE = path.join(DATA_NATIONAL_FEC_DIR, 'schedule-a.json');
export const NATIONAL_FEC_PILOT_DIR = path.join(DATA_NATIONAL_FEC_DIR, 'pilot');
export const PILOT_S000033_SCHEDULE_A_FILE = path.join(
  NATIONAL_FEC_PILOT_DIR,
  'S000033-schedule-a.json',
);
