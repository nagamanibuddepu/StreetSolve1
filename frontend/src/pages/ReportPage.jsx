/**
 * ReportPage - Completely redesigned
 * Clear flow: choose mode → fill details → add location → submit
 * No language confusion, no redundant steps
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { issuesAPI, aiAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useVoice } from '../hooks/useVoice';
import ImageUpload from '../components/forms/ImageUpload';
import { CATEGORY_CONFIG, classifyKeywords, LANGUAGES } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = Object.entries(CATEGORY_CONFIG);

export default function ReportPage() {
  const navigate = useNavigate();
  const { location, loading: geoLoading, error: geoError, getLocation } = useGeolocation();
  const [mode, setMode] = useState(null); // 'text' | 'voice' | 'photo'
  const [lang, setLang] = useState('en');
  const [form, setForm] = useState({ title: '', description: '', category: '' });
  const [files, setFiles] = useState([]);
  const [manualAddress, setManualAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1=mode, 2=content, 3=location, 4=review

  const langCfg = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const { isRecording, transcript, error: voiceErr, processing, activeMethod, startRecording, stopRecording, setTranscript } = useVoice({
    language: langCfg.speechCode,
    onResult: async (text) => {
      // Set description from voice
      setForm(f => ({ ...f, description: text }));
      // Instant keyword classification
      const cat = classifyKeywords(text);
      if (cat) setForm(f => ({ ...f, category: cat }));
      // Auto-generate title from first sentence of transcript
      const firstSentence = text.split(/[.!?।]/)[0].trim();
      const autoTitle = firstSentence.length > 10 && firstSentence.length < 120 ? firstSentence : '';
      if (autoTitle) setForm(f => ({ ...f, title: f.title || autoTitle }));
      // AI classification for better accuracy (async, non-blocking)
      if (text.length > 10) {
        try {
          const res = await aiAPI.classify({ title: autoTitle || text.slice(0, 60), description: text, language: lang });
          const r = res.data.data;
          setAiResult(r);
          if (r.suggestedCategory) setForm(f => ({ ...f, category: f.category || r.suggestedCategory }));
        } catch { /* silent fallback to keyword classification */ }
      }
    },
  });

  const handleDescChange = (val) => {
    setForm(f => ({ ...f, description: val }));
    const cat = classifyKeywords(val);
    if (cat && !form.category) setForm(f => ({ ...f, category: cat }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('Enter an issue title'); return; }
    if (!form.description.trim()) { toast.error('Describe the issue'); return; }
    if (!form.category) { toast.error('Select a category'); return; }
    if (!location && !manualAddress.trim()) { toast.error('Add a location'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('language', lang);
      fd.append('lat', location?.lat || 17.385);
      fd.append('lng', location?.lng || 78.487);
      fd.append('address', location?.address || manualAddress);
      fd.append('city', location?.city || '');
      fd.append('state', location?.state || '');
      fd.append('pincode', location?.pincode || '');
      fd.append('formattedAddress', location?.formattedAddress || manualAddress);
      fd.append('inputMethod', mode === 'photo' ? 'image' : mode || 'text');
      files.forEach(f => fd.append('media', f));
      const res = await issuesAPI.create(fd);
      toast.success('Issue submitted successfully!');
      navigate(`/issues/${res.data.data._id}`);
    } catch (err) { toast.error(err.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const isComplete = form.title && form.description && form.category && (location || manualAddress);

  // ── Step 1: Choose mode ─────────────────────────────────────────────────────
  if (step === 1) return (
    <main className="page pt-4 animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100">←</button>
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">Report a Civic Issue</h1>
          <p className="text-slate-500 text-sm">Choose how you want to report</p>
        </div>
      </div>

      <div className="grid gap-3 mb-6">
        {[
          { id:'text', icon:'✍️', title:'Type your issue', desc:'Write a description in English or your language', color:'bg-blue-50 border-blue-200 text-blue-700' },
          { id:'voice', icon:'🎤', title:'Speak your issue', desc:'Record in Telugu, Hindi, Tamil, Kannada, English or any Indian language', color:'bg-orange-50 border-orange-200 text-orange-700' },
          { id:'photo', icon:'📷', title:'Report with photo', desc:'Upload a photo and add a brief description', color:'bg-green-50 border-green-200 text-green-700' },
        ].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setStep(2); }}
            className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.99] bg-white hover:border-current ${m.color.split(' ').filter(c=>c.startsWith('border')).join(' ')}`}>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${m.color.split(' ').filter(c=>c.startsWith('bg')||c.startsWith('border')).slice(0,1).join(' ')}`}>{m.icon}</div>
            <div>
              <div className="font-display font-bold text-slate-800 text-base">{m.title}</div>
              <div className="text-slate-500 text-sm mt-0.5 leading-relaxed">{m.desc}</div>
            </div>
            <div className="ml-auto text-slate-300 text-xl">›</div>
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <div className="font-semibold mb-1">📌 Note for Voice Users</div>
        You can speak in your regional language — Gemini AI will transcribe and translate it automatically. Make sure to allow microphone access.
      </div>
    </main>
  );

  // ── Step 2: Content ─────────────────────────────────────────────────────────
  if (step === 2) return (
    <main className="page pt-4 animate-fade-up">
      <StepHeader step={2} total={3} title={mode === 'text' ? 'Describe the Issue' : mode === 'voice' ? 'Record Your Complaint' : 'Upload Photos'} onBack={() => setStep(1)} />

      {/* VOICE mode */}
      {mode === 'voice' && (
        <div className="card mb-4">
          <div className="font-display font-semibold text-slate-700 mb-3">🌐 Recording Language</div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={`py-2.5 px-3 rounded-lg border-2 text-center transition-all ${lang === l.code ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="text-sm font-semibold">{l.native}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{l.label}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 py-2">
            <div className="relative">
              {isRecording && <div className="absolute inset-0 rounded-full bg-orange-400/20 pulse-ring" />}
              <button onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl border-4 shadow-lg transition-all
                  ${isRecording ? 'recording border-red-200' : 'bg-orange-500 hover:bg-orange-600 border-orange-300 text-white'}`}>
                {isRecording ? '⏹' : '🎤'}
              </button>
            </div>
            <div className="text-sm text-slate-500 text-center">
              {isRecording ? (
                <span className="text-red-600 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse" />
                  Recording via {activeMethod === 'gemini' ? 'Gemini AI' : 'Browser'}...
                </span>
              ) : processing ? (
                <span className="text-orange-600 font-semibold">🔄 Processing audio...</span>
              ) : 'Tap to start recording'}
            </div>
            {voiceErr && <div className="w-full text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{voiceErr}</div>}
            {transcript && (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-400 mb-1">Recognized:</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{transcript}</div>
                <button onClick={() => { setTranscript(''); setForm(f => ({...f, description:''})); }} className="text-xs text-red-500 mt-2 hover:underline">Clear</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PHOTO mode */}
      {mode === 'photo' && (
        <div className="card mb-4">
          <div className="font-display font-semibold text-slate-700 mb-3">📷 Issue Photos</div>
          <ImageUpload files={files} onChange={setFiles} />
        </div>
      )}

      {/* Title + Description (all modes) */}
      <div className="card mb-4 space-y-4">
        <div>
          <label className="label">Issue Title <span className="text-red-500">*</span></label>
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="e.g. Large pothole on main road near bus stop" className="input" />
        </div>
        <div>
          <label className="label">
            {mode === 'voice' ? 'Voice Transcript (edit if needed)' : 'Description'} <span className="text-red-500">*</span>
          </label>
          <textarea value={form.description} onChange={e => handleDescChange(e.target.value)}
            placeholder={mode === 'voice' ? 'Transcript will appear here after recording...' : 'Describe the issue — what you see, how long it has been there, impact on public'}
            className="input" rows={4} />
        </div>

        {/* Category selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Category <span className="text-red-500">*</span></label>
            {form.category && <span className="text-xs text-blue-600 font-semibold">→ {CATEGORY_CONFIG[form.category]?.dept}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(([k, v]) => (
              <button key={k} onClick={() => setForm(f => ({...f, category: k}))}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-semibold text-left transition-all
                  ${form.category === k ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                <span className="text-lg">{v.icon}</span>{k}
              </button>
            ))}
          </div>
          {form.category && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 font-semibold">
              🏢 This issue will be routed to: {CATEGORY_CONFIG[form.category]?.dept}
            </div>
          )}
        </div>
      </div>

      <button onClick={() => { if (!form.title||!form.description||!form.category) { toast.error('Fill all required fields'); return; } setStep(3); }}
        className="btn btn-primary btn-full btn-lg">Continue: Add Location →</button>
    </main>
  );

  // ── Step 3: Location ─────────────────────────────────────────────────────────
  if (step === 3) return (
    <main className="page pt-4 animate-fade-up">
      <StepHeader step={3} total={3} title="Issue Location" onBack={() => setStep(2)} />

      <div className="card mb-4">
        <p className="text-sm text-slate-600 mb-4">We need the location to route your complaint to the correct Municipal Corporation or Gram Panchayat.</p>

        <button onClick={getLocation} disabled={geoLoading}
          className={`btn btn-full mb-3 ${location && !geoError?.includes('⚠️') ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary'}`}>
          {geoLoading ? <><span className="spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Detecting location...</> : location ? '✅ Location Detected — tap to refresh' : '📍 Detect My Location'}
        </button>

        {geoError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-3">{geoError}</div>
        )}

        {location && (
          <div className={`rounded-xl p-3 mb-3 border ${location.byIP ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <div className={`text-xs font-semibold mb-1 ${location.byIP ? 'text-amber-700' : 'text-green-700'}`}>
              {location.byIP ? '⚠️ Approximate location (IP-based):' : '📍 Detected:'}
            </div>
            <div className="text-sm font-semibold text-slate-800">{location.formattedAddress}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
              {location.accuracy && ` · ±${Math.round(location.accuracy)}m accuracy`}
            </div>
          </div>
        )}

        <div>
          <label className="label">{location ? 'Override / Precise address' : 'Type your address manually'}</label>
          <input value={manualAddress} onChange={e => setManualAddress(e.target.value)}
            placeholder="e.g. Near Ameerpet Metro Station, Hyderabad, 500016"
            className="input" />
          <p className="text-xs text-slate-400 mt-1.5">Include landmark, street name, area, city and pincode for best results</p>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting || !isComplete}
        className="btn btn-primary btn-full btn-lg">
        {submitting ? <><span className="spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Submitting...</> : '🚀 Submit Report'}
      </button>
      {!isComplete && <p className="text-center text-xs text-slate-400 mt-2">Complete all fields above to submit</p>}
    </main>
  );

  return null;
}

function StepHeader({ step, total, title, onBack }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 text-xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100">←</button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-semibold">Step {step} of {total}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${(step/total)*100}%` }} />
          </div>
        </div>
      </div>
      <h1 className="font-display font-bold text-slate-800 text-xl">{title}</h1>
    </div>
  );
}
