/**
 * Pre-built politician search rows — constructed on the server from allPoliticians + resolveOffice.
 * Client search components filter this list; they never import generated JSON.
 */
export interface PoliticianSearchHit {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  state: string;
  stateCode: string;
  party: string;
  imageUrl?: string;
  officeLabel: string;
  href: string;
}

export interface StateRosterEntry {
  code: string;
  name: string;
}
