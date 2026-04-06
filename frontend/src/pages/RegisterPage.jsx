import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';

const ROLES = [
  { id:'citizen',    icon:'🏘️', label:'Citizen',         desc:'Report and track civic issues' },
  { id:'volunteer',  icon:'🤝', label:'Volunteer',       desc:'Help resolve community issues' },
  { id:'ngo',        icon:'🌱', label:'NGO / Group',     desc:'Organization working for community' },
  { id:'government', icon:'🏛️', label:'Government Body', desc:'Municipal / Gram Panchayat official' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const { location, loading: geoLoading, getLocation } = useGeolocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name:'', email:'', phone:'', password:'', confirmPassword:'',
    role:'citizen', city:'', state:'', pincode:'', orgName:'', language:'en',
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  const sendVerificationOTP = async () => {
    if (!form.phone && !form.email) { toast.error('Enter phone or email first'); return; }
    setLoading(true);
    try {
      await authAPI.requestOTP({ phone: form.phone || undefined, email: form.email || undefined });
      setOtpSent(true);
      toast.success(`OTP sent to ${form.phone || form.email}`);
    } catch(err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.email && !form.phone) { toast.error('Email or phone required'); return; }
    if (form.password && form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password && form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email || undefined,
        phone: form.phone || undefined, password: form.password || undefined,
        role: form.role, city: form.city, state: form.state, pincode: form.pincode,
        language: form.language,
        lat: location?.lat, lng: location?.lng,
        organizationName: form.orgName || undefined,
      };
      const res = await authAPI.register(payload);
      const { token, user } = res.data;
      localStorage.setItem('ss_token', token);
      setAuth(user, token);
      toast.success(`Welcome to StreetSolve, ${user.name}! 🎉`);
      navigate('/');
    } catch(err) { toast.error(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const steps = ['Role', 'Details', 'Location', 'Verify'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Fixed header */}
      <div className="bg-navy px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-lg">🏛️</div>
        <div>
          <div className="text-white font-display font-bold text-sm">StreetSolve</div>
          <div className="text-orange-300 text-[9px] uppercase tracking-widest">Create Account</div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-6 pb-24">

          {/* Progress */}
          <div className="flex items-center gap-1 mb-6">
            {steps.map((s,i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {i < step ? '✓' : i+1}
                </div>
                <div className={`text-[10px] font-semibold hidden sm:block ${i===step?'text-orange-500':'text-slate-400'}`}>{s}</div>
                {i < steps.length-1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* Step 0: Role */}
            {step === 0 && (
              <motion.div key="role" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
                <h2 className="font-display font-bold text-slate-800 text-xl mb-1">Choose your role</h2>
                <p className="text-slate-500 text-sm mb-4">How will you use StreetSolve?</p>
                <div className="space-y-2.5 mb-5">
                  {ROLES.map(r => (
                    <button key={r.id} onClick={() => F('role', r.id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${form.role===r.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <div className="font-display font-bold text-sm text-slate-800">{r.label}</div>
                        <div className="text-xs text-slate-500">{r.desc}</div>
                      </div>
                      {form.role===r.id && <span className="ml-auto text-orange-500 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(1)} className="btn btn-primary btn-full btn-lg">Continue →</button>
              </motion.div>
            )}

            {/* Step 1: Details */}
            {step === 1 && (
              <motion.div key="details" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-3">
                <h2 className="font-display font-bold text-slate-800 text-xl mb-4">Personal details</h2>
                <div>
                  <label className="label">Full Name *</label>
                  <input value={form.name} onChange={e=>F('name',e.target.value)} placeholder="Your full name" className="input" />
                </div>
                <div>
                  <label className="label">Mobile Number *</label>
                  <div className="flex">
                    <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm font-semibold text-slate-600">+91</span>
                    <input value={form.phone} onChange={e=>F('phone',e.target.value.replace(/\D/g,'').slice(0,10))}
                      type="tel" maxLength={10} placeholder="98765 43210" className="input rounded-l-none flex-1" />
                  </div>
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input value={form.email} onChange={e=>F('email',e.target.value)} type="email" placeholder="you@example.com" className="input" />
                </div>
                <div>
                  <label className="label">Password (min 8 chars)</label>
                  <input value={form.password} onChange={e=>F('password',e.target.value)} type="password" placeholder="Create a strong password" className="input" />
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input value={form.confirmPassword} onChange={e=>F('confirmPassword',e.target.value)} type="password" placeholder="Repeat password" className="input" />
                </div>
                {(form.role==='ngo'||form.role==='volunteer') && (
                  <div>
                    <label className="label">Organization Name</label>
                    <input value={form.orgName} onChange={e=>F('orgName',e.target.value)} placeholder="e.g. Green Earth NGO" className="input" />
                  </div>
                )}
                <div>
                  <label className="label">Preferred Language</label>
                  <select value={form.language} onChange={e=>F('language',e.target.value)} className="input">
                    {[['en','English'],['hi','हिंदी'],['te','తెలుగు'],['ta','தமிழ்'],['kn','ಕನ್ನಡ'],['ml','മലയാളം']].map(([c,n])=>(
                      <option key={c} value={c}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>setStep(0)} className="btn btn-ghost flex-1">← Back</button>
                  <button onClick={()=>{ if(!form.name||(!form.email&&!form.phone)){toast.error('Name and phone/email required');return;} setStep(2); }} className="btn btn-primary flex-1">Continue →</button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location */}
            {step === 2 && (
              <motion.div key="location" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-3">
                <h2 className="font-display font-bold text-slate-800 text-xl mb-4">Your location</h2>
                <button onClick={getLocation} disabled={geoLoading}
                  className={`btn btn-full ${location?'bg-green-600 hover:bg-green-700 text-white':'btn-primary'}`}>
                  {geoLoading ? '⏳ Detecting...' : location ? '✅ Location Detected' : '📍 Auto-Detect Location'}
                </button>
                {location && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                    <div className="font-semibold text-green-700 mb-0.5">📍 Detected:</div>
                    <div className="text-slate-700">{location.formattedAddress}</div>
                  </div>
                )}
                <div>
                  <label className="label">City *</label>
                  <input value={form.city} onChange={e=>F('city',e.target.value)} placeholder="e.g. Hyderabad" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">State</label>
                    <input value={form.state} onChange={e=>F('state',e.target.value)} placeholder="Telangana" className="input" />
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input value={form.pincode} onChange={e=>F('pincode',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="500001" className="input" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>setStep(1)} className="btn btn-ghost flex-1">← Back</button>
                  <button onClick={()=>{ if(!form.city){toast.error('City is required');return;} setStep(3); }} className="btn btn-primary flex-1">Continue →</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Verify & Submit */}
            {step === 3 && (
              <motion.div key="verify" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
                <h2 className="font-display font-bold text-slate-800 text-xl mb-1">Verify & Create Account</h2>
                <p className="text-slate-500 text-sm mb-4">Optional: verify your {form.phone ? 'phone' : 'email'} with OTP</p>

                {/* Summary */}
                <div className="card mb-4 space-y-2 text-sm">
                  {[
                    ['Name', form.name], ['Role', form.role], 
                    ['Phone', form.phone||'—'], ['Email', form.email||'—'],
                    ['City', form.city], ['State', form.state||'—'],
                  ].map(([l,v]) => (
                    <div key={l} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <span className="text-slate-500 font-medium">{l}</span>
                      <span className="font-semibold text-slate-800">{v}</span>
                    </div>
                  ))}
                </div>

                {/* OTP Verification (optional) */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="font-semibold text-blue-800 mb-2 text-sm">📱 Phone/Email Verification (Optional)</div>
                  {!otpSent ? (
                    <button onClick={sendVerificationOTP} disabled={loading}
                      className="btn btn-sm border border-blue-400 text-blue-700 bg-white hover:bg-blue-50 w-full">
                      {loading ? '⏳ Sending...' : `Send OTP to ${form.phone || form.email}`}
                    </button>
                  ) : (
                    <div>
                      <label className="label text-blue-700">Enter OTP</label>
                      <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                        type="text" maxLength={6} placeholder="• • • • • •"
                        className="input text-center text-xl font-bold tracking-[0.5em] mb-2" />
                      <div className="text-xs text-blue-600 text-center">OTP sent! Enter to verify your account</div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={()=>setStep(2)} className="btn btn-ghost flex-1">← Back</button>
                  <button onClick={handleRegister} disabled={loading} className="btn btn-primary flex-1 btn-lg">
                    {loading ? '⏳ Creating...' : '🚀 Create Account'}
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-3">
                  Already have an account? <Link to="/login" className="text-orange-500 font-bold">Sign In</Link>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
