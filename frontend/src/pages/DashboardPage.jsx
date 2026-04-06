import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { statsAPI, issuesAPI, volunteerAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import IssueCard from '../components/issues/IssueCard';
import Avatar from '../components/common/Avatar';
import { StatusBadge, CategoryBadge } from '../components/common/StatusBadge';
import { timeAgo, CATEGORY_CONFIG, STATUS_CONFIG } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role;
  const { data: stats, refetch } = useQuery({ queryKey:['dashboard-stats'], queryFn:()=>statsAPI.dashboard().then(r=>r.data.data), staleTime:30000 });

  if (role==='government') return <GovDashboard stats={stats} navigate={navigate} user={user} />;
  if (role==='volunteer'||role==='ngo') return <VolunteerDashboard stats={stats} navigate={navigate} refetch={refetch} user={user} />;
  return <CitizenDashboard stats={stats} user={user} navigate={navigate} />;
}

// ── Mini bar chart component ─────────────────────────────────────────────────
function BarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d,i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[9px] text-slate-500 font-semibold">{d.value}</div>
          <motion.div initial={{height:0}} animate={{height:`${(d.value/max)*64}px`}} transition={{duration:0.6,delay:i*0.05}}
            className="w-full rounded-t-sm min-h-[4px]" style={{background:colorFn?colorFn(d,i):'#f97316'}} />
          <div className="text-[9px] text-slate-400 text-center leading-tight w-full truncate">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Pie/Donut chart ──────────────────────────────────────────────────────────
function DonutChart({ segments, size=80 }) {
  const total = segments.reduce((s,g)=>s+g.value,0)||1;
  let cumulative = 0;
  const cx=size/2, cy=size/2, r=size*0.38, innerR=size*0.22;
  const paths = segments.map((seg,i) => {
    const pct = seg.value/total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI/2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI/2;
    const largeArc = pct > 0.5 ? 1 : 0;
    const x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
    const x2=cx+r*Math.cos(endAngle), y2=cy+r*Math.sin(endAngle);
    const xi1=cx+innerR*Math.cos(startAngle), yi1=cy+innerR*Math.sin(startAngle);
    const xi2=cx+innerR*Math.cos(endAngle), yi2=cy+innerR*Math.sin(endAngle);
    return <path key={i} d={`M${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} L${xi2},${yi2} A${innerR},${innerR},0,${largeArc},0,${xi1},${yi1} Z`} fill={seg.color} opacity={seg.value===0?0.1:1} />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {total===0 ? <circle cx={cx} cy={cy} r={r} fill="#e2e8f0"/> : paths}
      <circle cx={cx} cy={cy} r={innerR-2} fill="white"/>
      <text x={cx} y={cy+2} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#475569">{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="6" fill="#94a3b8">total</text>
    </svg>
  );
}

// ── Government Dashboard ─────────────────────────────────────────────────────
function GovDashboard({ stats, navigate, user }) {
  const [tab, setTab] = useState('overview');
  const { data: allIssues } = useQuery({
    queryKey:['all-issues-gov'],
    queryFn:()=>issuesAPI.getAll({limit:100}).then(r=>r.data.data),
    staleTime:30000,
  });

  const issues = allIssues || stats?.recentIssues || [];
  const depts = stats?.departmentBreakdown || [];

  // Compute stats from actual data
  const total    = issues.length || stats?.total || 0;
  const pending  = issues.filter(i=>['reported','accepted'].includes(i.status)).length || stats?.pending || 0;
  const inprog   = issues.filter(i=>i.status==='inprogress').length || stats?.inprogress || 0;
  const resolved = issues.filter(i=>['completed','verified'].includes(i.status)).length || stats?.resolved || 0;
  const avgSat   = issues.filter(i=>i.satisfactionScore).reduce((s,i)=>s+i.satisfactionScore,0)/Math.max(1,issues.filter(i=>i.satisfactionScore).length);

  // Category breakdown
  const catCounts = {};
  issues.forEach(i=>{ catCounts[i.category]=(catCounts[i.category]||0)+1; });
  const catData = Object.entries(catCounts).map(([k,v])=>({ label:k, value:v, icon:CATEGORY_CONFIG[k]?.icon||'📋' }));

  // Priority breakdown
  const priCounts = { critical:0, high:0, medium:0, low:0 };
  issues.forEach(i=>{ if(i.priority) priCounts[i.priority]=(priCounts[i.priority]||0)+1; });

  // Status donut
  const statusSegments = [
    { label:'Pending', value:pending, color:'#f59e0b' },
    { label:'In Progress', value:inprog, color:'#8b5cf6' },
    { label:'Resolved', value:resolved, color:'#10b981' },
  ];

  // Recent overdue
  const overdue = issues.filter(i=>i.overdue);
  // Trending issues (most voted)
  const trending = [...issues].sort((a,b)=>(b.voteCount||0)-(a.voteCount||0)).slice(0,5);

  const STAT_CARDS = [
    { icon:'📋', label:'Total Issues', value:total, color:'text-slate-700', bg:'bg-slate-50' },
    { icon:'⏳', label:'Pending', value:pending, color:'text-amber-600', bg:'bg-amber-50' },
    { icon:'🔧', label:'In Progress', value:inprog, color:'text-violet-600', bg:'bg-violet-50' },
    { icon:'✅', label:'Resolved', value:resolved, color:'text-green-600', bg:'bg-green-50' },
  ];

  return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">🏛️ Government Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">GHMC · Real-time civic intelligence</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Satisfaction</div>
          <div className="font-display font-bold text-lg" style={{color: avgSat>=70?'#10b981':'#ef4444'}}>
            {avgSat ? Math.round(avgSat)+'%' : '--'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {STAT_CARDS.map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
            className={`${s.bg} rounded-xl p-3.5 border border-slate-100`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 font-medium">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        {[['overview','📊 Overview'],['departments','🏢 Depts'],['issues','📋 Issues'],['analytics','📈 Analytics']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${tab===id?'bg-white text-orange-500 shadow-sm':'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab==='overview' && (
        <div className="space-y-4">
          <div className="card">
            <div className="font-display font-bold text-slate-700 mb-3 text-sm">Issue Status Distribution</div>
            <div className="flex items-center gap-4">
              <DonutChart segments={statusSegments} size={90} />
              <div className="flex-1 space-y-1.5">
                {statusSegments.map((s,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{background:s.color}}/>
                    <span className="text-xs text-slate-600 flex-1">{s.label}</span>
                    <span className="text-xs font-bold text-slate-700">{s.value}</span>
                    <span className="text-xs text-slate-400">({total?Math.round(s.value/total*100):0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="font-display font-bold text-slate-700 mb-3 text-sm">Priority Breakdown</div>
            <BarChart
              data={[
                {label:'Critical', value:priCounts.critical},
                {label:'High', value:priCounts.high},
                {label:'Medium', value:priCounts.medium},
                {label:'Low', value:priCounts.low},
              ]}
              colorFn={(d)=>({Critical:'#ef4444',High:'#f97316',Medium:'#f59e0b',Low:'#10b981'}[d.label]||'#94a3b8')}
            />
          </div>

          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="font-bold text-red-700 text-sm mb-2">⚠️ {overdue.length} Overdue Issues</div>
              {overdue.slice(0,3).map(i=>(
                <div key={i._id} className="text-xs text-red-600 cursor-pointer hover:underline" onClick={()=>navigate(`/issues/${i._id}`)}>
                  • {i.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Departments Tab */}
      {tab==='departments' && (
        <div className="space-y-3">
          {Object.entries(CATEGORY_CONFIG).map(([cat, cfg])=>{
            const catIssues = issues.filter(i=>i.category===cat);
            const catResolved = catIssues.filter(i=>['completed','verified'].includes(i.status)).length;
            const pct = catIssues.length ? Math.round(catResolved/catIssues.length*100) : 0;
            if(catIssues.length===0) return null;
            return (
              <div key={cat} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{cfg.icon}</span>
                  <div className="flex-1">
                    <div className="font-display font-semibold text-sm text-slate-700">{cfg.dept || cat}</div>
                    <div className="text-xs text-slate-400">{catIssues.length} issues · {catResolved} resolved</div>
                  </div>
                  <div className="font-bold text-sm" style={{color:pct>=70?'#10b981':pct>=40?'#f59e0b':'#ef4444'}}>{pct}%</div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8}}
                    className="h-full rounded-full" style={{background:pct>=70?'#10b981':pct>=40?'#f59e0b':'#ef4444'}} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issues Tab */}
      {tab==='issues' && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
            {['all','reported','inprogress','completed'].map(s=>(
              <button key={s} onClick={()=>{}} className="chip text-xs">{s==='all'?'All':STATUS_CONFIG[s]?.label}</button>
            ))}
          </div>
          {[...issues].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,20).map((issue,i)=>(
            <div key={issue._id} className="card mb-2 p-3 cursor-pointer hover:shadow-md transition-all" onClick={()=>navigate(`/issues/${issue._id}`)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-800 line-clamp-1">{issue.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{issue.department||issue.category} · {timeAgo(issue.createdAt)}</div>
                </div>
                <StatusBadge status={issue.status} />
              </div>
              {issue.satisfactionScore!=null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${issue.satisfactionScore}%`,background:issue.satisfactionScore>=70?'#10b981':'#ef4444'}} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{issue.satisfactionScore}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {tab==='analytics' && (
        <div className="space-y-4">
          <div className="card">
            <div className="font-display font-bold text-slate-700 mb-3 text-sm">📊 Issues by Category</div>
            <BarChart data={catData.map(d=>({...d,label:`${d.icon}`}))}
              colorFn={(_,i)=>['#f59e0b','#ec4899','#3b82f6','#f97316','#10b981','#06b6d4','#8b5cf6','#64748b'][i%8]} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {catData.map((d,i)=>(
                <div key={i} className="flex items-center gap-1 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full" style={{background:['#f59e0b','#ec4899','#3b82f6','#f97316','#10b981','#06b6d4','#8b5cf6','#64748b'][i%8]}}/>
                  {d.label} ({d.value})
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="font-display font-bold text-slate-700 mb-3 text-sm">🔥 Most Voted Issues</div>
            {trending.map((issue,i)=>(
              <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 cursor-pointer" onClick={()=>navigate(`/issues/${issue._id}`)}>
                <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-700 line-clamp-1">{issue.title}</div>
                  <div className="text-[10px] text-slate-400">{issue.location?.city}</div>
                </div>
                <div className="text-xs font-bold text-orange-500">👍{issue.voteCount||0}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="font-display font-bold text-slate-700 mb-3 text-sm">⭐ Satisfaction Scores</div>
            {issues.filter(i=>i.satisfactionScore!=null).slice(0,5).map((issue,i)=>(
              <div key={i} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 line-clamp-1 flex-1 mr-2">{issue.title}</span>
                  <span className="font-bold shrink-0" style={{color:issue.satisfactionScore>=70?'#10b981':'#ef4444'}}>{issue.satisfactionScore}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div initial={{width:0}} animate={{width:`${issue.satisfactionScore}%`}} transition={{duration:0.8,delay:i*0.1}}
                    className="h-full rounded-full" style={{background:issue.satisfactionScore>=70?'#10b981':'#ef4444'}} />
                </div>
              </div>
            ))}
            {!issues.some(i=>i.satisfactionScore!=null) && <div className="text-xs text-slate-400 text-center py-4">No feedback received yet</div>}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Volunteer Dashboard ──────────────────────────────────────────────────────
function VolunteerDashboard({ stats, navigate, refetch, user }) {
  const [tab, setTab] = useState('available');
  const [takeModal, setTakeModal] = useState(null);
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ aadhaar:'', currentAddress:'' });
  const [taking, setTaking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { setUser } = useAuthStore();
  const isVerified = user?.volunteerVerified || user?.aadhaarVerified;
  const { data: available, refetch: refetchAvail } = useQuery({
    queryKey:['available-issues'],
    queryFn:()=>volunteerAPI.getAvailable({limit:30}).then(r=>r.data.data),
    staleTime:30000,
  });

  const handleTake = async () => {
    if(!takeModal) return;
    setTaking(true);
    try {
      await (await import('../services/api')).issuesAPI.take(takeModal._id);
      toast.success('Issue taken! Work on it and mark complete when done.');
      setTakeModal(null); refetch?.(); refetchAvail();
    } catch(err) { toast.error(err.message); }
    finally { setTaking(false); }
  };

  const handleVerify = async () => {
    if(verifyForm.aadhaar.length!==12){toast.error('Enter valid 12-digit Aadhaar');return;}
    if(!verifyForm.currentAddress.trim()){toast.error('Current address required');return;}
    setVerifying(true);
    try {
      const { authAPI } = await import('../services/api');
      const res = await authAPI.updateProfile({...verifyForm,volunteerVerified:true,aadhaarVerified:true});
      setUser(res.data.data);
      setVerifyModal(false);
      toast.success('✅ Verified! You can now take issues.');
    } catch(err) { toast.error(err.message); }
    finally { setVerifying(false); }
  };

  const activeData = tab==='available' ? (available||[]) : (stats?.myIssues||[]);

  return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">🤝 Volunteer Hub</h1>
          <p className="text-xs text-slate-400">Welcome, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {isVerified
            ? <span className="badge bg-green-100 text-green-700">✅ Verified</span>
            : <button onClick={()=>setVerifyModal(true)} className="btn btn-sm btn-outline text-xs">🪪 Verify ID</button>
          }
        </div>
      </div>

      {!isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="font-bold text-amber-800 mb-1 text-sm">🪪 ID Verification Required</div>
          <p className="text-xs text-amber-700 mb-2">Verify Aadhaar + address to take issues and prevent fake take-ups.</p>
          <button onClick={()=>setVerifyModal(true)} className="btn btn-sm text-xs bg-amber-600 text-white hover:bg-amber-700">Verify Now →</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[{l:'Available',v:available?.length||0,icon:'🔥',c:'text-orange-500'},{l:'Taken',v:stats?.taken||0,icon:'📋',c:'text-navy'},{l:'Resolved',v:stats?.resolved||0,icon:'✅',c:'text-green-600'}].map((s,i)=>(
          <div key={i} className="card text-center py-3">
            <div className="text-xl">{s.icon}</div>
            <div className={`font-display font-bold text-2xl ${s.c}`}>{s.v}</div>
            <div className="text-xs text-slate-400">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        {[['available','🔥 Available'],['mine','📋 My Issues']].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab===id?'bg-white text-orange-500 shadow-sm':'text-slate-400'}`}>{l}</button>
        ))}
      </div>

      {activeData.length===0
        ? <div className="text-center py-10 text-slate-400"><div className="text-4xl mb-2">🎉</div><div className="font-medium">Nothing here yet</div></div>
        : activeData.map((issue)=>(
          <div key={issue._id} className="card mb-3 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-sm text-slate-800 line-clamp-2 flex-1">{issue.title}</div>
              <StatusBadge status={issue.status} />
            </div>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <CategoryBadge category={issue.category} />
              <span className="text-xs text-slate-400">👍 {issue.voteCount||0}</span>
              {issue.priority==='critical'&&<span className="badge bg-red-100 text-red-700">🚨 Critical</span>}
            </div>
            {issue.location?.formattedAddress && <div className="text-xs text-slate-400 mb-2">📍 {issue.location.formattedAddress}</div>}
            <div className="flex gap-2">
              {tab==='available'&&<button onClick={()=>{ if(!isVerified){setVerifyModal(true);return;} setTakeModal(issue); }} className="btn btn-sm btn-primary flex-1">🙋 Take Issue</button>}
              {tab==='mine'&&issue.status==='inprogress'&&(
                <button onClick={async()=>{
                  try{ const {issuesAPI}=await import('../services/api'); await issuesAPI.updateStatus(issue._id,{status:'completed'}); refetch(); toast.success('Marked complete! Nearby users will rate.'); }
                  catch(e){toast.error(e.message);}
                }} className="btn btn-sm bg-green-600 text-white hover:bg-green-700 flex-1">✅ Mark Complete</button>
              )}
              <button onClick={()=>navigate(`/issues/${issue._id}`)} className="btn btn-sm btn-ghost">View →</button>
            </div>
          </div>
        ))
      }

      {/* Modals */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60" onClick={()=>setVerifyModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <h3 className="font-display font-bold text-xl mb-4">🪪 Volunteer Verification</h3>
            <div className="space-y-3 mb-4">
              <div><label className="label">Aadhaar Number *</label>
                <input value={verifyForm.aadhaar} onChange={e=>setVerifyForm(f=>({...f,aadhaar:e.target.value.replace(/\D/g,'').slice(0,12)}))} placeholder="12-digit Aadhaar" className="input" maxLength={12}/></div>
              <div><label className="label">Current Address *</label>
                <textarea value={verifyForm.currentAddress} onChange={e=>setVerifyForm(f=>({...f,currentAddress:e.target.value}))} placeholder="Full address with pincode" className="input" rows={3}/></div>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">🔒 Stored securely. Not visible publicly. Used only for anti-fraud verification.</div>
            </div>
            <button onClick={handleVerify} disabled={verifying} className="btn btn-primary btn-full btn-lg mb-2">
              {verifying?'⏳ Verifying...':'✅ Submit Verification'}
            </button>
            <button onClick={()=>setVerifyModal(false)} className="btn btn-ghost btn-full text-sm">Cancel</button>
          </div>
        </div>
      )}

      {takeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60" onClick={()=>setTakeModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-8" onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4"/>
            <div className="text-center mb-4"><div className="text-4xl mb-2">🤝</div>
              <h3 className="font-display font-bold text-xl">Take This Issue?</h3>
              <p className="text-sm text-slate-500 mt-1">You commit to resolving this civic issue</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <div className="font-semibold text-sm text-slate-800 mb-1">{takeModal.title}</div>
              <div className="text-xs text-slate-400">📍 {takeModal.location?.formattedAddress||takeModal.location?.city}</div>
              <div className="flex gap-1.5 mt-2"><CategoryBadge category={takeModal.category}/><StatusBadge status={takeModal.status}/></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 mb-4">
              ⚠️ By taking this issue you are responsible for resolving it. The reporter will be notified.
            </div>
            <button onClick={handleTake} disabled={taking} className="btn btn-primary btn-full btn-lg mb-2">
              {taking?'⏳ Taking...':'✅ Yes, I\'ll Resolve This'}
            </button>
            <button onClick={()=>setTakeModal(null)} className="btn btn-ghost btn-full text-sm">Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Citizen Dashboard ────────────────────────────────────────────────────────
function CitizenDashboard({ stats, user, navigate }) {
  return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <Avatar name={user?.name} url={user?.avatar?.url} size="lg" />
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">{user?.name||'Citizen'}</h1>
          <div className="text-sm text-slate-500">{user?.email||user?.phone}</div>
          <span className="badge bg-orange-100 text-orange-700 mt-1">🏘️ Citizen</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          {l:'Reported',v:stats?.reported||user?.issuesReported||0,icon:'📢',c:'text-orange-500'},
          {l:'Resolved',v:stats?.resolved||0,icon:'✅',c:'text-green-600'},
          {l:'Voted',v:stats?.voted||user?.votesGiven||0,icon:'👍',c:'text-blue-600'},
        ].map((s,i)=>(
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} className="card text-center py-3">
            <div className="text-xl">{s.icon}</div>
            <div className={`font-display font-bold text-2xl ${s.c}`}>{s.v}</div>
            <div className="text-xs text-slate-400">{s.l}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={()=>navigate('/report')} className="btn btn-primary flex-1">📢 Report Issue</button>
        <button onClick={()=>navigate('/issues')} className="btn btn-ghost flex-1">📋 Browse</button>
      </div>

      <div className="section-title">📋 My Reported Issues</div>
      {!stats?.myIssues?.length
        ? <div className="text-center py-10 text-slate-400">
            <div className="text-4xl mb-2">📢</div>
            <div className="font-semibold text-slate-600 mb-1">No issues reported yet</div>
            <button onClick={()=>navigate('/report')} className="btn btn-primary btn-sm mt-2">Report First Issue</button>
          </div>
        : stats.myIssues.map((issue,i)=><IssueCard key={issue._id} issue={issue} compact idx={i}/>)
      }
    </main>
  );
}
