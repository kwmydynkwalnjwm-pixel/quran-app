import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, RotateCcw, Check, Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { morningAdhkar, eveningAdhkar } from '../data/adhkar';
import { Dhikr } from '../types';

export default function AdhkarSection({ isDarkMode }: { isDarkMode: boolean }) {
  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>('morning');
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [targetCounts, setTargetCounts] = useState<Record<number, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingDhikrId, setPlayingDhikrId] = useState<number | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const adhkar = activeTab === 'morning' ? morningAdhkar : eveningAdhkar;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleAudio = (item: Dhikr) => {
    // Stop any current TTS (including Salawat reminder)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (playingDhikrId === item.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setPlayingDhikrId(null);
        }
      } else {
        // If it was TTS playing, we already cancelled it
        setPlayingDhikrId(null);
      }
      return;
    }

    // Stop current audio if any
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    if (item.audio) {
      const audio = new Audio(item.audio);
      audio.loop = false;
      audio.muted = isAudioMuted;
      
      audio.onended = () => {
        setPlayingDhikrId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        // Fallback to TTS if audio fails
        speakText(item.text, item.id);
      };

      audioRef.current = audio;
      audio.play();
      setPlayingDhikrId(item.id);
    } else {
      speakText(item.text, item.id);
    }
  };

  const speakText = (text: string, id: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.onend = () => setPlayingDhikrId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingDhikrId(id);
    }
  };

  const handleIncrement = (id: number, max: number) => {
    const current = counts[id] || 0;
    const actualMax = targetCounts[id] || max;
    if (current < actualMax) {
      setCounts({ ...counts, [id]: current + 1 });
      if (window.navigator.vibrate) {
        window.navigator.vibrate(20);
      }
    }
  };

  const adjustTarget = (id: number, currentMax: number, delta: number) => {
    const current = targetCounts[id] || currentMax;
    const next = Math.max(1, current + delta);
    setTargetCounts({ ...targetCounts, [id]: next });
    
    // If current count is now above target, cap it
    if ((counts[id] || 0) > next) {
      setCounts({ ...counts, [id]: next });
    }
  };

  const resetCounts = () => {
    setCounts({});
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className={`flex p-1 rounded-2xl border shadow-sm backdrop-blur-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/50 border-emerald-100'}`}>
        <button
          onClick={() => setActiveTab('morning')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'morning'
              ? 'bg-amber-500 text-white shadow-md'
              : (isDarkMode ? 'text-slate-400 hover:bg-slate-700/50' : 'text-emerald-700 hover:bg-emerald-50')
          }`}
        >
          <Sun className="w-5 h-5" />
          <span className="font-bold">أذكار الصباح</span>
        </button>
        <button
          onClick={() => setActiveTab('evening')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'evening'
              ? (isDarkMode ? 'bg-emerald-700 text-white shadow-md' : 'bg-emerald-800 text-white shadow-md')
              : (isDarkMode ? 'text-slate-400 hover:bg-slate-700/50' : 'text-emerald-700 hover:bg-emerald-50')
          }`}
        >
          <Moon className="w-5 h-5" />
          <span className="font-bold">أذكار المساء</span>
        </button>
      </div>

      {/* Adhkar List */}
      <div className="space-y-4">
        {adhkar.map((item) => {
          const currentCount = counts[item.id] || 0;
          const targetCount = targetCounts[item.id] || item.count;
          const isDone = currentCount === targetCount;

          return (
            <motion.div
              layout
              key={item.id}
              className={`p-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
                isDone 
                  ? (isDarkMode ? 'border-emerald-900 opacity-40' : 'border-emerald-200 opacity-60') 
                  : (isDarkMode ? 'bg-slate-800/80 border-slate-700 shadow-sm' : 'bg-white/80 border-emerald-100 shadow-sm')
              }`}
            >
              <p className={`text-lg leading-relaxed mb-4 text-right transition-colors ${
                isDarkMode ? 'text-slate-200' : 'text-emerald-900'
              }`}>
                {item.text}
              </p>
              
              {item.description && (
                <p className={`text-sm mb-4 text-right p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'text-emerald-400 bg-emerald-900/20' : 'text-emerald-600 bg-emerald-50'
                }`}>
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAudio(item)}
                    className={`p-3 rounded-xl transition-all ${
                      playingDhikrId === item.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : (isDarkMode ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
                    }`}
                    title="استماع"
                  >
                    {playingDhikrId === item.id && ((audioRef.current && !audioRef.current.paused) || (window.speechSynthesis.speaking)) ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className={`p-3 rounded-xl transition-all ${
                      isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-emerald-300 hover:text-emerald-500'
                    }`}
                  >
                    {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 opacity-50" />}
                  </button>
                </div>

                <div
                  onClick={() => handleIncrement(item.id, item.count)}
                  className={`relative flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                    isDone 
                      ? (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-emerald-100 text-emerald-700') 
                      : (isDarkMode ? 'bg-emerald-700 text-white shadow-sm' : 'bg-emerald-600 text-white active:scale-95 shadow-sm')
                  }`}
                >
                  {isDone ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-xl font-bold">{currentCount}</span>
                  )}
                  
                  <div className="flex flex-col items-center border-r border-white/20 pr-3 mr-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustTarget(item.id, item.count, 1); }}
                      className="p-0.5 hover:bg-white/10 rounded"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-medium leading-none">/ {targetCount}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); adjustTarget(item.id, item.count, -1); }}
                      className="p-0.5 hover:bg-white/10 rounded"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Progress overlay */}
                  {!isDone && (
                    <div 
                      className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-400'}`}
                      style={{ width: `${(currentCount / targetCount) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={resetCounts}
        className={`w-full py-4 backdrop-blur-sm border rounded-2xl flex items-center justify-center gap-2 transition-all duration-500 ${
          isDarkMode 
            ? 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800' 
            : 'bg-white/50 border-emerald-100 text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <RotateCcw className="w-4 h-4" />
        <span>إعادة تعيين العدادات</span>
      </button>
    </div>
  );
}
