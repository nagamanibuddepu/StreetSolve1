/**
 * MapPage - Uses react-leaflet (proper React wrapper, no window.L timing issues)
 * react-leaflet is already installed in package.json
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { issuesAPI } from '../services/api';
import { StatusBadge, CategoryBadge } from '../components/common/StatusBadge';
import { CATEGORY_CONFIG, timeAgo } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';

// Fix default Leaflet marker icon (broken in webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CAT_COLORS = {
  Roads: '#F59E0B', Sanitation: '#EC4899', Water: '#3B82F6',
  Electricity: '#F97316', Parks: '#10B981', Drainage: '#06B6D4',
  Noise: '#8B5CF6', Others: '#64748B',
};

// Custom colored marker icon
const makeIcon = (category) => {
  const color = CAT_COLORS[category] || '#64748B';
  const icon = CATEGORY_CONFIG[category]?.icon || '📌';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:34px;height:40px;position:relative;
      display:flex;align-items:flex-start;justify-content:center;">
      <div style="
        width:32px;height:32px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 3px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:14px;line-height:1;">${icon}</span>
      </div>
    </div>`,
    iconSize: [34, 40],
    iconAnchor: [17, 40],
    popupAnchor: [0, -42],
  });
};

// Component to fly to user location (must be inside MapContainer)
function FlyToLocation({ location }) {
  const map = useMap();
  if (location) {
    map.flyTo([location.lat, location.lng], 15, { animate: true, duration: 1.5 });
  }
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const { location, loading: geoLoading, getLocation } = useGeolocation();
  const [selected, setSelected] = useState(null);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['map-issues'],
    queryFn: () => issuesAPI.getAll({ limit: 100 }).then(r => r.data.data),
    staleTime: 30000,
  });

  const validIssues = issues.filter(i => {
    const [lng, lat] = i.location?.coordinates || [];
    return lat && lng && !(Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01);
  });

  return (
    <main className="pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display font-bold text-slate-800 text-xl">🗺️ Issue Map</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              OpenStreetMap · No API key needed · {validIssues.length} issues
            </p>
          </div>
          <button onClick={getLocation} disabled={geoLoading}
            className={`btn btn-sm ${geoLoading ? 'btn-ghost' : 'btn-primary'} flex items-center gap-1.5`}>
            {geoLoading
              ? <><span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Locating...</>
              : <>📍 My Location</>}
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-3 no-scrollbar">
          {Object.entries(CAT_COLORS).slice(0, 6).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {CATEGORY_CONFIG[cat]?.icon} {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Map using react-leaflet - no window.L timing issues */}
      <div className="px-4 max-w-3xl mx-auto">
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 380 }}>
          <MapContainer
            center={[17.3850, 78.4867]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
            />

            {/* Fly to user location when detected */}
            {location && <FlyToLocation location={location} />}

            {/* User location marker */}
            {location && (
              <Marker
                position={[location.lat, location.lng]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:18px;height:18px;background:#1D4ED8;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(29,78,216,0.25);"></div>`,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              >
                <Popup><strong>📍 You are here</strong><br /><small>{location.formattedAddress}</small></Popup>
              </Marker>
            )}

            {/* Issue markers */}
            {validIssues.map(issue => {
              const [lng, lat] = issue.location.coordinates;
              return (
                <Marker
                  key={issue._id}
                  position={[lat, lng]}
                  icon={makeIcon(issue.category)}
                  eventHandlers={{ click: () => setSelected(issue) }}
                >
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{issue.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                        📍 {issue.location?.formattedAddress || issue.location?.city}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>
                          {issue.category}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/issues/${issue._id}`)}
                        style={{ background: '#f97316', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                      >
                        View Details →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Issue list */}
      <div className="px-4 max-w-3xl mx-auto mt-5">
        <h2 className="font-display font-bold text-slate-700 text-base mb-3">
          All Issues <span className="text-slate-400 font-normal text-sm">({validIssues.length})</span>
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : validIssues.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            <div className="font-medium">No issues on map yet</div>
          </div>
        ) : (
          <div className="space-y-2">
            {validIssues.map(issue => {
              const [lng, lat] = issue.location.coordinates;
              return (
                <div key={issue._id}
                  className={`card p-3 cursor-pointer transition-all hover:shadow-md border-2 ${selected?._id === issue._id ? 'border-orange-400' : 'border-transparent hover:border-slate-200'}`}
                  onClick={() => { setSelected(issue); navigate(`/issues/${issue._id}`); }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: (CAT_COLORS[issue.category] || '#64748B') + '20' }}>
                      {CATEGORY_CONFIG[issue.category]?.icon || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 line-clamp-1">{issue.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        📍 {issue.location?.formattedAddress || issue.location?.address || issue.location?.city}
                        {' · '}{timeAgo(issue.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={issue.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
