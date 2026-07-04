/**
 * Geolocation — Google Maps Geocoding (precise) → BigDataCloud → Nominatim
 * maximumAge:0 prevents cached/VPN location
 */
import { useState, useCallback } from 'react';

const reverseGeocode = async (lat, lng) => {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  // PRIMARY: Google Maps Geocoding API (most precise for India)
  if (googleKey && googleKey.length > 10 && !googleKey.includes('your_key')) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&region=IN&key=${googleKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        // Use most specific result (first result is most precise)
        const result = data.results[0];
        const comps = result.address_components;
        const g = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        const gS = (type) => comps.find(c => c.types.includes(type))?.short_name || '';

        const streetNum = g('street_number');
        const route     = g('route');
        const premise   = g('premise') || g('establishment') || g('point_of_interest');
        const sub2      = g('sublocality_level_2');
        const sub1      = g('sublocality_level_1') || g('sublocality');
        const nbhd      = g('neighborhood');
        const city      = g('locality');
        const district  = g('administrative_area_level_2') || g('administrative_area_level_3');
        const state     = g('administrative_area_level_1');
        const pincode   = g('postal_code');
        const country   = gS('country');

        const street = [streetNum, route].filter(Boolean).join(' ');
        const area   = sub2 || sub1 || nbhd;
        const addr   = [premise, street].filter(Boolean).join(', ') || area;

        return {
          formattedAddress: result.formatted_address,
          address: addr, locality: area,
          city, district, state, pincode, country,
          raw: result,
        };
      } else if (data.status === 'REQUEST_DENIED') {
        console.warn('Google Maps API key issue:', data.error_message);
      }
    } catch (e) { console.warn('Google geocode error:', e.message); }
  }

  // SECONDARY: BigDataCloud (free, no key, good India coverage)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d = await res.json();
    if (d && (d.city || d.locality)) {
      const admin = d.localityInfo?.administrative || [];
      const info  = d.localityInfo?.informative || [];
      const building = info.find(i => i.order >= 10)?.name || '';
      const street   = admin.find(a => a.adminLevel >= 9)?.name || '';
      const suburb   = admin.find(a => a.adminLevel === 8)?.name || d.locality || '';
      const city     = d.city || d.principalSubdivision || '';
      const state    = d.principalSubdivision || '';
      const pincode  = d.postcode || '';
      const parts    = [building, street, suburb, city, state, pincode].filter(Boolean);
      return { formattedAddress: parts.join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, address: [building, street].filter(Boolean).join(' ') || suburb, locality: suburb, city, state, pincode, country: 'IN' };
    }
  } catch {}

  // TERTIARY: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
      { headers:{ 'User-Agent':'StreetSolve-CivicApp/1.0' }, signal:AbortSignal.timeout(6000) }
    );
    const d = await res.json();
    if (d?.address) {
      const a = d.address;
      const building = a.amenity||a.building||a.shop||a.tourism||'';
      const road     = a.road||a.pedestrian||a.path||'';
      const houseNum = a.house_number||'';
      const suburb   = a.suburb||a.neighbourhood||a.quarter||'';
      const city     = a.city||a.town||a.municipality||'';
      const state    = a.state||'';
      const pin      = a.postcode||'';
      const street   = [houseNum,road].filter(Boolean).join(' ');
      const parts    = [building,street,suburb,city,state,pin].filter(Boolean);
      return { formattedAddress: parts.join(', ')||d.display_name, address:[building,street].filter(Boolean).join(', ')||suburb, locality:suburb, city, state, pincode:pin, country:'IN' };
    }
  } catch {}

  return { formattedAddress:`${lat.toFixed(5)}, ${lng.toFixed(5)}`, address:'', locality:'', city:'', state:'', pincode:'', country:'IN' };
};

const forwardGeocode = async (address) => {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (googleKey && googleKey.length > 10 && !googleKey.includes('your_key')) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=IN&key=${googleKey}`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const comps = result.address_components;
        const g = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
        return {
          lat, lng, formattedAddress: result.formatted_address,
          address: address, city: g('locality'), state: g('administrative_area_level_1'), pincode: g('postal_code')
        };
      }
    } catch {}
  }

  // Fallback to Nominatim OSM
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&countrycodes=in&limit=1`, { headers: { 'User-Agent':'StreetSolve-CivicApp/1.0' }, signal: AbortSignal.timeout(6000) });
    const d = await res.json();
    if (d && d.length > 0 && d[0].lat && d[0].lon) {
      const { lat, lon, display_name } = d[0];
      return {
        lat: parseFloat(lat), lng: parseFloat(lon), formattedAddress: display_name, address: address,
        city: d[0].address?.city || d[0].address?.town || d[0].address?.county || '',
        state: d[0].address?.state || ''
      };
    }
  } catch {}
  
  return null;
};

const getByIP = async () => {
  try {
    const r = await fetch('https://ipapi.co/json/', { signal:AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d?.latitude && d?.longitude) {
      return { lat:d.latitude, lng:d.longitude, accuracy:5000, byIP:true,
        formattedAddress:[d.city,d.region,d.postal,'India'].filter(Boolean).join(', '),
        address:'', locality:d.city||'', city:d.city||'', state:d.region||'', pincode:d.postal||'', country:'IN' };
    }
  } catch {}
  return null;
};

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return; }
    setLoading(true); setError(null); setLocation(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude:lat, longitude:lng, accuracy } = pos.coords;
        if (accuracy > 2000) {
          const ipLoc = await getByIP();
          if (ipLoc) {
            setLocation(ipLoc);
            setError(`⚠️ GPS accuracy low (±${Math.round(accuracy)}m). Using approximate location. Type exact address below.`);
            setLoading(false); return;
          }
        }
        try {
          const geo = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, accuracy, ...geo });
        } catch {
          setLocation({ lat, lng, accuracy, formattedAddress:`${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
        setLoading(false);
      },
      async (err) => {
        const ipLoc = await getByIP();
        if (ipLoc) { setLocation(ipLoc); setError('Using approximate IP location. Type exact address for precision.'); setLoading(false); return; }
        const msgs = {1:'Location permission denied.',2:'GPS unavailable.',3:'Location timed out.'};
        setError(msgs[err.code]||err.message); setLoading(false);
      },
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  }, []);

  return { location, loading, error, getLocation };
};

export { forwardGeocode };
