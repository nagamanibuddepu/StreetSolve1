/**
 * Voice Hook - Auto-detects working Gemini model at runtime
 * Calls ListModels API to find what's actually available for your key
 * Falls back to browser Speech API if Gemini fails
 */
import { useState, useRef, useCallback } from 'react';

const LANG_NAMES = {
  'en-IN':'English','hi-IN':'Hindi','te-IN':'Telugu',
  'ta-IN':'Tamil','kn-IN':'Kannada','ml-IN':'Malayalam',
};
const BROWSER_OK = ['en-IN','en-US','en-GB','hi-IN'];

// Cache discovered model so we don't call ListModels on every recording
let cachedGeminiModel = null;

async function discoverGeminiModel(apiKey) {
  if (cachedGeminiModel) return cachedGeminiModel;
  
  // Preferred models in order
  const preferred = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest', 
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  try {
    // Ask Google which models this key can use
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    
    if (data.models && Array.isArray(data.models)) {
      // Filter to models that support generateContent
      const available = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      console.log('[Gemini] Available models:', available);
      
      // Pick first preferred model that's available
      for (const pref of preferred) {
        if (available.some(a => a === pref || a.startsWith(pref))) {
          cachedGeminiModel = pref;
          console.log('[Gemini] Using model:', pref);
          return pref;
        }
      }
      
      // If none of preferred, use first available
      if (available.length > 0) {
        cachedGeminiModel = available[0];
        console.log('[Gemini] Using fallback model:', available[0]);
        return available[0];
      }
    }
  } catch (e) {
    console.warn('[Gemini] ListModels failed:', e.message);
  }

  // Hard fallback - try each manually
  for (const model of preferred) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`,
        { signal: AbortSignal.timeout(4000) }
      );
      const d = await r.json();
      if (!d.error && d.supportedGenerationMethods?.includes('generateContent')) {
        cachedGeminiModel = model;
        console.log('[Gemini] Confirmed model:', model);
        return model;
      }
    } catch {}
  }

  return null; // No model found
}

export const useVoice = ({ onResult, language = 'en-IN' } = {}) => {
  const [isRecording, setIsRecording]   = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [error, setError]               = useState(null);
  const [activeMethod, setActiveMethod] = useState('');
  const [processing, setProcessing]     = useState(false);

  const recRef    = useRef(null);
  const mrRef     = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Browser Speech API
  const tryBrowser = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const rec = new SR();
      rec.lang = language;
      rec.continuous = true;
      rec.interimResults = true;
      let final = '';
      rec.onstart  = () => { setIsRecording(true); setError(null); setTranscript(''); setActiveMethod('browser'); final=''; };
      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
          else interim = e.results[i][0].transcript;
        }
        setTranscript((final + interim).trim());
        if (e.results[e.results.length-1].isFinal && final.trim() && onResult) onResult(final.trim());
      };
      rec.onerror  = (e) => { setIsRecording(false); if (e.error !== 'no-speech') setError('Voice error: ' + e.error); };
      rec.onend    = () => { setIsRecording(false); if (final.trim() && onResult) onResult(final.trim()); };
      recRef.current = rec;
      rec.start();
      return true;
    } catch { return false; }
  }, [language, onResult]);

  // Gemini recording
  const tryGemini = useCallback(async () => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key.includes('your_key')) {
      setError('Add VITE_GEMINI_API_KEY in frontend/.env for multilingual voice.');
      return;
    }

    // Discover working model first
    setTranscript('🔍 Finding compatible AI model...');
    const model = await discoverGeminiModel(key);
    
    if (!model) {
      setTranscript('');
      setError('No compatible Gemini model found for your API key. Check aistudio.google.com for your key\'s allowed models.');
      return;
    }

    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mrRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
      mr.onstart  = () => { setIsRecording(true); setActiveMethod(`gemini/${model}`); setError(null); setTranscript(''); };
      mr.onstop   = async () => {
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
        if (!chunksRef.current.length) { setError('No audio captured. Try again.'); return; }
        await geminiTranscribe(new Blob(chunksRef.current, { type: mime }), mime.split(';')[0], key, model);
      };
      mr.start(200);
    } catch (e) {
      setIsRecording(false);
      setError(e.name === 'NotAllowedError'
        ? 'Microphone blocked. Click the lock icon in browser address bar → allow microphone.'
        : 'Mic error: ' + e.message);
    }
  }, [language]);

  const geminiTranscribe = async (blob, mime, key, model) => {
    setProcessing(true);
    setTranscript('🔄 Transcribing with ' + model + '...');
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result.split(',')[1]);
        reader.onerror   = rej;
        reader.readAsDataURL(blob);
      });

      const langName = LANG_NAMES[language] || language;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: `Transcribe this ${langName} audio. Output ONLY:\nORIGINAL: <transcript in original language>\nENGLISH: <english translation>` },
            { inlineData: { mimeType: mime, data: base64 } },
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
        }),
      });

      const data = await resp.json();

      if (data.error) {
        // If this model failed, clear cache and retry once
        if (data.error.message?.includes('not found') || data.error.message?.includes('not supported')) {
          cachedGeminiModel = null;
          const newModel = await discoverGeminiModel(key);
          if (newModel && newModel !== model) {
            return geminiTranscribe(blob, mime, key, newModel);
          }
        }
        throw new Error(data.error.message);
      }

      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const orig = raw.match(/ORIGINAL:\s*(.+?)(?=\nENGLISH:|$)/si)?.[1]?.trim() || raw;
      const eng  = raw.match(/ENGLISH:\s*(.+?)$/si)?.[1]?.trim() || orig;

      setTranscript(language === 'en-IN' ? eng : `${orig}\n\n[English] ${eng}`);
      if (onResult) onResult(eng);

    } catch (e) {
      setTranscript('');
      setError('Transcription failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = useCallback(async () => {
    setError(null);
    cachedGeminiModel = null; // Reset so we rediscover on each session start (optional)
    if (BROWSER_OK.includes(language)) {
      if (tryBrowser()) return;
    }
    await tryGemini();
  }, [language, tryBrowser, tryGemini]);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    if (mrRef.current?.state === 'recording') mrRef.current.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  }, []);

  return { isRecording, transcript, error, activeMethod, processing, startRecording, stopRecording, setTranscript };
};