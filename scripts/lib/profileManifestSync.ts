/**
 * Sync per-profile manifest.json + required category status fields from on-disk files.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hasSanitizedEndorsementContent,
  resolveCategoryFileStatus,
  resolveManifestCategoryStatus,
} from '../../lib/data/profileCategoryIntegrity';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profilesRoot = path.join(projectRoot, 'lib', 'data', 'generated', 'profiles');

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function syncProfileManifestFromDisk(bioguideId: string): Promise<void> {
  const dir = path.join(profilesRoot, bioguideId);
  const manifest =
    (await readJson<{ bioguideId: string; politicianId?: string; asOf?: string; categories: Record<string, string> }>(
      path.join(dir, 'manifest.json'),
    )) ?? null;
  if (!manifest) {
    throw new Error(`Missing manifest.json for ${bioguideId}`);
  }

  const statements = (await readJson<Record<string, unknown>>(path.join(dir, 'statements.json'))) ?? {};
  const positions = (await readJson<Record<string, unknown>>(path.join(dir, 'positions.json'))) ?? {};
  const saidDid = (await readJson<Record<string, unknown>>(path.join(dir, 'saidDid.json'))) ?? {};
  const news = (await readJson<Record<string, unknown>>(path.join(dir, 'news.json'))) ?? {};
  const votes = (await readJson<Record<string, unknown>>(path.join(dir, 'votes.json'))) ?? {};
  const finance = (await readJson<Record<string, unknown>>(path.join(dir, 'finance.json'))) ?? {};
  const controversies = (await readJson<Record<string, unknown>>(path.join(dir, 'controversies.json'))) ?? {
    bioguideId,
    items: [],
  };
  const endorsements = (await readJson<Record<string, unknown>>(path.join(dir, 'endorsements.json'))) ?? {
    bioguideId,
    endorses: [],
    endorsedBy: [],
  };
  const orgVoteLinks = (await readJson<Record<string, unknown>>(path.join(dir, 'orgVoteLinks.json'))) ?? {
    bioguideId,
    links: [],
  };

  const controversiesStatus = resolveCategoryFileStatus('controversies', controversies);
  const controversiesOut = {
    ...controversies,
    bioguideId,
    status: controversiesStatus,
    items: (controversies.items as unknown[]) ?? [],
  };
  await writeJson(path.join(dir, 'controversies.json'), controversiesOut);

  const endorsementsStatus = resolveCategoryFileStatus('endorsements', endorsements);
  const endorsementsOut = {
    ...endorsements,
    bioguideId,
    status: endorsementsStatus,
    endorses: (endorsements.endorses as unknown[]) ?? [],
    endorsedBy: (endorsements.endorsedBy as unknown[]) ?? [],
  };
  await writeJson(path.join(dir, 'endorsements.json'), endorsementsOut);

  const orgStatus = resolveCategoryFileStatus('orgVoteLinks', orgVoteLinks);
  const orgOut = {
    ...orgVoteLinks,
    bioguideId,
    status: orgStatus,
    links: (orgVoteLinks.links as unknown[]) ?? [],
  };
  await writeJson(path.join(dir, 'orgVoteLinks.json'), orgOut);

  manifest.categories = {
    ...manifest.categories,
    header: 'filled',
    legislation: manifest.categories.legislation ?? 'filled',
    trades: manifest.categories.trades ?? 'honest-gap',
    statements: resolveManifestCategoryStatus('statements', statements),
    positions: resolveManifestCategoryStatus('positions', positions),
    saidDid: resolveManifestCategoryStatus('saidDid', saidDid),
    news: resolveManifestCategoryStatus('news', news),
    votes: resolveManifestCategoryStatus('votes', votes),
    finance: resolveManifestCategoryStatus('finance', finance),
    controversies: resolveManifestCategoryStatus('controversies', controversiesOut),
    endorsements: hasSanitizedEndorsementContent(endorsementsOut as { endorses?: unknown[]; endorsedBy?: unknown[] })
      ? 'filled'
      : resolveManifestCategoryStatus('endorsements', endorsementsOut),
    orgVoteLinks: resolveManifestCategoryStatus('orgVoteLinks', orgOut),
  };

  manifest.asOf = new Date().toISOString().slice(0, 10);
  await writeJson(path.join(dir, 'manifest.json'), manifest);
}
