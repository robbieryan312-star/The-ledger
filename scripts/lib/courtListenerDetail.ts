/**
 * CourtListener REST v4 cluster/opinion detail fetches.
 * Requires COURTLISTENER_API_KEY — /search/ is public; detail endpoints are not.
 */
import { fetchJson } from './ingest-utils';

export interface ClusterDetail {
  id?: number;
  syllabus?: string;
  posture?: string;
  procedural_history?: string;
  /** Harvard Caselaw Access Project headnotes when present */
  headnotes?: string;
  /** Harvard CAP summary when present */
  summary?: string;
  /** Disposition line when present in source metadata */
  disposition?: string;
  history?: string;
  correction?: string;
  cross_reference?: string;
  other_dates?: string;
}

export interface OpinionDetail {
  id?: number;
  plain_text?: string;
  type?: string;
}

const CLUSTER_FIELDS =
  'id,syllabus,posture,procedural_history,headnotes,summary,disposition,history,correction,cross_reference,other_dates';

const OPINION_FIELDS = 'id,plain_text,type';

export function courtListenerAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Token ${token}` };
}

export async function fetchClusterDetail(clusterId: number, token: string): Promise<ClusterDetail> {
  const url = `https://www.courtlistener.com/api/rest/v4/clusters/${clusterId}/?fields=${CLUSTER_FIELDS}`;
  return fetchJson<ClusterDetail>(url, { headers: courtListenerAuthHeaders(token) });
}

export async function fetchOpinionDetail(opinionId: number, token: string): Promise<OpinionDetail> {
  const url = `https://www.courtlistener.com/api/rest/v4/opinions/${opinionId}/?fields=${OPINION_FIELDS}`;
  return fetchJson<OpinionDetail>(url, { headers: courtListenerAuthHeaders(token) });
}
