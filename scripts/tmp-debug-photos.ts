import { getPoliticiansForState } from '../lib/data/allPoliticians';
import { bioguideMatchesCurrentLegislator, congressPhotoUrl } from '../lib/data/photos';

for (const id of ['M001244', 'P000622', 'S001200'] as const) {
  console.log(id, 'helper', congressPhotoUrl(id));
}

for (const p of getPoliticiansForState('FL')) {
  if (
    ['M001244', 'P000622', 'S001200'].includes(p.bioguideId ?? '') ||
    /Moody|Patronis|Soto/.test(p.name)
  ) {
    const match = p.bioguideId
      ? bioguideMatchesCurrentLegislator(p.bioguideId, p)
      : false;
    console.log({
      name: p.name,
      id: p.id,
      bioguideId: p.bioguideId,
      imageUrl: p.imageUrl,
      recordType: p.recordType,
      bioguideMatch: match,
    });
  }
}

for (const p of getPoliticiansForState('FL')) {
  if (p.imageUrl?.includes('govtrack')) {
    console.log('GOVTRACK LEFT', p.name, p.imageUrl);
  }
}
