export interface TopicKeywordBucket {
  id: string;
  keywords: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordPattern(keyword: string): RegExp | null {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return null;

  if (/\s/.test(normalized)) {
    const tokens = normalized.split(/\s+/);
    const phrase = tokens
      .map((token, index) => {
        const escaped = escapeRegExp(token);
        if (index !== tokens.length - 1 || token.length < 4) return escaped;
        return `${escaped}(?:s|es)?`;
      })
      .join('\\s+');
    return new RegExp(`\\b${phrase}\\b`, 'i');
  }

  const escaped = escapeRegExp(normalized);
  if (normalized.length <= 3) {
    return new RegExp(`\\b${escaped}\\b`, 'i');
  }
  if (normalized.length === 4) {
    return new RegExp(`\\b${escaped}(?:s|es)?\\b`, 'i');
  }
  return new RegExp(`\\b${escaped}\\w*\\b`, 'i');
}

export function keywordMatchesText(text: string, keyword: string): boolean {
  return keywordPattern(keyword)?.test(text) ?? false;
}

export function topicKeywordScore(text: string, keywords: string[]): number {
  const hay = text.toLowerCase();
  return keywords.reduce((score, keyword) => {
    if (!keywordMatchesText(hay, keyword)) return score;
    return score + Math.max(1, keyword.trim().split(/\s+/).length);
  }, 0);
}

export function bestTopicIdForText(
  text: string,
  buckets: TopicKeywordBucket[],
): string | null {
  let bestTopicId: string | null = null;
  let bestScore = 0;

  for (const bucket of buckets) {
    const score = topicKeywordScore(text, bucket.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestTopicId = bucket.id;
    }
  }

  return bestTopicId;
}
