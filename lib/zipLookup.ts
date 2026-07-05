export interface ZipLocation {
  state: string;
  code: string;
  city: string;
  countyFips?: string;
  countyName?: string;
}

// ZIP → location mapping (demo set — production would use full USPS crosswalk)
export const ZIP_TO_STATE: Record<string, ZipLocation> = {
  '10001': { state: 'New York', code: 'NY', city: 'New York, NY', countyFips: '36061', countyName: 'New York' },
  '90001': { state: 'California', code: 'CA', city: 'Los Angeles, CA', countyFips: '06037', countyName: 'Los Angeles' },
  '60601': { state: 'Illinois', code: 'IL', city: 'Chicago, IL' },
  '77001': { state: 'Texas', code: 'TX', city: 'Houston, TX', countyFips: '48201', countyName: 'Harris' },
  '30301': { state: 'Georgia', code: 'GA', city: 'Atlanta, GA' },
  '02101': { state: 'Massachusetts', code: 'MA', city: 'Boston, MA' },
  '98101': { state: 'Washington', code: 'WA', city: 'Seattle, WA', countyFips: '53033', countyName: 'King' },
  '85001': { state: 'Arizona', code: 'AZ', city: 'Phoenix, AZ' },
  '19101': { state: 'Pennsylvania', code: 'PA', city: 'Philadelphia, PA' },
  '78201': { state: 'Texas', code: 'TX', city: 'San Antonio, TX', countyFips: '48029', countyName: 'Bexar' },
  '33101': { state: 'Florida', code: 'FL', city: 'Miami, FL', countyFips: '12086', countyName: 'Miami-Dade' },
  '33139': { state: 'Florida', code: 'FL', city: 'Miami Beach, FL', countyFips: '12086', countyName: 'Miami-Dade' },
  '33426': { state: 'Florida', code: 'FL', city: 'Boynton Beach, FL', countyFips: '12099', countyName: 'Palm Beach' },
  '33401': { state: 'Florida', code: 'FL', city: 'West Palm Beach, FL', countyFips: '12099', countyName: 'Palm Beach' },
  '80201': { state: 'Colorado', code: 'CO', city: 'Denver, CO' },
  '05401': { state: 'Vermont', code: 'VT', city: 'Burlington, VT' },
  '40201': { state: 'Kentucky', code: 'KY', city: 'Louisville, KY' },
  '41001': { state: 'Kentucky', code: 'KY', city: 'Covington, KY' },
};

export function lookupZip(zip: string): ZipLocation | null {
  return ZIP_TO_STATE[zip] ?? null;
}
