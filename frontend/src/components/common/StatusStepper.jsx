import { motion } from 'framer-motion';

const STEPS = [
  { key:'reported',   label:'Reported',    icon:'📋', color:'#94a3b8' },
  { key:'accepted',   label:'Accepted',    icon:'✅', color:'#3b82f6' },
  { key:'inprogress', label:'In Progress', icon:'🔧', color:'#8b5cf6' },
  { key:'completed',  label:'Completed',   icon:'🎉', color:'#10b981' },
  { key:'verified',   label:'Verified',    icon:'⭐', color:'#f59e0b' },
];

export default function StatusStepper({ status }) {
  if (status === 'reopened') {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">🔄</div>
        <div>
          <div className="font-semibold text-red-700 text-sm">Issue Reopened</div>
          <div className="text-xs text-red-500">Satisfaction below 70%. Team will re-address.</div>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">❌</div>
        <div>
          <div className="font-semibold text-slate-700 text-sm">Issue Rejected</div>
          <div className="text-xs text-slate-400">This issue was not accepted by the authorities.</div>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex(s => s.key === status);

  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 z-0" />
      <motion.div
        className="absolute top-5 left-5 h-0.5 bg-green-500 z-0 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: currentIdx >= 0 ? currentIdx / (STEPS.length - 1) : 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ width: 'calc(100% - 40px)' }}
      />

      <div className="relative flex justify-between z-10">
        {STEPS.map((step, idx) => {
          const done   = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5" style={{ minWidth: 0 }}>
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 bg-white
                  ${done   ? 'border-green-500 bg-green-500 text-white' :
                    active  ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200' :
                              'border-slate-200 text-slate-300'}`}
              >
                {done ? '✓' : step.icon}
              </motion.div>
              <span className={`text-[10px] font-semibold text-center leading-tight max-w-[52px]
                ${done ? 'text-green-600' : active ? 'text-orange-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
