import { useState, useRef, useCallback } from 'react';
import { aiAPI } from '../services/api';

const BROWSER_LANGS = ['en-IN','en-US','en-GB','hi-IN'];

export const useVoice = ({ onResult, language='en-IN' } = {}) => {
  const [isRecording, setIsRecording]   = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [error, setError]               = useState(null);
  const [activeMethod, setActiveMethod] = useState('');
  const [processing, setProcessing]     = useState(false);
  const recRef=useRef(null), mrRef=useRef(null), chunksRef=useRef([]), streamRef=useRef(null);

  const tryBrowser = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const rec = new SR();
      rec.lang = language; rec.continuous=true; rec.interimResults=true;
      let final='';
      rec.onstart = ()=>{ setIsRecording(true); setError(null); setTranscript(''); setActiveMethod('browser'); final=''; };
      rec.onresult = (e)=>{
        let interim='';
        for(let i=e.resultIndex;i<e.results.length;i++){
          if(e.results[i].isFinal) final+=e.results[i][0].transcript+' ';
          else interim=e.results[i][0].transcript;
        }
        setTranscript((final+interim).trim());
        if(e.results[e.results.length-1].isFinal&&final.trim()&&onResult) onResult(final.trim());
      };
      rec.onerror = (e)=>{ setIsRecording(false); if(e.error!=='no-speech'&&e.error!=='language-not-supported') setError('Try again.'); };
      rec.onend   = ()=>{ setIsRecording(false); if(final.trim()&&onResult) onResult(final.trim()); };
      recRef.current=rec; rec.start(); return true;
    } catch { return false; }
  }, [language, onResult]);

  const tryBackendGroq = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true } });
      streamRef.current=stream; chunksRef.current=[];
      let mime = 'audio/webm';
      let mr;
      try {
        mr = new MediaRecorder(stream, { mimeType: mime });
      } catch (e) {
        mr = new MediaRecorder(stream);
        mime = mr.mimeType || 'audio/webm';
      }
      mrRef.current = mr;
      mr.ondataavailable=(e)=>{ if(e.data?.size>0) chunksRef.current.push(e.data); };
      mr.onstart=()=>{ setIsRecording(true); setActiveMethod('ai'); setError(null); setTranscript(''); };
      mr.onstop=async()=>{
        setIsRecording(false); stream.getTracks().forEach(t=>t.stop());
        if(!chunksRef.current.length){ setError('No audio captured. Try again.'); return; }
        
        setProcessing(true);
        setTranscript('🔄 Transcribing with fast AI...');
        try {
          const blob = new Blob(chunksRef.current, { type: mime });
          const fd = new FormData();
          fd.append('audio', blob, mime.includes('mp4') ? 'report.mp4' : 'report.webm');
          const res = await aiAPI.transcribe(fd);
          const txt = res.data?.data?.text || '';
          setTranscript(txt);
          if (onResult && txt) onResult(txt);
        } catch(e) {
          setTranscript(''); setError('Transcription failed. Please try again or type your issue.');
        } finally {
          setProcessing(false);
        }
      };
      mr.start(200);
    } catch(e) {
      setIsRecording(false);
      setError(e.name==='NotAllowedError'?'Microphone blocked — allow access in your browser.':'Mic error: '+e.message);
    }
  }, [language, onResult]);

  const startRecording = useCallback(async () => {
    setError(null);
    if(BROWSER_LANGS.includes(language)){ if(tryBrowser()) return; }
    await tryBackendGroq();
  }, [language, tryBrowser, tryBackendGroq]);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    if(mrRef.current?.state==='recording') mrRef.current.stop();
    streamRef.current?.getTracks().forEach(t=>t.stop());
    setIsRecording(false);
  }, []);

  return { isRecording, transcript, error, activeMethod, processing, startRecording, stopRecording, setTranscript };
};
