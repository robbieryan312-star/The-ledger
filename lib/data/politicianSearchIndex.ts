/**
 * Server-only: build lightweight search index from the full roster (imports generated JSON).
 */
import { allPoliticians, rosterStates } from './allPoliticians';
import { resolveCurrentOffice } from './officeResolution';
import type { PoliticianSearchHit, StateRosterEntry } from '../types/searchIndex';

export {
  filterPoliticianHits,
  sortOfficialsForDisplay,
  politiciansForState,
} from '@/lib/politicianSearchIndex';

export function buildPoliticianSearchIndex(): PoliticianSearchHit[] {
  return allPoliticians.map((p) => {
    const office = resolveCurrentOffice(p);
    return {
      id: p.id,
      name: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      state: p.state,
      stateCode: p.stateCode,
      party: p.party,
      imageUrl: p.imageUrl,
      officeLabel: office.label,
      href: `/politicians/${p.id}`,
    };
  });
}

export function buildStateRosterIndex(): StateRosterEntry[] {
  return rosterStates.map((s) => ({ code: s.code, name: s.name }));
}
