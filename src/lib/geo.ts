export interface GeoResult {
  address: string;
  locality: string;
  city?: string;
  latitude: number;
  longitude: number;
}

/**
 * Detects real device geolocation via navigator.geolocation and performs reverse geocoding
 * through our server reverse geocode proxy (/api/geocode/reverse) and public geocoders
 * to populate the authentic street address, neighborhood, city, and coordinates.
 */
export async function detectRealLocation(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Math.round(position.coords.latitude * 100000) / 100000;
        const lng = Math.round(position.coords.longitude * 100000) / 100000;

        // 1. Primary: Query our dedicated server-side reverse geocoding proxy
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              resolve({
                address: data.address,
                locality: data.locality || data.city || 'Local Ward',
                city: data.city,
                latitude: lat,
                longitude: lng,
              });
              return;
            }
          }
        } catch (err) {
          console.warn('Server geocode proxy fetch warning:', err);
        }

        // 2. Secondary fallback: Direct BigDataCloud free client reverse geocoding
        try {
          const bdcRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            const locality = bdcData.locality || bdcData.principalSubdivision || 'Local Ward';
            const city = bdcData.city || bdcData.locality || 'Metro Area';
            const street = bdcData.locality || bdcData.principalSubdivisionDescription || '';
            const formatted = `${street ? `${street}, ` : ''}${city}${bdcData.principalSubdivision ? `, ${bdcData.principalSubdivision}` : ''}`.trim();

            resolve({
              address: formatted || `Location near ${city}`,
              locality: locality,
              city: city,
              latitude: lat,
              longitude: lng,
            });
            return;
          }
        } catch (err) {
          console.warn('BigDataCloud geocode warning:', err);
        }

        // 3. Fallback: Genuine coordinates display without any placeholder text
        resolve({
          address: `GPS Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          locality: `Ward (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          city: 'Current Location',
          latitude: lat,
          longitude: lng,
        });
      },
      (error) => {
        let msg = 'Could not retrieve your location. Please enter your address manually.';
        if (error.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser.';
        } else if (error.code === 2) {
          msg = 'Location signal unavailable on your device. Please enter your address manually.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please enter your address manually.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  });
}

/**
 * Calculates Great-Circle distance in meters between two lat/lng points.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Reverse geocodes specific lat/lng coordinates to a human-readable street address and locality.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ address: string; locality: string }> {
  const roundedLat = Math.round(lat * 100000) / 100000;
  const roundedLng = Math.round(lng * 100000) / 100000;

  // 1. Primary: Server reverse geocoding proxy
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${roundedLat}&lng=${roundedLng}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        return {
          address: data.address,
          locality: data.locality || data.city || 'Local Ward',
        };
      }
    }
  } catch (err) {
    console.warn('Server geocode proxy warning:', err);
  }

  // 2. Secondary: BigDataCloud free client reverse geocoder
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLng}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.principalSubdivision || 'Local Ward';
      const city = bdcData.city || bdcData.locality || 'Metro Area';
      const street = bdcData.locality || bdcData.principalSubdivisionDescription || '';
      const formatted = `${street ? `${street}, ` : ''}${city}${
        bdcData.principalSubdivision ? `, ${bdcData.principalSubdivision}` : ''
      }`.trim();
      return {
        address: formatted || `Location near ${city}`,
        locality,
      };
    }
  } catch (err) {
    console.warn('Client geocode warning:', err);
  }

  return {
    address: `GPS Pin: ${roundedLat.toFixed(5)}, ${roundedLng.toFixed(5)}`,
    locality: `Ward (${roundedLat.toFixed(2)}, ${roundedLng.toFixed(2)})`,
  };
}


