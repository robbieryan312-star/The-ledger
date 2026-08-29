import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlatformPositionEntry, SaidDidLinkEntry, TopicStatementEntry } from '../../lib/data/topicPositions';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheRoot = path.join(projectRoot, 'data', 'cache', 'profile-topic-positions');

export type ProfileTopicPositionsByTopic = Record<
  string,
  {
    platformPositions?: PlatformPositionEntry[];
    statements?: TopicStatementEntry[];
    saidDidLinks?: SaidDidLinkEntry[];
  }
>;

type SidecarShape = {
  bioguideId?: string;
  generatedAt?: string;
  byTopic?: ProfileTopicPositionsByTopic;
};

export function profileTopicPositionsCachePath(bioguideId: string): string {
  return path.join(cacheRoot, `${bioguideId}.json`);
}

export function profileTopicPositionsTmpPath(bioguideId: string): string {
  return `/tmp/topic-positions-${bioguideId}.json`;
}

export async function writeProfileTopicPositionsSidecar(
  bioguideId: string,
  byTopic: ProfileTopicPositionsByTopic,
): Promise<string> {
  const payload: SidecarShape = {
    bioguideId,
    generatedAt: new Date().toISOString(),
    byTopic,
  };
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const cachePath = profileTopicPositionsCachePath(bioguideId);

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, body, 'utf8');
  await writeFile(profileTopicPositionsTmpPath(bioguideId), body, 'utf8');

  return cachePath;
}

export async function readProfileTopicPositionsSidecar(
  bioguideId: string,
): Promise<ProfileTopicPositionsByTopic | null> {
  for (const sidePath of [profileTopicPositionsCachePath(bioguideId), profileTopicPositionsTmpPath(bioguideId)]) {
    try {
      const parsed = JSON.parse(await readFile(sidePath, 'utf8')) as SidecarShape;
      if (parsed.byTopic && Object.keys(parsed.byTopic).length > 0) return parsed.byTopic;
    } catch {
      /* try the next sidecar location */
    }
  }
  return null;
}
