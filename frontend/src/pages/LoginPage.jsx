/**
 * LoginPage - Real Google OAuth using GSI SDK (loaded in index.html)
 * Fixed: Google button actually works now
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const METHODS = [
  { id: 'email', icon: '📧', label: 'Email' },
  { id: 'phone', icon: '📱', label: 'Phone OTP' },
  { id: 'govid', icon: '🪪', label: 'Gov ID' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [method, setMethod] = useState('email');
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '', idType: 'aadhaar', idNumber: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const googleBtnRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleConfigured = clientId && !clientId.includes('your_id') && !clientId.includes('your_key');

  // Initialize Google Sign-In button
  useEffect(() => {
    if (!googleConfigured || !googleBtnRef.current) return;

    const initGSI = () => {
      if (!window.google?.accounts?.id) { setTimeout(initGSI, 300); return; }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 400,
        text: 'continue_with',
        logo_alignment: 'left',
      });
    };
    initGSI();
  }, [googleConfigured]);

  const handleGoogleCredential = async (response) => {
    if (!response.credential) return;
    setLoading(true);
    try {
      // Decode JWT payload
      const b64 = response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64 + '=='.slice((b64.length + 2) % 3 === 0 ? 2 : (b64.length + 2) % 3)));
      const res = await authAPI.googleCallback({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
      });
      const { token, user } = res.data;
      localStorage.setItem('ss_token', token);
      setAuth(user, token);
      toast.success(`Welcome, ${user.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Google login failed');
    } finally { setLoading(false); }
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSendOTP = async () => {
    const target = form.phone || form.email;
    if (!target) { toast.error('Enter phone number or email first'); return; }
    setLoading(true);
    try {
      await authAPI.requestOTP({ phone: form.phone || undefined, email: form.email || undefined });
      setOtpSent(true);
      toast.success(`OTP sent to ${target}`);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      let res;
      if (method === 'email') {
        if (!form.email || !form.password) { toast.error('Enter email and password'); setLoading(false); return; }
        res = await authAPI.loginEmail({ email: form.email, password: form.password });
      } else {
        if (!form.otp) { toast.error('Enter OTP first'); setLoading(false); return; }
        res = await authAPI.verifyOTP({
          phone: form.phone || undefined,
          email: form.email || undefined,
          otp: form.otp,
        });
      }
      const { token, user } = res.data;
      localStorage.setItem('ss_token', token);
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-slate-50">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">🏛️</div>
          <h1 className="font-display font-bold text-slate-800 text-2xl">Welcome Back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to StreetSolve</p>
        </motion.div>

        <div className="card">
          {/* Google Sign-In */}
          <div className="mb-4">
            {googleConfigured ? (
              // Renders the official Google button
              <div ref={googleBtnRef} className="w-full flex justify-center" style={{ minHeight: 44 }} />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3 text-center">
                <div className="text-sm font-semibold text-amber-800 mb-1">Google Sign-In — Setup Required</div>
                <p className="text-xs text-amber-700">Add to <code className="bg-amber-100 px-1 rounded">frontend/.env</code>:</p>
                <code className="text-xs text-amber-900 block mt-1 break-all">VITE_GOOGLE_CLIENT_ID=your_client_id</code>
                <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 underline mt-1 inline-block">Get free at console.cloud.google.com →</a>
              </div>
            )}
          </div>

          <div className="divider text-xs text-slate-400 font-medium">or sign in with</div>

          {/* Method tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
            {METHODS.map(m => (
              <button key={m.id} onClick={() => { setMethod(m.id); setOtpSent(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${method === m.id ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={method} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">

              {method === 'email' && (
                <>
                  <div>
                    <label className="label">Email Address</label>
                    <input value={form.email} onChange={e => F('email', e.target.value)} type="email"
                      placeholder="you@example.com" className="input"
                      onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input value={form.password} onChange={e => F('password', e.target.value)}
                        type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input pr-14"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                      <button onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium">
                        {showPass ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {method === 'phone' && (
                <>
                  <div>
                    <label className="label">Phone Number</label>
                    <div className="flex">
                      <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 font-semibold">+91</span>
                      <input value={form.phone} onChange={e => F('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
                        type="tel" placeholder="98765 43210" maxLength={10}
                        className="input rounded-l-none flex-1" />
                    </div>
                  </div>
                  {!otpSent ? (
                    <button onClick={handleSendOTP} disabled={loading || form.phone.length < 10} className="btn btn-outline btn-full">
                      {loading ? '⏳ Sending...' : '📨 Send OTP'}
                    </button>
                  ) : (
                    <div>
                      <label className="label">Enter 6-Digit OTP</label>
                      <input value={form.otp} onChange={e => F('otp', e.target.value.replace(/\D/g,'').slice(0,6))}
                        type="text" maxLength={6} placeholder="• • • • • •"
                        className="input text-center text-xl font-bold tracking-[0.5em]"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                      <button onClick={handleSendOTP} className="text-xs text-orange-500 font-semibold mt-2 w-full text-center hover:underline">Resend OTP</button>
                    </div>
                  )}
                </>
              )}

              {method === 'govid' && (
                <>
                  <div>
                    <label className="label">ID Type</label>
                    <select value={form.idType} onChange={e => F('idType', e.target.value)} className="input">
                      <option value="aadhaar">Aadhaar Number (12 digits)</option>
                      <option value="voter">Voter ID Card</option>
                      <option value="pan">PAN Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">ID Number</label>
                    <input value={form.idNumber} onChange={e => F('idNumber', e.target.value.toUpperCase())}
                      placeholder={form.idType==='aadhaar' ? '1234 5678 9012' : form.idType==='pan' ? 'ABCDE1234F' : 'TGF1234567'}
                      className="input font-mono tracking-wide" />
                  </div>
                  <div>
                    <label className="label">Registered Mobile</label>
                    <div className="flex">
                      <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 font-semibold">+91</span>
                      <input value={form.phone} onChange={e => F('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
                        type="tel" placeholder="Linked mobile" className="input rounded-l-none flex-1" />
                    </div>
                  </div>
                  {!otpSent ? (
                    <button onClick={handleSendOTP} disabled={loading || !form.idNumber} className="btn btn-outline btn-full">📨 Send OTP to Linked Mobile</button>
                  ) : (
                    <div>
                      <label className="label">Enter OTP</label>
                      <input value={form.otp} onChange={e => F('otp', e.target.value.replace(/\D/g,'').slice(0,6))}
                        type="text" maxLength={6} placeholder="• • • • • •"
                        className="input text-center text-xl font-bold tracking-[0.5em]" />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <button onClick={handleLogin} disabled={loading} className="btn btn-secondary btn-full btn-lg mt-4">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              : 'Sign In →'}
          </button>
        </div>

        <p className="text-center text-sm text-slate-400 mt-5">
          New to StreetSolve?{' '}
          <Link to="/register" className="text-orange-500 font-bold hover:underline">Create Account</Link>
        </p>
      </div>
    </main>
  );
}
