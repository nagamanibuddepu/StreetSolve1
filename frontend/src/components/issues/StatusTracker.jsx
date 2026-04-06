import React from 'react';
import { STATUS_STEPS, STATUS_CONFIG } from '../../utils/constants';

export default function StatusTracker({ currentStatus }) {
  const idx = STATUS_STEPS.indexOf(currentStatus);
  const isReopened = currentStatus === 'reopened';

  return (
    <div className="relative">
      {isReopened && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 font-medium flex items-center gap-2">
          🔄 This issue was reopened due to low satisfaction (below 70%)
        </div>
      )}
      <div className="flex items-center">
        {STATUS_STEPS.map((step, i) => {
          const config = STATUS_CONFIG[step];
          const done = i < idx;
          const active = i === idx && !isReopened;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                  ${done ? 'bg-civic-green border-civic-green text-white' : active ? 'border-saffron bg-saffron text-white status-active' : 'border-gray-200 bg-white text-gray-300'}`}>
                  {done ? '✓' : active ? config.icon : i + 1}
                </div>
                <span className={`text-[9px] font-semibold text-center whitespace-nowrap ${done || active ? 'text-gray-700' : 'text-gray-300'}`}>
                  {config.label}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all ${i < idx ? 'bg-civic-green' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
