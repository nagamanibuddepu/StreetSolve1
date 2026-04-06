import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { statsAPI, issuesAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import IssueCard from '../components/issues/IssueCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { data: stats } = useQuery({ queryKey:['global-stats'], queryFn:()=>statsAPI.global().then(r=>r.data.data), staleTime:60000 });
  const { data: issuesData } = useQuery({ queryKey:['home-issues'], queryFn:()=>issuesAPI.getAll({limit:4,sortBy:'votes'}).then(r=>r.data), staleTime:30000 });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div className="bg-blue-900 text-white px-6 py-8 md:rounded-b-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            🇮🇳 AI-Powered Civic Platform
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl leading-tight mb-2">
            Report. Track. Resolve.<br />
            <span className="text-orange-400">Your Voice, Your City.</span>
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-5 max-w-md">
            Report civic issues by voice in your language. Our AI routes your complaint to the right department instantly.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/report')} className="btn bg-orange-500 hover:bg-orange-600 text-white btn-lg shadow-lg shadow-orange-500/20">
              📢 Report an Issue
            </button>
            <button onClick={() => navigate('/issues')} className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20">
              Browse Issues →
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label:'Total Issues', value:stats?.totalIssues||0, icon:'📋', color:'text-orange-500' },
            { label:'Resolved', value:stats?.resolvedIssues||0, icon:'✅', color:'text-green-600' },
            { label:'Citizens', value:stats?.totalUsers||0, icon:'👥', color:'text-blue-700' },
          ].map((s,i) => (
            <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}} className="card text-center py-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value.toLocaleString()}</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="section-title">⚡ Report by</h2>
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          {[
            { icon:'✍️', label:'Text', desc:'Type your issue', mode:'text' },
            { icon:'🎤', label:'Voice', desc:'Speak in any language', mode:'voice' },
            { icon:'📷', label:'Photo', desc:'Upload a photo', mode:'photo' },
          ].map(a => (
            <button key={a.mode} onClick={() => navigate('/report')}
              className="card-hover p-4 text-center group">
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-display font-bold text-sm text-slate-700">{a.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{a.desc}</div>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="card mb-6">
          <h2 className="font-display font-bold text-slate-700 mb-4 flex items-center gap-2 text-base">💡 How StreetSolve Works</h2>
          <div className="space-y-3">
            {[
              { n:'1', icon:'📢', t:'Citizen Reports', d:'Voice, text or photo in any Indian language' },
              { n:'2', icon:'🤖', t:'AI Classifies & Routes', d:'Auto-sent to the right department' },
              { n:'3', icon:'🤝', t:'Volunteer Takes Action', d:'NGO or volunteer resolves the issue' },
              { n:'4', icon:'⭐', t:'Community Verifies', d:'Nearby citizens confirm resolution (70% threshold)' },
            ].map((step,i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shrink-0">{step.n}</div>
                <div>
                  <div className="font-semibold text-sm text-slate-700">{step.icon} {step.t}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending issues */}
        {issuesData?.data?.length > 0 && (
          <>
            <h2 className="section-title">🔥 Trending Issues</h2>
            {issuesData.data.map((issue,i) => <IssueCard key={issue._id} issue={issue} compact idx={i} />)}
            <Link to="/issues" className="btn btn-outline btn-full mb-4">View All Issues →</Link>
          </>
        )}

        {/* CTA for non-logged in */}
        {!isAuthenticated && (
          <div className="bg-blue-900 text-white rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">🏛️</div>
            <h3 className="font-display font-bold text-lg mb-1">Join StreetSolve</h3>
            <p className="text-blue-200 text-sm mb-4">Register to report issues, track complaints, and help your community</p>
            <div className="flex gap-3 justify-center">
              <Link to="/register" className="btn bg-orange-500 hover:bg-orange-600 text-white">Register Free</Link>
              <Link to="/login" className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20">Login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
