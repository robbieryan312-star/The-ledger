export {
  matchesMemberInText,
  memberNewsMatchNames,
  memberNewsNameTokens,
  memberNewsPrimaryName,
  type LegislatorNewsRow,
  type NewsDisplayMap,
} from '../../lib/data/memberNewsMatching';
import { loadProfileDisplayIdentityByBioguide } from './profileDisplayIdentity';

export function loadMemberNewsDisplayMap(projectRoot: string) {
  return loadProfileDisplayIdentityByBioguide(projectRoot);
}
