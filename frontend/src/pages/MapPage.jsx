/**
 * MapPage — Real-time issue map with category filters, live updates via socket
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { issuesAPI } from '../services/api';
import { StatusBadge, CategoryBadge } from '../components/common/StatusBadge';
import { CATEGORY_CONFIG, timeAgo } from '../utils/helpers';
import { useGeolocation } from '../hooks/useGeolocation';
import { useSocket } from '../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CAT_COLORS = {
  Roads:'#F59E0B', Sanitation:'#EC4899', Water:'#3B82F6',
  Electricity:'#F97316', Parks:'#10B981', Drainage:'#06B6D4',
  Noise:'#8B5CF6', Others:'#64748B',
};

const makeIcon = (category, priority) => {
  const color = CAT_COLORS[category] || '#64748B';
  const icon  = CATEGORY_CONFIG[category]?.icon || '📌';
  const size  = priority === 'critical' ? 38 : priority === 'high' ? 34 : 30;
  return L.divIcon({
    className:'',
    html:`<div style="width:${size}px;height:${size+6}px;display:flex;align-items:flex-start;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
      <div style="width:${size}px;height:${size}px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:${size*0.45}px;line-height:1;">${icon}</span>
      </div>
    </div>`,
    iconSize:[size,size+6], iconAnchor:[size/2,size+6], popupAnchor:[0,-(size+8)],
  });
};

function FlyTo({ location }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo([location.lat, location.lng], 15, { animate:true, duration:1.2 }); }, [location]);
  return null;
}

function LiveMarkerLayer({ issues }) {
  return issues.map(issue => {
    const [lng, lat] = issue.location?.coordinates || [];
    if (!lat || !lng || (Math.abs(lat)<0.01 && Math.abs(lng)<0.01)) return null;
    return (
      <Marker key={issue._id} position={[lat, lng]} icon={makeIcon(issue.category, issue.priority)}>
        <Popup maxWidth={240}>
          <div className="p-1">
            <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:'#0f172a'}}>{issue.title}</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:6}}>📍 {issue.location?.formattedAddress || issue.location?.city}</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>🕐 {timeAgo(issue.createdAt)}</div>
            <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
              <span style={{background:CAT_COLORS[issue.category]+'20',color:CAT_COLORS[issue.category],padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600}}>{issue.category}</span>
              <span style={{background:'#f1f5f9',color:'#475569',padding:'2px 8px',borderRadius:99,fontSize:10,fontWeight:600}}>{issue.status}</span>
              {issue.priority==='critical'&&<span style={{background:'#fee2e2',color:'#dc2626',padding:'2px 6px',borderRadius:99,fontSize:10,fontWeight:700}}>🚨 Critical</span>}
            </div>
            <a href={`/issues/${issue._id}`} style={{display:'block',background:'#f97316',color:'white',padding:'6px 12px',borderRadius:8,textDecoration:'none',fontSize:12,fontWeight:700,textAlign:'center'}}>View Details →</a>
          </div>
        </Popup>
      </Marker>
    );
  });
}

export default function MapPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { location, loading:geoLoading, getLocation } = useGeolocation();
  const [selected, setSelected]     = useState(null);
  const [catFilter, setCatFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch ALL issues, not just 100
  const { data:issues=[], isLoading } = useQuery({
    queryKey:['map-issues'],
    queryFn:()=>issuesAPI.getAll({ limit:500 }).then(r=>r.data.data),
    staleTime:10000,
    refetchInterval:30000, // Auto-refresh every 30s
  });

  // Real-time: map and lists will automatically update since `useSocket.js`
  // calls `queryClient.invalidateQueries(['map-issues'])` on any socket event!
  const socket = useSocket();

  const filtered = issues.filter(i => {
    const [lng, lat] = i.location?.coordinates || [];
    if (!lat || !lng || (Math.abs(lat)<0.01 && Math.abs(lng)<0.01)) return false;
    if (catFilter && i.category !== catFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const allCategories = Object.keys(CAT_COLORS);
  const catCounts = {};
  issues.forEach(i => { catCounts[i.category] = (catCounts[i.category]||0)+1; });

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen bg-slate-50 md:pb-0">
      {/* Header */}
      <div className="bg-navy px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-white font-display font-bold text-lg">🗺️ Issue Map</h1>
            <p className="text-blue-300 text-xs">{filtered.length} issues shown · OpenStreetMap · Live updates</p>
          </div>
          <button onClick={getLocation} disabled={geoLoading}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all shrink-0
              ${location?'bg-green-500 text-white':'bg-orange-500 text-white hover:bg-orange-600'}`}>
            {geoLoading?<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Locating...</>:'📍 My Location'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col-reverse md:flex-row">
        {/* Sidebar (Filters + List) */}
        <div className="w-full md:w-80 lg:w-[400px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-[45vh] md:h-auto">
          {/* Category filters */}
          <div className="border-b border-slate-200 px-4 py-3 shrink-0 overflow-x-auto">
            <div className="flex gap-2 max-w-5xl mx-auto no-scrollbar md:flex-wrap">
              <button onClick={()=>setCatFilter('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${!catFilter?'bg-navy text-white border-navy':'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                All ({issues.filter(i=>{ const [lng,lat]=i.location?.coordinates||[]; return lat&&lng; }).length})
              </button>
              {allCategories.map(cat => (
                <button key={cat} onClick={()=>setCatFilter(catFilter===cat?'':cat)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all ${catFilter===cat?'text-white border-transparent':'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={catFilter===cat?{background:CAT_COLORS[cat]}:{}}>
                  <div className="w-2 h-2 rounded-full" style={{background:catFilter===cat?'white':CAT_COLORS[cat]}}/>
                  {CATEGORY_CONFIG[cat]?.icon} {cat} {catCounts[cat]?`(${catCounts[cat]})`:''} 
                </button>
              ))}
            </div>
          </div>

          {/* Status filter row */}
          <div className="border-b border-slate-100 px-4 py-2 shrink-0 overflow-x-auto bg-slate-50">
            <div className="flex gap-2 max-w-5xl mx-auto no-scrollbar md:flex-wrap">
              {[['','All Status'],['reported','New'],['inprogress','In Progress'],['completed','Done'],['verified','Verified']].map(([v,l])=>(
                <button key={v} onClick={()=>setStatusFilter(v)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all ${statusFilter===v?'bg-orange-100 text-orange-700 border-orange-300':'border-slate-200 text-slate-400 hover:border-slate-300'}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Issue list (Sidebar) */}
          <div className="flex-1 overflow-y-auto w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-slate-700 text-sm">{filtered.length} Issues</h3>
              <button onClick={()=>queryClient.invalidateQueries(['map-issues'])} className="text-xs text-orange-500 font-semibold hover:underline">↻ Refresh</button>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"/>)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">No issues match current filters</div>
            ) : (
              <div className="space-y-2 pb-10">
                {filtered.slice(0,50).map(issue => (
                  <div key={issue._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-100 hover:border-orange-200 shadow-sm transition-all bg-white"
                    onClick={() => { setSelected(issue); navigate(`/issues/${issue._id}`); }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0" style={{background:(CAT_COLORS[issue.category]||'#64748b')+'20'}}>
                      {CATEGORY_CONFIG[issue.category]?.icon||'📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-800 line-clamp-1">{issue.title}</div>
                      <div className="text-[11px] text-slate-400 mb-1">{issue.location?.formattedAddress||issue.location?.city} · {timeAgo(issue.createdAt)}</div>
                      <StatusBadge status={issue.status}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative bg-slate-200 z-[1]">
          <MapContainer
            center={[17.3850, 78.4867]} zoom={12}
            style={{width:'100%',height:'100%'}}
            scrollWheelZoom={true} zoomControl={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
            />
            {location && <FlyTo location={location} />}
            {location && (
              <>
                <Marker position={[location.lat, location.lng]} icon={L.divIcon({className:'',html:`<div style="width:18px;height:18px;background:#1d4ed8;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(29,78,216,0.2)"></div>`,iconSize:[18,18],iconAnchor:[9,9]})}>
                  <Popup><b>📍 Your Location</b><br/><small>{location.formattedAddress}</small></Popup>
                </Marker>
                <Circle center={[location.lat, location.lng]} radius={1000} color="#1d4ed8" fillOpacity={0.05} weight={1}/>
              </>
            )}
            <LiveMarkerLayer issues={filtered} />
          </MapContainer>

          {/* Selected issue popup over map */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}}
                className="absolute bottom-4 left-4 right-4 md:left-[50%] md:right-auto md:-ml-40 md:w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-[1000]">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm text-slate-800 mb-1">{selected.title}</div>
                    <div className="text-xs text-slate-400 mb-2">📍 {selected.location?.formattedAddress || selected.location?.city}</div>
                    <div className="flex gap-1.5 flex-wrap"><CategoryBadge category={selected.category}/><StatusBadge status={selected.status}/></div>
                  </div>
                  <button onClick={()=>setSelected(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl shrink-0 self-start">✕</button>
                </div>
                <button onClick={()=>navigate(`/issues/${selected._id}`)} className="btn btn-primary btn-sm btn-full mt-3">View Full Details →</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
