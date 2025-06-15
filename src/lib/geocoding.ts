// Geocoding utilities for reverse geocoding coordinates to location names

export interface LocationData {
  continent?: string;
  country?: string;
  state?: string;
  locality?: string;
}

// Normalize longitude to be within -180 to 180 range
const normalizeLongitude = (lng: number): number => {
  // Normalize longitude to be within -180 to 180
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
};

// Free reverse geocoding using OpenStreetMap Nominatim API
export const reverseGeocode = async (lat: number, lng: number): Promise<LocationData> => {
  try {
    // Normalize longitude before making the API call
    const normalizedLng = normalizeLongitude(lng);
    
    console.log('🌍 Starting reverse geocoding for coordinates:', { 
      original: { lat, lng }, 
      normalized: { lat, lng: normalizedLng } 
    });
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${normalizedLng}&addressdetails=1&accept-language=en`,
      {
        headers: {
          'User-Agent': 'Fellowship-Finder/1.0'
        }
      }
    );

    console.log('📡 Raw geocoding response:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      console.error('❌ Geocoding request failed with status:', response.status);
      throw new Error(`Geocoding request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('🔍 Raw geocoding response:', data);
    
    if (!data || data.error) {
      console.log('⚠️ No address data in response or error occurred:', data?.error);
      return {};
    }

    if (!data.address) {
      console.log('⚠️ No address data in response');
      return {};
    }

    const address = data.address;
    console.log('🏠 Address object:', address);
    
    // Extract location components
    const locationData: LocationData = {
      continent: getContinent(address.country_code),
      country: address.country,
      state: address.state || address.province || address.region,
      locality: address.city || address.town || address.village || address.municipality
    };

    console.log('✅ Final location data:', locationData);
    return locationData;
  } catch (error) {
    console.error('❌ Reverse geocoding failed:', error);
    return {};
  }
};

// Map country codes to continents
const getContinent = (countryCode?: string): string | undefined => {
  if (!countryCode) return undefined;
  
  const continentMap: { [key: string]: string } = {
    // North America
    'us': 'North America',
    'ca': 'North America',
    'mx': 'North America',
    'gt': 'North America',
    'bz': 'North America',
    'sv': 'North America',
    'hn': 'North America',
    'ni': 'North America',
    'cr': 'North America',
    'pa': 'North America',
    
    // South America
    'ar': 'South America',
    'bo': 'South America',
    'br': 'South America',
    'cl': 'South America',
    'co': 'South America',
    'ec': 'South America',
    'fk': 'South America',
    'gf': 'South America',
    'gy': 'South America',
    'py': 'South America',
    'pe': 'South America',
    'sr': 'South America',
    'uy': 'South America',
    've': 'South America',
    
    // Europe
    'ad': 'Europe',
    'al': 'Europe',
    'at': 'Europe',
    'ba': 'Europe',
    'be': 'Europe',
    'bg': 'Europe',
    'by': 'Europe',
    'ch': 'Europe',
    'cy': 'Europe',
    'cz': 'Europe',
    'de': 'Europe',
    'dk': 'Europe',
    'ee': 'Europe',
    'es': 'Europe',
    'fi': 'Europe',
    'fr': 'Europe',
    'gb': 'Europe',
    'ge': 'Europe',
    'gr': 'Europe',
    'hr': 'Europe',
    'hu': 'Europe',
    'ie': 'Europe',
    'is': 'Europe',
    'it': 'Europe',
    'li': 'Europe',
    'lt': 'Europe',
    'lu': 'Europe',
    'lv': 'Europe',
    'mc': 'Europe',
    'md': 'Europe',
    'me': 'Europe',
    'mk': 'Europe',
    'mt': 'Europe',
    'nl': 'Europe',
    'no': 'Europe',
    'pl': 'Europe',
    'pt': 'Europe',
    'ro': 'Europe',
    'rs': 'Europe',
    'ru': 'Europe',
    'se': 'Europe',
    'si': 'Europe',
    'sk': 'Europe',
    'sm': 'Europe',
    'ua': 'Europe',
    'va': 'Europe',
    
    // Asia
    'af': 'Asia',
    'am': 'Asia',
    'az': 'Asia',
    'bd': 'Asia',
    'bh': 'Asia',
    'bn': 'Asia',
    'bt': 'Asia',
    'cn': 'Asia',
    'id': 'Asia',
    'il': 'Asia',
    'in': 'Asia',
    'iq': 'Asia',
    'ir': 'Asia',
    'jo': 'Asia',
    'jp': 'Asia',
    'kg': 'Asia',
    'kh': 'Asia',
    'kp': 'Asia',
    'kr': 'Asia',
    'kw': 'Asia',
    'kz': 'Asia',
    'la': 'Asia',
    'lb': 'Asia',
    'lk': 'Asia',
    'mm': 'Asia',
    'mn': 'Asia',
    'mv': 'Asia',
    'my': 'Asia',
    'np': 'Asia',
    'om': 'Asia',
    'ph': 'Asia',
    'pk': 'Asia',
    'qa': 'Asia',
    'sa': 'Asia',
    'sg': 'Asia',
    'sy': 'Asia',
    'th': 'Asia',
    'tj': 'Asia',
    'tl': 'Asia',
    'tm': 'Asia',
    'tr': 'Asia',
    'tw': 'Asia',
    'uz': 'Asia',
    'vn': 'Asia',
    'ye': 'Asia',
    
    // Africa
    'ao': 'Africa',
    'bf': 'Africa',
    'bi': 'Africa',
    'bj': 'Africa',
    'bw': 'Africa',
    'cd': 'Africa',
    'cf': 'Africa',
    'cg': 'Africa',
    'ci': 'Africa',
    'cm': 'Africa',
    'cv': 'Africa',
    'dj': 'Africa',
    'dz': 'Africa',
    'eg': 'Africa',
    'eh': 'Africa',
    'er': 'Africa',
    'et': 'Africa',
    'ga': 'Africa',
    'gh': 'Africa',
    'gm': 'Africa',
    'gn': 'Africa',
    'gq': 'Africa',
    'gw': 'Africa',
    'ke': 'Africa',
    'km': 'Africa',
    'lr': 'Africa',
    'ls': 'Africa',
    'ly': 'Africa',
    'ma': 'Africa',
    'mg': 'Africa',
    'ml': 'Africa',
    'mr': 'Africa',
    'mu': 'Africa',
    'mw': 'Africa',
    'mz': 'Africa',
    'na': 'Africa',
    'ne': 'Africa',
    'ng': 'Africa',
    'rw': 'Africa',
    'sc': 'Africa',
    'sd': 'Africa',
    'sl': 'Africa',
    'sn': 'Africa',
    'so': 'Africa',
    'ss': 'Africa',
    'st': 'Africa',
    'sz': 'Africa',
    'td': 'Africa',
    'tg': 'Africa',
    'tn': 'Africa',
    'tz': 'Africa',
    'ug': 'Africa',
    'za': 'Africa',
    'zm': 'Africa',
    'zw': 'Africa',
    
    // Oceania
    'au': 'Oceania',
    'fj': 'Oceania',
    'ki': 'Oceania',
    'mh': 'Oceania',
    'fm': 'Oceania',
    'nr': 'Oceania',
    'nz': 'Oceania',
    'pw': 'Oceania',
    'pg': 'Oceania',
    'ws': 'Oceania',
    'sb': 'Oceania',
    'to': 'Oceania',
    'tv': 'Oceania',
    'vu': 'Oceania',
  };
  
  return continentMap[countryCode.toLowerCase()];
};

// Get unique values for location filters
export const getUniqueLocations = (pins: any[]) => {
  const continents = new Set<string>();
  const countries = new Set<string>();
  const states = new Set<string>();
  const localities = new Set<string>();
  
  pins.forEach(pin => {
    if (pin.continent) continents.add(pin.continent);
    if (pin.country) countries.add(pin.country);
    if (pin.state) states.add(pin.state);
    if (pin.locality) localities.add(pin.locality);
  });
  
  return {
    continents: Array.from(continents).sort(),
    countries: Array.from(countries).sort(),
    states: Array.from(states).sort(),
    localities: Array.from(localities).sort(),
  };
};