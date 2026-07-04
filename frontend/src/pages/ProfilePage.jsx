import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { LANGUAGES } from '../utils/helpers';
import toast from 'react-hot-toast';

const ROLE_CONFIG = {
  citizen:    { label: 'Citizen',    color: 'bg-orange-100 text-orange-700',  icon: '🏘️' },
  volunteer:  { label: 'Volunteer',  color: 'bg-green-100 text-green-700',    icon: '🤝' },
  ngo:        { label: 'NGO',        color: 'bg-purple-100 text-purple-700',  icon: '🌱' },
  government: { label: 'Government', color: 'bg-blue-100 text-blue-700',      icon: '🏛️' },
  admin:      { label: 'Admin',      color: 'bg-red-100 text-red-700',        icon: '⚙️' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', language: user?.language || 'en' });
  const [loading, setLoading] = useState(false);
  const [showSection, setShowSection] = useState(null);
  
  const [prefForm, setPrefForm] = useState(user?.notificationPrefs || {
    email: true, sms: true, inApp: true, nearbyIssues: true
  });

  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.citizen;
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = async (isPrefs = false) => {
    if (!isPrefs && !form.name.trim()) { toast.error('Name cannot be empty'); return; }
    setLoading(true);
    try {
      const payload = isPrefs ? { notificationPrefs: prefForm } : form;
      const res = await authAPI.updateProfile(payload);
      setUser(res.data.data);
      if (!isPrefs) setEditing(false);
      toast.success(isPrefs ? 'Preferences saved!' : 'Profile updated!');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    logout();
    navigate('/');
    toast.success('Logged out');
  };

  const stats = [
    { icon: '📢', value: user?.issuesReported || 0, label: 'Reported' },
    { icon: '👍', value: user?.votesGiven || 0,    label: 'Voted' },
    { icon: '💬', value: user?.commentsPosted || 0, label: 'Comments' },
  ];

  const menuItems = [
    { icon: '📋', label: 'My Issues', action: () => navigate('/dashboard') },
    { icon: '🔔', label: 'Notifications', action: () => navigate('/notifications') },
    { icon: '🗺️', label: 'Issue Map', action: () => navigate('/map') },
    ...(user?.role === 'volunteer' || user?.role === 'ngo' ? [{ icon: '🤝', label: 'Volunteer Hub', action: () => navigate('/dashboard') }] : []),
    ...(user?.role === 'government' ? [{ icon: '🏛️', label: 'Gov Dashboard', action: () => navigate('/dashboard') }] : []),
  ];

  return (
    <main className="page pt-4 animate-fade-up">
      {/* Profile header card */}
      <div className="bg-navy rounded-2xl p-5 mb-4 text-white">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg">
            {user?.avatar?.url
              ? <img src={user.avatar.url} alt="" className="w-full h-full rounded-2xl object-cover" />
              : initials
            }
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/15 border border-white/25 rounded-lg px-3 py-1.5 text-white font-bold text-lg placeholder-white/50 outline-none focus:border-white/60 mb-1"
                placeholder="Your name"
              />
            ) : (
              <div className="font-display font-bold text-xl text-white leading-tight mb-1">
                {user?.name || 'No name set'}
              </div>
            )}
            <div className="text-white/60 text-xs mb-2 truncate">{user?.email || user?.phone || ''}</div>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${roleCfg.color}`}>
              {roleCfg.icon} {roleCfg.label}
            </span>
          </div>

          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={loading}
            className="shrink-0 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 transition-colors">
            {editing ? (loading ? '⏳' : '✓ Save') : '✏️ Edit'}
          </button>
        </div>

        {editing && (
          <div className="mt-3 space-y-2">
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={2}
              className="w-full bg-white/15 border border-white/25 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 outline-none focus:border-white/50 resize-none"
            />
            <select
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
              className="w-full bg-white/15 border border-white/25 rounded-lg px-3 py-2 text-white text-sm outline-none">
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} style={{ background: '#1e3a5f' }}>{l.native} — {l.label}</option>
              ))}
            </select>
            <button onClick={() => setEditing(false)} className="text-white/50 text-xs hover:text-white/80 transition-colors">Cancel</button>
          </div>
        )}

        {user?.bio && !editing && (
          <p className="text-white/65 text-sm mt-3 leading-relaxed">{user.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card text-center py-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="font-display font-bold text-2xl text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Location */}
      {(user?.location?.city || user?.location?.state) && (
        <div className="card mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">📍</div>
          <div>
            <div className="font-semibold text-sm text-slate-700">
              {[user.location.city, user.location.state].filter(Boolean).join(', ')}
            </div>
            {user.location.pincode && <div className="text-xs text-slate-400">{user.location.pincode}</div>}
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <div className="card mb-4 divide-y divide-slate-100 p-0 overflow-hidden">
        {menuItems.map((m, i) => (
          <button key={i} onClick={m.action}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
            <span className="text-xl w-8 text-center">{m.icon}</span>
            <span className="font-medium text-sm text-slate-700 flex-1">{m.label}</span>
            <span className="text-slate-300 text-lg">›</span>
          </button>
        ))}
      </div>

      {/* Account settings */}
      <div className="card mb-4 divide-y divide-slate-100 p-0 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Settings</span>
        </div>
        
        {/* Notifications */}
        <div>
          <button 
            onClick={() => setShowSection(showSection === 'notif' ? null : 'notif')} 
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
            <span className="text-xl w-8 text-center">🔔</span>
            <span className="font-medium text-sm text-slate-700 flex-1">Notification Preferences</span>
            <span className="text-slate-300 text-lg">{showSection === 'notif' ? '˅' : '›'}</span>
          </button>
          
          <AnimatePresence>
            {showSection === 'notif' && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-50/50">
                <div className="px-4 py-3 space-y-3 border-t border-slate-100">
                  {Object.entries({
                    inApp: 'In-App Notifications',
                    email: 'Email Delivery',
                    sms: 'SMS Updates',
                    nearbyIssues: 'Alerts for Nearby Issues'
                  }).map(([key, label]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">{label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={prefForm[key]} 
                          onChange={(e) => setPrefForm({ ...prefForm, [key]: e.target.checked })} />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  ))}
                  <button onClick={() => handleSave(true)} disabled={loading} className="w-full btn btn-primary btn-sm mt-2">
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Privacy & Security */}
        <div>
          <button 
            onClick={() => setShowSection(showSection === 'privacy' ? null : 'privacy')} 
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
            <span className="text-xl w-8 text-center">🔒</span>
            <span className="font-medium text-sm text-slate-700 flex-1">Privacy & Security</span>
            <span className="text-slate-300 text-lg">{showSection === 'privacy' ? '˅' : '›'}</span>
          </button>
          
          <AnimatePresence>
            {showSection === 'privacy' && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-slate-50/50">
                <div className="px-4 py-4 space-y-3 border-t border-slate-100 text-xs text-slate-600">
                  <p><strong>Data encryption in transit:</strong> StreetSolve encrypts your personal information using state-of-the-art TLS configurations.</p>
                  <p><strong>Identity protection:</strong> If you use the Anonymous toggle when submitting reports, your identity is completely shielded from public view and only accessible to system administrators under strict review conditions.</p>
                  <p><strong>Location tracking:</strong> We only track your exact coordinates at the exact moment you drop an issue pin, or specifically request a location recalculation.</p>
                  <button className="text-orange-600 font-semibold hover:underline mt-2 inline-block">Download Account Data</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors mb-2">
        🚪 Sign Out
      </button>

      <p className="text-center text-xs text-slate-400 pb-4">StreetSolve v1.0 · Civic Governance Platform</p>
    </main>
  );
}
