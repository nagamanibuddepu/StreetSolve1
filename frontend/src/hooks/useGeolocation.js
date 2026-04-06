/**
 * Geolocation hook
 * - Uses GPS with maximumAge:0 (no cached coords)
 * - If accuracy > 2000m (VPN/bad GPS), falls back to IP geolocation
 * - Reverse geocodes with BigDataCloud (free, no key) → Nominatim fallback
 */
import { useState, useCallback } from 'react';

const reverseGeocode = async (lat, lng) => {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  // Google Maps (most accurate, needs Geocoding API enabled)
  if (googleKey && googleKey.length > 10 && !googleKey.includes('your_key')) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&region=IN&result_type=street_address|sublocality|locality&key=${googleKey}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length) {
        const r = data.results[0];
        const c = r.address_components;
        const g = (t) => c.find(x => x.types.includes(t))?.long_name || '';
        return {
          formattedAddress: r.formatted_address,
          address: [g('street_number'), g('route')].filter(Boolean).join(' ') || g('sublocality_level_2'),
          locality: g('sublocality_level_1') || g('sublocality') || g('neighbourhood'),
          city: g('locality'),
          state: g('administrative_area_level_1'),
          pincode: g('postal_code'),
          country: c.find(x => x.types.includes('country'))?.short_name || '',
        };
      }
    } catch {}
  }

  // BigDataCloud (free, no key, good India coverage - extracts granular area info)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d = await res.json();
    if (d && (d.city || d.locality || d.localityInfo)) {
      // Extract the most specific area info available
      const info = d.localityInfo?.informative || [];
      const admin = d.localityInfo?.administrative || [];
      
      // Get building/landmark if available
      const building = info.find(i => i.order >= 10)?.name || '';
      // Get street/neighbourhood level
      const street = admin.find(a => a.adminLevel >= 9)?.name || info.find(i => i.order >= 8)?.name || '';
      // Get suburb/colony/area
      const suburb = admin.find(a => a.adminLevel === 8)?.name || 
                     admin.find(a => a.adminLevel === 7)?.name ||
                     d.locality || '';
      // Ward/sector
      const ward = admin.find(a => a.adminLevel === 6)?.name || '';
      const city = d.city || d.principalSubdivision || '';
      const state = d.principalSubdivision || '';
      const pincode = d.postcode || '';
      const country = d.countryCode || 'IN';

      // Build specific formatted address
      const addressParts = [building, street, suburb, ward, city, state, pincode].filter(Boolean);
      const formattedAddress = addressParts.join(', ');
      
      return {
        formattedAddress: formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        address: [building, street].filter(Boolean).join(' ') || suburb,
        locality: suburb,
        ward,
        city,
        state,
        pincode,
        country,
      };
    }
  } catch {}

  // Nominatim fallback (OpenStreetMap - very detailed for India)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'StreetSolve-CivicApp/1.0' }, signal: AbortSignal.timeout(7000) }
    );
    const d = await res.json();
    if (d?.address) {
      const a = d.address;
      // Extract most specific details first
      const building   = a.amenity || a.building || a.shop || a.office || a.tourism || '';
      const houseNum   = a.house_number || '';
      const road       = a.road || a.pedestrian || a.path || a.footway || '';
      const suburb     = a.suburb || a.neighbourhood || a.quarter || a.residential || '';
      const village    = a.village || a.hamlet || '';
      const town       = a.town || '';
      const city       = a.city || town || a.municipality || village || '';
      const district   = a.county || a.state_district || '';
      const state      = a.state || '';
      const pincode    = a.postcode || '';
      const cc         = (a.country_code || 'IN').toUpperCase();
      
      const streetAddr = [houseNum, road].filter(Boolean).join(' ');
      // Build from most specific to general
      const parts = [building, streetAddr, suburb, city, district, state, pincode, cc].filter(Boolean);
      const formattedAddress = parts.join(', ');
      
      return {
        formattedAddress,
        address: [building, streetAddr].filter(Boolean).join(', ') || suburb,
        locality: suburb || village,
        city,
        district,
        state,
        pincode,
        country: cc,
      };
    }
  } catch {}

  return { formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, address: '', locality: '', city: '', state: '', pincode: '', country: '' };
};

// IP-based geolocation as fallback when GPS accuracy is terrible
const getLocationByIP = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    const d = await res.json();
    if (d?.latitude && d?.longitude) {
      return {
        lat: d.latitude, lng: d.longitude, accuracy: 5000, byIP: true,
        formattedAddress: [d.city, d.region, d.postal, d.country_name].filter(Boolean).join(', '),
        address: '', locality: d.city || '', city: d.city || '', state: d.region || '',
        pincode: d.postal || '', country: d.country || '',
      };
    }
  } catch {}
  return null;
};

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported by browser.'); return; }
    setLoading(true); setError(null); setLocation(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        // If accuracy is terrible (>3km = likely VPN / emulated), use IP location
        if (accuracy > 3000) {
          const ipLoc = await getLocationByIP();
          if (ipLoc) {
            setLocation(ipLoc);
            setError(`⚠️ GPS accuracy low (±${Math.round(accuracy/1000)}km). Using approximate IP location instead. Please type the exact address below.`);
            setLoading(false);
            return;
          }
        }
        try {
          const geo = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, accuracy, ...geo });
        } catch {
          setLocation({ lat, lng, accuracy, formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
        setLoading(false);
      },
      async (err) => {
        // Try IP fallback on error
        const ipLoc = await getLocationByIP();
        if (ipLoc) {
          setLocation(ipLoc);
          setError('Using approximate IP location. Please type exact address below.');
          setLoading(false);
          return;
        }
        const msgs = { 1: 'Location permission denied. Please type your address.', 2: 'GPS unavailable.', 3: 'Location timed out.' };
        setError(msgs[err.code] || err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  return { location, loading, error, getLocation };
};
