import { motion } from 'framer-motion';
export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-14 h-14 bg-blue-900 rounded-2xl flex items-center justify-center text-3xl">🏛️</div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-2 h-2 bg-orange-500 rounded-full"
            animate={{ scale:[1,1.5,1] }} transition={{ repeat:Infinity, duration:0.8, delay:i*0.15 }} />
        ))}
      </div>
      <p className="text-slate-400 text-sm font-medium">Loading StreetSolve...</p>
    </div>
  );
}
