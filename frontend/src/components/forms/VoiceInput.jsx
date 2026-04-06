import { motion } from 'framer-motion';
import { useVoice } from '../../hooks/useVoice';
import { LANGUAGES } from '../../utils/helpers';

export default function VoiceInput({ onResult, language = 'en', onClear }) {
  const langCfg = LANGUAGES.find(l => l.code === language);
  const { isRecording, transcript, error, startRecording, stopRecording, setTranscript } = useVoice({
    onResult,
    language: langCfg?.speechCode || 'en-IN',
  });

  const clear = () => { setTranscript(''); onClear?.(); };

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="text-sm text-gray-500 font-500 mb-1">
        Speak in <strong className="text-navy">{langCfg?.native || 'English'}</strong>
      </div>

      <div className="relative">
        {isRecording && (
          <motion.div className="absolute inset-0 rounded-full bg-saffron/20"
            animate={{ scale: [1, 1.6, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all border-4
            ${isRecording ? 'recording border-red-300 bg-red-500' : 'bg-gradient-to-br from-saffron to-saffron-dark border-saffron/30 hover:scale-105'}`}>
          {isRecording ? '⏹️' : '🎤'}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center gap-2 text-saffron font-600 text-sm">
          <motion.div className="w-2 h-2 bg-red-500 rounded-full" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
          Recording...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500 text-center px-4 bg-red-50 py-2 rounded-lg">{error}</div>
      )}

      {transcript && (
        <div className="w-full bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed border border-gray-200">
          <div className="text-xs text-gray-400 font-600 mb-1">Recognized:</div>
          {transcript}
          <button onClick={clear} className="mt-2 text-xs text-red-500 hover:underline block">✕ Clear</button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {isRecording ? 'Tap to stop' : 'Tap to start voice input'}
      </p>
    </div>
  );
}
