import { useState, useRef, useCallback } from 'react';

const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN' };

const useVoiceInput = (lang = 'en') => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const start = useCallback(() => {
    if (!isSupported) { setError('Voice not supported in this browser. Please use Chrome.'); return; }
    setError(null);
    setTranscript('');
    setDuration(0);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = LANG_MAP[lang] || 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (e) => {
      let final = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setTranscript(final || interim);
    };
    recognition.onerror = (e) => { setError('Voice error: ' + e.error); setIsRecording(false); };
    recognition.onend = () => { setIsRecording(false); clearInterval(timerRef.current); };

    recognition.start();
    setIsRecording(true);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, [lang, isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const clear = () => setTranscript('');

  return { isRecording, transcript, error, duration, isSupported, start, stop, clear };
};

export default useVoiceInput;
