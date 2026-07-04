/**
 * Immutable disk cache for roll-call and bill-summary API responses.
 * Roll calls never change once published — no TTL needed.
 * Cache lives at data/cache/{category}/ and is .gitignored.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CACHE_ROOT = path.join(PROJECT_ROOT, 'data', 'cache');

export type CacheCategory = 'rollcalls' | 'billsummaries';

function cachePath(category: CacheCategory, key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_ROOT, category, `${safeKey}.json`);
}

export async function readCache(category: CacheCategory, key: string): Promise<unknown | null> {
  try {
    const filePath = cachePath(category, key);
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function writeCache(category: CacheCategory, key: string, data: unknown): Promise<void> {
  try {
    const filePath = cachePath(category, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data), 'utf8');
  } catch {
    // Cache writes are best-effort — don't fail the sync on disk errors
  }
}
