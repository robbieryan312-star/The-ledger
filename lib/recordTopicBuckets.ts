/**
 * Pure topic-bucket constants and classifiers — safe for client components (no generated JSON imports).
 */
import { normalizeTopicId } from '@/lib/topicAliases';

export { normalizeTopicId };

interface TopicBucketDef {
  id: string;
  label: string;
  keywords: string[];
}

/** Raw sync / record buckets — aligned to the 10 finalized profile topics (+ legislation catch-all). */
export const RECORD_TOPIC_BUCKETS: TopicBucketDef[] = [
  {
    id: 'abortion',
    label: 'Abortion & Reproductive Rights',
    keywords: ['abortion', 'reproductive', 'pro-life', 'pro-choice', 'roe', 'contraception', 'ivf', 'dobbs', 'pregnancy'],
  },
  {
    id: 'technology',
    label: 'Technology, Privacy & AI',
    keywords: [
      'artificial intelligence', ' section 230', 'section 230', 'data privacy', 'algorithm', 'big tech',
      'content moderation', 'deepfake', 'social media platform', 'tech platform', 'online platform',
      'surveillance tech', 'facial recognition',
    ],
  },
  {
    id: 'public-safety',
    label: 'Public Safety',
    keywords: [
      'gun', 'firearm', 'second amendment', 'background check', 'assault weapon', 'weapon',
      'criminal justice', 'sentencing', 'incarceration', 'police reform', 'bail', 'death penalty',
      'prison', 'law enforcement', 'crime', 'fentanyl', 'illicit trade', 'trafficking',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    keywords: [
      'health', 'healthcare', 'medicaid', 'medicare', 'hospital', 'prescription', 'drug',
      'insurance', 'aca', 'obamacare', 'mental health', 'opioid', 'nursing', 'cancer', 'patient',
    ],
  },
  {
    id: 'immigration',
    label: 'Immigration & Border',
    keywords: ['immigration', 'border', 'migrant', 'asylum', 'daca', 'dreamer', 'e-verify', 'sanctuary', 'visa', 'refugee', 'deportation', 'ice '],
  },
  {
    id: 'climate',
    label: 'Climate & Energy',
    keywords: ['climate', 'environment', 'energy', 'pollution', 'emission', 'renewable', 'fossil', 'drilling', 'wildlife', 'conservation', 'pollinator', 'everglades', 'water quality', 'carbon'],
  },
  {
    id: 'defense-veterans',
    label: 'Defense & Veterans',
    keywords: [
      'defense', 'military', 'armed forces', 'war powers', 'nato', 'ukraine', 'israel', 'iran', 'china',
      'taiwan', 'foreign aid', 'pentagon', 'troops', 'hostilities', 'veteran',
      'veterans', 'gi bill', 'va benefits', 'tricare', 'military family', 'service member',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    keywords: [
      'education', 'student loan', 'public school', 'higher education', 'community college',
      'k-12', 'teacher', 'tuition', 'curriculum', 'child care', 'head start', 'title i',
      'pell grant', 'school district', 'school choice',
    ],
  },
  {
    id: 'civil-liberties',
    label: 'Civil Liberties & Regulation',
    keywords: [
      'civil rights', 'civil liberties', 'voting rights', 'voter eligibility', 'voter', 'election',
      'discrimination',
      'fisa', 'surveillance',
      'speech', 'censorship', 'lgbt', 'equality', 'judiciary', 'judicial', 'nomination', 'confirm',
      'justice', 'court', 'judge', 'district judge', 'circuit judge', 'attorney general',
      'ambassador', 'constitutional',
    ],
  },
  {
    id: 'economy-taxes',
    label: 'Economy & Taxes',
    keywords: [
      'budget', 'appropriat', 'fiscal', 'debt', 'spending', 'inflation', 'jobs', 'wage', 'trade',
      'tariff', 'tax', 'revenue', 'deficit', 'commerce', 'housing', 'rent', 'mortgage', 'homeless',
      'affordable housing', 'zoning', 'eviction', 'hud', 'antitrust', 'monopoly', 'corporate power',
      'home price', 'home ownership', 'homeownership', 'home buyer', 'first-time home buyer',
      'file taxes', 'filing taxes', 'tax filing', 'tax day', 'file their taxes', 'pay their taxes',
      'irs', 'spending bill', 'omnibus', 'shutdown', 'government shutdown', 'paycheck',
      'continuing appropriations', 'tax breaks for billionaires',
    ],
  },
  {
    id: 'legislation',
    label: 'Federal Legislation',
    keywords: [],
  },
];

export function recordKeywordMatches(hay: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return false;
  if (/\s/.test(k)) return hay.includes(k);
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(hay);
}

function scoreTopicBuckets(hay: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const bucket of RECORD_TOPIC_BUCKETS) {
    if (bucket.id === 'legislation') continue;
    let score = 0;
    let phraseHits = 0;
    let singleWordHits = 0;
    for (const keyword of bucket.keywords) {
      if (recordKeywordMatches(hay, keyword)) {
        score += keyword.trim().length;
        if (/\s/.test(keyword.trim())) phraseHits += 1;
        else singleWordHits += 1;
      }
    }
    if (score > 0 && (phraseHits >= 1 || singleWordHits >= 2)) {
      scores.set(bucket.id, score);
    }
  }
  return scores;
}

export function classifyTextToRecordTopicId(text: string, category?: string): string {
  const hay = `${text} ${category ?? ''}`.toLowerCase();
  const cat = (category ?? '').toLowerCase();

  if (cat === 'procedural') return 'legislation';
  if (cat === 'budget') return 'economy-taxes';
  if (cat === 'judiciary') return 'civil-liberties';

  // Student-debt / education-cut floor remarks often also mention tax bills; prefer education.
  if (
    /\b(student debt|student loan|student loans)\b/.test(hay) &&
    /\b(education|tuition|pell grant|public school|higher education)\b/.test(hay)
  ) {
    return 'education';
  }

  if (/\b(data privacy|artificial intelligence|\bai\b|algorithm|deepfake|content moderation|section 230|big tech)\b/.test(hay)) {
    return 'technology';
  }

  if (/\b(antitrust|monopoly)\b/.test(hay)) {
    if (/\b(big tech|tech platform|platform|google|meta|facebook|amazon|apple|microsoft|silicon valley)\b/.test(hay)) {
      return 'technology';
    }
    return 'economy-taxes';
  }

  const scores = scoreTopicBuckets(hay);
  if (scores.size > 0) {
    let bestId = 'legislation';
    let bestScore = 0;
    for (const [id, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }

  if (cat === 'legislation' || hay.includes('bill') || hay.includes('resolution')) {
    return 'legislation';
  }
  return 'legislation';
}

export function recordTopicLabel(id: string): string {
  const canonicalId = normalizeTopicId(id);
  return RECORD_TOPIC_BUCKETS.find((b) => b.id === canonicalId)?.label ?? 'Federal Legislation';
}
