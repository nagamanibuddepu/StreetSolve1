import React from 'react';
import { LANGUAGES } from '../../utils/constants';

export default function LanguageSelector({ selected, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-600 mb-2">🌐 Select Language</label>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => onChange(l.code)}
            className={`p-2.5 rounded-xl border-2 text-center transition-all
              ${selected === l.code ? 'border-saffron bg-saffron/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="font-semibold text-sm" style={{ fontFamily: l.code !== 'en' ? 'Noto Sans Devanagari, sans-serif' : undefined }}>
              {l.native}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{l.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
