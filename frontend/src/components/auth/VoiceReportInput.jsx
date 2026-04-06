import React from 'react';
import useVoiceInput from '../../hooks/useVoiceInput';

export default function VoiceReportInput({ lang, onTranscript }) {
  const { isRecording, transcript, error, duration, isSupported, start, stop, clear } = useVoiceInput(lang);

  const handleStop = () => {
    stop();
    if (transcript) onTranscript(transcript);
  };

  if (!isSupported) return (
    <div className="text-center py-6 text-sm text-gray-400">
      🎤 Voice input requires Chrome browser. Please type your issue instead.
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <button
        onClick={isRecording ? handleStop : start}
        className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl border-4 transition-all
          ${isRecording
            ? 'bg-red-500 border-red-300 text-white voice-recording shadow-lg scale-110'
            : 'bg-saffron border-saffron/30 text-white hover:scale-105 shadow-saffron'
          }`}
      >
        {isRecording ? '⏹️' : '🎤'}
      </button>

      {isRecording && (
        <div className="text-saffron font-semibold text-sm animate-pulse">
          🔴 Recording... {duration}s – Tap to stop
        </div>
      )}

      {!isRecording && !transcript && (
        <p className="text-sm text-gray-400 text-center">Tap the microphone and speak your issue</p>
      )}

      {transcript && (
        <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recognized Text</span>
            <button onClick={clear} className="text-xs text-saffron font-semibold hover:underline">Clear</button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
          <button onClick={() => onTranscript(transcript)}
            className="mt-3 w-full py-2 bg-civic-green text-white rounded-lg text-sm font-semibold hover:bg-civic-green-light transition-colors">
            ✅ Use This Text
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
