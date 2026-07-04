import { useState, useRef, useCallback } from 'react';
import { aiAPI } from '../services/api';

const useVoiceInput = (lang = 'en') => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const isSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const start = useCallback(async () => {
    if (!isSupported) { setError('Voice input not supported in this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscript('');
      setError(null);
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        
        setIsProcessing(true);
        try {
          const fd = new FormData();
          fd.append('audio', audioBlob, 'record.webm');
          const res = await aiAPI.transcribe(fd);
          if (res.data.data.text) {
             setTranscript(res.data.data.text);
          }
        } catch (err) {
          setError('Failed to transcribe audio.');
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      setError('Microphone permission denied or an error occurred.');
      console.error(err);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const clear = () => { setTranscript(''); setError(null); };

  return { isRecording, transcript, error, duration, isProcessing, isSupported, start, stop, clear };
};

export default useVoiceInput;
