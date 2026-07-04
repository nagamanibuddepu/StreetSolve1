import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { statsAPI, issuesAPI, volunteerAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import IssueCard from '../components/issues/IssueCard';
import Avatar from '../components/common/Avatar';
import { StatusBadge, CategoryBadge } from '../components/common/StatusBadge';
import { timeAgo, CATEGORY_CONFIG, STATUS_CONFIG } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const socket   = useSocket();
  const { data: stats, refetch } = useQuery({
    queryKey:['dashboard-stats'],
    queryFn:()=>statsAPI.dashboard().then(r=>r.data.data),
    staleTime:15000,
  });

  // Real-time: refresh dashboard when new issue arrives
  useEffect(() => {
    if (!socket) return;
    socket.on('new:issue', () => refetch());
    socket.on('new:issue:gov', () => refetch());
    socket.on('issue:status:changed', () => refetch());
    return () => { socket.off('new:issue'); socket.off('new:issue:gov'); socket.off('issue:status:changed'); };
  }, [socket, refetch]);

  const role = user?.role;
  if (role === 'government' || role === 'admin') return <GovDashboard stats={stats} navigate={navigate} user={user} socket={socket} refetch={refetch} />;
  if (role === 'volunteer' || role === 'ngo') return <VolunteerDashboard stats={stats} navigate={navigate} refetch={refetch} user={user} />;
  return <CitizenDashboard stats={stats} user={user} navigate={navigate} />;
}

// ── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ segments, size=120, label, sublabel }) {
  const total = segments.reduce((s,g)=>s+g.value, 0) || 1;
  let cum = 0;
  const cx=size/2, cy=size/2, r=size*0.38, ir=size*0.24;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg,i) => {
        const pct = seg.value / total;
        const sa  = cum * 2 * Math.PI - Math.PI/2;
        cum += pct;
        const ea  = cum * 2 * Math.PI - Math.PI/2;
        const lg  = pct > 0.5 ? 1 : 0;
        const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa);
        const x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea);
        const xi1=cx+ir*Math.cos(sa),yi1=cy+ir*Math.sin(sa);
        const xi2=cx+ir*Math.cos(ea),yi2=cy+ir*Math.sin(ea);
        if (seg.value === 0) return null;
        return <path key={i} d={`M${x1},${y1} A${r},${r},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${ir},${ir},0,${lg},0,${xi1},${yi1} Z`} fill={seg.color}/>;
      })}
      {total===0&&<circle cx={cx} cy={cy} r={r} fill="#e2e8f0"/>}
      <circle cx={cx} cy={cy} r={ir-1} fill="white"/>
      <text x={cx} y={cy-2} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e3a5f">{label||total}</text>
      {sublabel&&<text x={cx} y={cy+10} textAnchor="middle" fontSize="7" fill="#94a3b8">{sublabel}</text>}
    </svg>
  );
}

// ── Animated Bar Chart ────────────────────────────────────────────────────────
function BarChart({ data, height=80, showValues=true, colorFn }) {
  const max = Math.max(...data.map(d=>d.value||0), 1);
  return (
    <div className="flex items-end gap-1.5" style={{height: height+32}}>
      {data.map((d,i) => {
        const pct = (d.value||0) / max;
        const color = colorFn ? colorFn(d,i) : (d.color || '#f97316');
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            {showValues && <span className="text-[10px] font-bold text-slate-600">{d.value||0}</span>}
            <motion.div
              initial={{height:0}} animate={{height:`${Math.max(pct*height, d.value>0?4:0)}px`}}
              transition={{duration:0.7,delay:i*0.05,ease:'easeOut'}}
              className="w-full rounded-t-sm cursor-pointer hover:opacity-80 transition-opacity"
              style={{background:color, minHeight: d.value>0 ? 4:0}}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[9px] text-slate-400 text-center leading-tight w-full truncate">{d.icon||''} {d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Trend Line ────────────────────────────────────────────────────────────────
function TrendLine({ data, color='#f97316', height=50 }) {
  if (!data?.length || data.length < 2) return <div className="text-xs text-slate-400 text-center py-4">Insufficient data for trend</div>;
  const max = Math.max(...data.map(d=>d.value||0), 1);
  const w = 280, h = height;
  const pts = data.map((d,i) => `${(i/(data.length-1))*w},${h - (d.value/max)*h}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h+4}`} className="w-full" style={{height}}>
      <defs>
        <linearGradient id={`grad_${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad_${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d,i)=>(
        <circle key={i} cx={(i/(data.length-1))*w} cy={h-(d.value/max)*h} r="3" fill={color} stroke="white" strokeWidth="1.5">
          <title>{d.label}: {d.value}</title>
        </circle>
      ))}
    </svg>
  );
}

// ── Map Heatmap ───────────────────────────────────────────────────────────────
function MapHeatmap({ issues }) {
  if (!issues || issues.length === 0) return <div className="h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">No location data available</div>;

  const validIssues = issues.filter(i => i.location?.coordinates?.length === 2 && !isNaN(i.location.coordinates[0]));
  if (!validIssues.length) return <div className="h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">No valid coordinates found</div>;

  const centerLat = validIssues[0].location.coordinates[1];
  const centerLng = validIssues[0].location.coordinates[0];

  const getColor = (priority) => {
    if (priority === 'critical') return '#dc2626';
    if (priority === 'high') return '#ea580c';
    if (priority === 'medium') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="h-64 rounded-xl overflow-hidden shadow-inner border border-slate-200" style={{ zIndex: 0 }}>
      <MapContainer center={[centerLat, centerLng]} zoom={10} className="w-full h-full" zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />
        {validIssues.map(issue => (
          <CircleMarker
            key={issue._id}
            center={[issue.location.coordinates[1], issue.location.coordinates[0]]}
            radius={issue.priority === 'critical' ? 9 : issue.priority === 'high' ? 7 : 5}
            fillColor={getColor(issue.priority)}
            fillOpacity={0.6}
            color="white"
            weight={1.5}
          >
            <Tooltip>
              <div className="font-bold text-slate-700">{issue.title}</div>
              <div className="text-[10px] text-slate-500 uppercase">{issue.category} · {issue.priority} priority</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

// ── Government Dashboard ──────────────────────────────────────────────────────
function GovDashboard({ stats, navigate, user, socket, refetch }) {
  const [tab, setTab] = useState('overview');
  const [newIssueAlert, setNewIssueAlert] = useState(null);

  const { data: allIssues = [] } = useQuery({
    queryKey:['all-issues-gov'],
    queryFn:()=>issuesAPI.getAll({ limit:500 }).then(r=>r.data.data),
    staleTime:10000, refetchInterval:30000,
  });

  // Real-time new issue alert
  useEffect(() => {
    if (!socket) return;
    socket.on('new:issue:gov', (data) => {
      setNewIssueAlert(data);
      refetch();
      setTimeout(() => setNewIssueAlert(null), 8000);
    });
    return () => socket.off('new:issue:gov');
  }, [socket, refetch]);

  // Computed metrics
  const total    = allIssues.length;
  const pending  = allIssues.filter(i=>['reported','accepted'].includes(i.status)).length;
  const inprog   = allIssues.filter(i=>i.status==='inprogress').length;
  const resolved = allIssues.filter(i=>['completed','verified'].includes(i.status)).length;
  const avgSat   = (() => { const s=allIssues.filter(i=>i.satisfactionScore!=null); return s.length?Math.round(s.reduce((a,b)=>a+(b.satisfactionScore||0),0)/s.length):null; })();
  const critical = allIssues.filter(i=>i.priority==='critical').length;
  const overdue  = allIssues.filter(i=>i.overdue).length;
  const resRate  = total ? Math.round(resolved/total*100) : 0;

  // Category breakdown
  const catData = Object.keys(CATEGORY_CONFIG).map(cat => ({
    label:cat, icon:CATEGORY_CONFIG[cat]?.icon, value:allIssues.filter(i=>i.category===cat).length,
    color: {Roads:'#f59e0b',Sanitation:'#ec4899',Water:'#3b82f6',Electricity:'#f97316',Parks:'#10b981',Drainage:'#06b6d4',Noise:'#8b5cf6',Others:'#64748b'}[cat]||'#64748b',
  })).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);

  // Priority data
  const priData = [
    {label:'Critical',value:allIssues.filter(i=>i.priority==='critical').length,color:'#dc2626'},
    {label:'High',value:allIssues.filter(i=>i.priority==='high').length,color:'#f97316'},
    {label:'Medium',value:allIssues.filter(i=>i.priority==='medium').length,color:'#f59e0b'},
    {label:'Low',value:allIssues.filter(i=>i.priority==='low').length,color:'#10b981'},
  ];

  // Status donut
  const statusDon = [
    {label:'Pending',value:pending,color:'#f59e0b'},
    {label:'In Progress',value:inprog,color:'#8b5cf6'},
    {label:'Resolved',value:resolved,color:'#10b981'},
  ];

  // Department performance
  const deptStats = Object.entries(CATEGORY_CONFIG).map(([cat,cfg]) => {
    const cats = allIssues.filter(i=>i.category===cat);
    const res  = cats.filter(i=>['completed','verified'].includes(i.status)).length;
    return { name:cfg.dept||cat, icon:cfg.icon, total:cats.length, resolved:res, pct:cats.length?Math.round(res/cats.length*100):0 };
  }).filter(d=>d.total>0).sort((a,b)=>b.total-a.total);

  // Top voted (trending)
  const trending = [...allIssues].sort((a,b)=>(b.voteCount||0)-(a.voteCount||0)).slice(0,5);
  const recent   = [...allIssues].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);

  // Area heatmap data (group by city/area)
  const areaMap = {};
  allIssues.forEach(i => {
    const area = i.location?.locality || i.location?.city || 'Unknown';
    areaMap[area] = (areaMap[area]||0)+1;
  });
  const heatmapData = Object.entries(areaMap).sort(([,a],[,b])=>b-a).slice(0,21).map(([label,count])=>({label,count}));

  // Weekly trend (simulated from createdAt)
  const now = Date.now();
  const weeklyTrend = Array.from({length:7},(_,i)=>{
    const day = new Date(now - (6-i)*86400000);
    const label = day.toLocaleDateString('en-IN',{weekday:'short'});
    const value = allIssues.filter(issue => {
      const d = new Date(issue.createdAt);
      return d.toDateString() === day.toDateString();
    }).length;
    return { label, value };
  });

  const TABS = [['overview','📊 Overview'],['departments','🏢 Departments'],['issues','📋 Issues'],['analytics','📈 Analytics']];

  return (
    <main className="page pt-4 animate-fade-up">
      {/* New Issue Alert */}
      <AnimatePresence>
        {newIssueAlert && (
          <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            className="mb-4 bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <div className="font-bold text-orange-800 text-sm">New Issue Reported in Your Area!</div>
              <div className="text-xs text-orange-600 mt-0.5">{newIssueAlert.title || 'A new civic issue needs attention'}</div>
            </div>
            <button onClick={()=>newIssueAlert.issueId&&navigate(`/issues/${newIssueAlert.issueId}`)} className="btn btn-sm btn-primary text-xs">View →</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">🏛️ Government Dashboard</h1>
          <p className="text-xs text-slate-400">Real-time civic intelligence · {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-0.5">Resolution Rate</div>
          <div className="font-display font-bold text-2xl" style={{color:resRate>=70?'#10b981':resRate>=40?'#f59e0b':'#ef4444'}}>{resRate}%</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          {icon:'📋',label:'Total',value:total,color:'text-navy',bg:'bg-slate-50'},
          {icon:'⏳',label:'Pending',value:pending,color:'text-amber-600',bg:'bg-amber-50'},
          {icon:'🔧',label:'Active',value:inprog,color:'text-violet-600',bg:'bg-violet-50'},
          {icon:'✅',label:'Resolved',value:resolved,color:'text-green-600',bg:'bg-green-50'},
          {icon:'🚨',label:'Critical',value:critical,color:'text-red-600',bg:'bg-red-50'},
          {icon:'⭐',label:'Avg Sat.',value:avgSat!=null?`${avgSat}%`:'—',color:avgSat>=70?'text-green-600':'text-red-500',bg:'bg-slate-50'},
        ].map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            className={`${s.bg} rounded-xl p-3 border border-white`}>
            <div className="text-lg mb-0.5">{s.icon}</div>
            <div className={`font-display font-bold text-xl ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-slate-400">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4 overflow-x-auto no-scrollbar gap-0.5">
        {TABS.map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap px-2 ${tab===id?'bg-white text-orange-500 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>{l}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab==='overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Status Distribution</div>
              <div className="flex items-center gap-3">
                <DonutChart segments={statusDon} size={90} label={total} sublabel="issues"/>
                <div className="flex-1 space-y-1.5">
                  {statusDon.map((s,i)=>(
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/>
                      <span className="text-slate-600 flex-1">{s.label}</span>
                      <span className="font-bold text-slate-700">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Priority Split</div>
              <DonutChart segments={priData} size={90} label={total} sublabel="total"/>
              <div className="flex flex-wrap gap-1 mt-2">
                {priData.map((p,i)=>(
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{background:p.color}}/>{p.label}({p.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📈 7-Day Issue Trend</div>
            <TrendLine data={weeklyTrend} color="#f97316" height={60}/>
            <div className="flex justify-between mt-1">
              {weeklyTrend.map((d,i)=><span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
            </div>
          </div>

          {overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="font-bold text-red-700 text-sm mb-2">⚠️ {overdue} Overdue Issues — Immediate Attention Required</div>
              {allIssues.filter(i=>i.overdue).slice(0,3).map(i=>(
                <div key={i._id} className="text-xs text-red-600 cursor-pointer hover:underline py-0.5" onClick={()=>navigate(`/issues/${i._id}`)}>
                  • {i.title}
                </div>
              ))}
            </div>
          )}

          <div className="card flex-1 flex flex-col pt-3 pb-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🏢 Area Frequency Heatmap</div>
            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
              {heatmapData.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No area data available</div>
              ) : (
                heatmapData.slice(0, 8).map((d, i) => {
                  const maxCount = Math.max(...heatmapData.map(x => x.count), 1);
                  const pct = Math.max((d.count / maxCount) * 100, 2);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 line-clamp-1 flex-1 mr-2">{d.label}</span>
                        <span className="font-bold text-orange-600">{d.count} {d.count === 1 ? 'issue' : 'issues'}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.08 }}
                          className="h-full rounded-full bg-orange-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Departments ── */}
      {tab==='departments' && (
        <div className="space-y-3">
          <div className="card mb-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Category Breakdown</div>
            <BarChart data={catData} height={80} colorFn={d=>d.color}/>
          </div>
          {deptStats.map((d,i)=>(
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{d.icon}</span>
                <div className="flex-1">
                  <div className="font-display font-semibold text-sm text-slate-800">{d.name}</div>
                  <div className="text-xs text-slate-400">{d.total} issues · {d.resolved} resolved · {d.total-d.resolved} pending</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm" style={{color:d.pct>=70?'#10b981':d.pct>=40?'#f59e0b':'#ef4444'}}>{d.pct}%</div>
                  <div className="text-[10px] text-slate-400">resolved</div>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{width:0}} animate={{width:`${d.pct}%`}} transition={{duration:0.8,delay:i*0.05}}
                  className="h-full rounded-full" style={{background:d.pct>=70?'#10b981':d.pct>=40?'#f59e0b':'#ef4444'}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Issues ── */}
      {tab==='issues' && (
        <div>
          <div className="font-semibold text-slate-700 text-sm mb-3">Recent Issues ({allIssues.length} total)</div>
          {[...allIssues].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,20).map(issue=>(
            <div key={issue._id} className="card mb-2 p-3.5 cursor-pointer hover:shadow-md transition-all border-l-4"
              style={{borderLeftColor:issue.priority==='critical'?'#dc2626':issue.priority==='high'?'#f97316':'#e2e8f0'}}
              onClick={()=>navigate(`/issues/${issue._id}`)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 line-clamp-1">{issue.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{issue.department||issue.category} · {timeAgo(issue.createdAt)}</div>
                  <div className="text-xs text-slate-400">📍 {issue.location?.formattedAddress||issue.location?.city}</div>
                </div>
                <StatusBadge status={issue.status}/>
              </div>
              {issue.satisfactionScore!=null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{width:`${issue.satisfactionScore}%`,background:issue.satisfactionScore>=70?'#10b981':'#ef4444'}}/>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{issue.satisfactionScore}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab==='analytics' && (
        <div className="space-y-4">
          <div className="card">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📊 Issues by Category (Volume)</div>
            <BarChart data={catData} height={100} colorFn={d=>d.color}/>
          </div>

          <div className="card">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📈 Daily Report Trend (Last 7 Days)</div>
            <TrendLine data={weeklyTrend} color="#1e3a5f" height={70}/>
            <div className="flex justify-between mt-1">
              {weeklyTrend.map((d,i)=><span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🔥 Resolution vs Pending</div>
              <DonutChart segments={[{label:'Resolved',value:resolved,color:'#10b981'},{label:'Pending',value:pending+inprog,color:'#f59e0b'}]} size={100} label={`${resRate}%`} sublabel="resolved"/>
            </div>
            <div className="card">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🏆 Most Voted Issues</div>
              {trending.map((issue,i)=>(
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-1 px-1 rounded" onClick={()=>navigate(`/issues/${issue._id}`)}>
                  <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0"><div className="text-xs font-semibold text-slate-700 line-clamp-1">{issue.title}</div></div>
                  <div className="text-xs font-bold text-orange-500 shrink-0">👍{issue.voteCount||0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">⭐ Satisfaction Scores by Issue</div>
            {allIssues.filter(i=>i.satisfactionScore!=null).slice(0,8).map((issue,i)=>(
              <div key={i} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 line-clamp-1 flex-1 mr-2">{issue.title}</span>
                  <span className="font-bold shrink-0" style={{color:issue.satisfactionScore>=70?'#10b981':'#ef4444'}}>{issue.satisfactionScore}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${issue.satisfactionScore}%`}} transition={{duration:0.8,delay:i*0.08}}
                    className="h-full rounded-full" style={{background:issue.satisfactionScore>=70?'#10b981':issue.satisfactionScore>=50?'#f59e0b':'#ef4444'}}/>
                </div>
              </div>
            ))}
            {!allIssues.some(i=>i.satisfactionScore!=null)&&<div className="text-xs text-slate-400 text-center py-4">No satisfaction data yet</div>}
          </div>

          <div className="card flex-1 flex flex-col">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🗺️ Precise Issue Hotstops</div>
            <MapHeatmap issues={allIssues}/>
          </div>

          <div className="card">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">📋 Priority Distribution</div>
            <BarChart data={priData} height={80} colorFn={d=>d.color}/>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Volunteer Dashboard ────────────────────────────────────────────────────────
function VolunteerDashboard({ stats, navigate, refetch, user }) {
  const [tab, setTab]             = useState('available');
  const [takeModal, setTakeModal] = useState(null);
  const [verifyModal, setVerify]  = useState(false);
  const [verifyForm, setVF]       = useState({ aadhaar:'', currentAddress:'' });
  const [taking, setTaking]       = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { setUser } = useAuthStore();
  const isVerified = user?.volunteerVerified || user?.aadhaarVerified;

  const { data: available=[], refetch: refetchAvail } = useQuery({
    queryKey:['available-issues'],
    queryFn:()=>volunteerAPI.getAvailable({limit:30}).then(r=>r.data.data),
    staleTime:20000,
  });

  const handleTake = async () => {
    if (!takeModal) return; setTaking(true);
    try {
      const { issuesAPI: api } = await import('../services/api');
      await api.take(takeModal._id);
      toast.success('Issue taken! Work on it and mark complete when done.'); setTakeModal(null); refetch?.(); refetchAvail();
    } catch(err){ toast.error(err.message); } finally { setTaking(false); }
  };

  const handleVerify = async () => {
    if (verifyForm.aadhaar.length!==12){ toast.error('Enter valid 12-digit Aadhaar'); return; }
    if (!verifyForm.currentAddress.trim()){ toast.error('Current address required'); return; }
    setVerifying(true);
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.updateProfile({...verifyForm, volunteerVerified:true, aadhaarVerified:true});
      setUser(res.data.data); setVerify(false); toast.success('✅ Verified! You can now take issues.');
    } catch(err){ toast.error(err.message); } finally { setVerifying(false); }
  };

  const activeData = tab==='available' ? available : (stats?.myIssues||[]);

  return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="font-display font-bold text-slate-800 text-xl">🤝 Volunteer Hub</h1><p className="text-xs text-slate-400">Welcome, {user?.name}</p></div>
        {isVerified ? <span className="badge bg-green-100 text-green-700">✅ ID Verified</span>
          : <button onClick={()=>setVerify(true)} className="btn btn-sm btn-outline text-xs">🪪 Verify ID</button>}
      </div>

      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="font-bold text-amber-800 mb-1 text-sm">🪪 ID Verification Required</div>
          <p className="text-xs text-amber-700 mb-2">Verify Aadhaar + address to take issues and prevent fraud.</p>
          <button onClick={()=>setVerify(true)} className="btn btn-sm text-xs bg-amber-600 text-white">Verify Now →</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[{l:'Available',v:available.length,icon:'🔥',c:'text-orange-500'},{l:'Taken',v:stats?.taken||0,icon:'📋',c:'text-navy'},{l:'Resolved',v:stats?.resolved||0,icon:'✅',c:'text-green-600'}].map((s,i)=>(
          <div key={i} className="card text-center py-3"><div className="text-xl">{s.icon}</div><div className={`font-display font-bold text-2xl ${s.c}`}>{s.v}</div><div className="text-xs text-slate-400">{s.l}</div></div>
        ))}
      </div>

      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        {[['available','🔥 Available'],['mine','📋 My Issues']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab===id?'bg-white text-orange-500 shadow-sm':'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {activeData.length===0
        ? <div className="text-center py-10 text-slate-400"><div className="text-4xl mb-2">🎉</div><div>Nothing here yet</div></div>
        : activeData.map(issue=>(
          <div key={issue._id} className="card mb-3 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-sm text-slate-800 line-clamp-2 flex-1">{issue.title}</div>
              <StatusBadge status={issue.status}/>
            </div>
            <div className="flex gap-1.5 mb-2 flex-wrap"><CategoryBadge category={issue.category}/><span className="text-xs text-slate-400">👍{issue.voteCount||0}</span>{issue.priority==='critical'&&<span className="badge bg-red-100 text-red-700">🚨 Critical</span>}</div>
            {issue.location?.formattedAddress&&<div className="text-xs text-slate-400 mb-2">📍 {issue.location.formattedAddress}</div>}
            <div className="flex gap-2">
              {tab==='available'&&<button onClick={()=>{ if(!isVerified){setVerify(true);return;} setTakeModal(issue); }} className="btn btn-sm btn-primary flex-1">🙋 Take Issue</button>}
              {tab==='mine'&&issue.status==='inprogress'&&(
                <button onClick={async()=>{ try{ const {issuesAPI:a}=await import('../services/api'); await a.updateStatus(issue._id,{status:'completed'}); refetch(); toast.success('Marked complete!'); }catch(e){toast.error(e.message);} }} className="btn btn-sm btn-green flex-1">✅ Mark Complete</button>
              )}
              <button onClick={()=>navigate(`/issues/${issue._id}`)} className="btn btn-sm btn-ghost">View →</button>
            </div>
          </div>
        ))
      }

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm" onClick={()=>setVerify(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <h3 className="font-display font-bold text-xl mb-4">🪪 Volunteer Verification</h3>
            <div className="space-y-3 mb-4">
              <div><label className="label">Aadhaar Number *</label><input value={verifyForm.aadhaar} onChange={e=>setVF(f=>({...f,aadhaar:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="12-digit Aadhaar" className="input" maxLength={12}/></div>
              <div><label className="label">Current Address *</label><textarea value={verifyForm.currentAddress} onChange={e=>setVF(f=>({...f,currentAddress:e.target.value}))} placeholder="Full address with pincode" className="input" rows={3}/></div>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">🔒 Stored securely. Not visible publicly. Used only to prevent fraudulent issue take-ups.</div>
            </div>
            <button onClick={handleVerify} disabled={verifying} className="btn btn-primary btn-full btn-lg mb-2">{verifying?'⏳ Verifying...':'✅ Submit Verification'}</button>
            <button onClick={()=>setVerify(false)} className="btn btn-ghost btn-full text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Take Modal */}
      {takeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 backdrop-blur-sm" onClick={()=>setTakeModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8 animate-slide-up" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <div className="text-center mb-4"><div className="text-4xl mb-2">🤝</div><h3 className="font-display font-bold text-xl">Take This Issue?</h3><p className="text-sm text-slate-500 mt-1">You commit to resolving this civic complaint</p></div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <div className="font-semibold text-sm text-slate-800 mb-1">{takeModal.title}</div>
              <div className="text-xs text-slate-400">📍 {takeModal.location?.formattedAddress||takeModal.location?.city}</div>
              <div className="flex gap-1.5 mt-2"><CategoryBadge category={takeModal.category}/><StatusBadge status={takeModal.status}/></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">⚠️ By taking this issue you are responsible for resolving it. The reporter will be notified.</div>
            <button onClick={handleTake} disabled={taking} className="btn btn-primary btn-full btn-lg mb-2">{taking?'⏳...':'✅ Yes, I\'ll Resolve This'}</button>
            <button onClick={()=>setTakeModal(null)} className="btn btn-ghost btn-full text-sm">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Citizen Dashboard ─────────────────────────────────────────────────────────
function CitizenDashboard({ stats, user, navigate }) {
  return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <Avatar name={user?.name} url={user?.avatar?.url} size="lg"/>
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">{user?.name||'Citizen'}</h1>
          <div className="text-sm text-slate-500">{user?.email||user?.phone}</div>
          <span className="badge bg-orange-100 text-orange-700 mt-1">🏘️ Citizen</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[{l:'Reported',v:user?.issuesReported||stats?.reported||0,icon:'📢',c:'text-orange-500'},{l:'Resolved',v:stats?.resolved||0,icon:'✅',c:'text-green-600'},{l:'Voted',v:user?.votesGiven||stats?.voted||0,icon:'👍',c:'text-blue-600'}].map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="card text-center py-3">
            <div className="text-xl">{s.icon}</div><div className={`font-display font-bold text-2xl ${s.c}`}>{s.v}</div><div className="text-xs text-slate-400">{s.l}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex gap-2 mb-5">
        <button onClick={()=>navigate('/report')} className="btn btn-primary flex-1">📢 Report Issue</button>
        <button onClick={()=>navigate('/issues')} className="btn btn-ghost flex-1">📋 Browse</button>
      </div>
      <div className="section-title">📋 My Reported Issues</div>
      {!stats?.myIssues?.length
        ? <div className="text-center py-10 text-slate-400"><div className="text-4xl mb-2">📢</div><div className="font-semibold text-slate-600 mb-1">No issues reported yet</div><button onClick={()=>navigate('/report')} className="btn btn-primary btn-sm mt-2">Report First Issue</button></div>
        : stats.myIssues.map((issue,i)=><IssueCard key={issue._id} issue={issue} compact idx={i}/>)
      }
    </main>
  );
}
