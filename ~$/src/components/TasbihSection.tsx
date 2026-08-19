import { useState } from 'react';
import { RotateCcw, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TasbihSection({ isDarkMode }: { isDarkMode: boolean }) {
  const [count, setCount] = useState(0);
  const [goal, setGoal] = useState(33);

  const increment = () => {
    setCount(c => c + 1);
    if (window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-12">
      {/* Goal Selector */}
      <div className={`flex gap-4 backdrop-blur-sm p-2 rounded-2xl border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-emerald-100'}`}>
        {[33, 99, 100, 1000].map(val => (
          <button
            key={val}
            onClick={() => { setGoal(val); reset(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              goal === val 
                ? (isDarkMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') 
                : (isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-emerald-700 hover:bg-emerald-50')
            }`}
          >
            {val}
          </button>
        ))}
      </div>

      {/* Main Counter Button */}
      <div className="relative group">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={increment}
          className={`w-64 h-64 rounded-full flex flex-col items-center justify-center text-white border-[8px] transition-all duration-500 active:rotate-1 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-emerald-700 to-emerald-900 shadow-[0_20px_50px_rgba(5,150,105,0.2)] border-emerald-500/20' 
              : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-[0_20px_50px_rgba(5,150,105,0.3)] border-emerald-400/30'
          }`}
        >
          <span className="text-6xl font-black mb-2 tracking-tighter">
            {count}
          </span>
          <span className={`${isDarkMode ? 'text-emerald-400/60' : 'text-emerald-100/60'} font-medium`}>إضغط للتسبيح</span>
          
          {/* Circular progress visual */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="transparent"
              stroke="white"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - Math.min(count / goal, 1))}
              strokeLinecap="round"
              className="opacity-40 transition-all duration-300"
            />
          </svg>
        </motion.button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <button
          onClick={reset}
          className={`p-4 rounded-2xl border shadow-sm transition-all active:scale-90 ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700' 
              : 'bg-white/80 border-emerald-100 text-emerald-600 hover:bg-emerald-50'
          }`}
          title="إعادة التعيين"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-emerald-800/40'}`}>الهدف</span>
          <span className={`text-2xl font-black transition-colors ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>{goal}</span>
        </div>
      </div>

      {/* Encouragement text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={Math.floor(count / goal)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`font-medium px-6 py-3 rounded-full border transition-colors ${
            isDarkMode 
              ? 'text-emerald-400 bg-emerald-900/20 border-emerald-900' 
              : 'text-emerald-700 bg-emerald-50 border-emerald-100'
          }`}
        >
          {count >= goal ? "ما شاء الله! استمر في الذكر" : "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ"}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
