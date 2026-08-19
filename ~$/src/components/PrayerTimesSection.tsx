import { useState, useEffect } from 'react';
import { Clock, MapPin, Volume2, Music, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrayerTimes } from '../types';

export default function PrayerTimesSection({ isDarkMode }: { isDarkMode: boolean }) {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [location, setLocation] = useState<{ city: string; country: string }>({ city: 'Cairo', country: 'Egypt' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; remaining: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('notification_prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.location) {
          setLocation(prefs.location);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    fetchPrayerTimes();
  }, [location]);

  useEffect(() => {
    if (!times) return;
    
    const interval = setInterval(() => {
      calculateNextPrayer(times);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [times]);

  const fetchPrayerTimes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { city, country } = location;

      const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
      const data = await response.json();
      
      if (data.code === 200) {
        const pTimes = data.data.timings;
        const filteredTimes: PrayerTimes = {
          Fajr: pTimes.Fajr,
          Sunrise: pTimes.Sunrise,
          Dhuhr: pTimes.Dhuhr,
          Asr: pTimes.Asr,
          Maghrib: pTimes.Maghrib,
          Isha: pTimes.Isha,
        };
        setTimes(filteredTimes);
        calculateNextPrayer(filteredTimes);
        
        // Cache for offline
        localStorage.setItem('cached_prayer_times', JSON.stringify({
          date: new Date().toDateString(),
          times: pTimes
        }));
      } else {
        throw new Error('فشل تحميل مواقيت الصلاة');
      }
    } catch (err) {
      // Try cache
      const cached = localStorage.getItem('cached_prayer_times');
      if (cached) {
        const { date, times: pTimes } = JSON.parse(cached);
        if (date === new Date().toDateString()) {
          const filteredTimes: PrayerTimes = {
            Fajr: pTimes.Fajr,
            Sunrise: pTimes.Sunrise,
            Dhuhr: pTimes.Dhuhr,
            Asr: pTimes.Asr,
            Maghrib: pTimes.Maghrib,
            Isha: pTimes.Isha,
          };
          setTimes(filteredTimes);
          calculateNextPrayer(filteredTimes);
          setError(null);
          return;
        }
      }
      setError('تعذر الحصول على مواقيت الصلاة. يرجى التحقق من اتصال الإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextPrayer = (pTimes: PrayerTimes) => {
    const now = new Date();
    const prayers = [
      { name: 'الفجر', time: pTimes.Fajr },
      { name: 'الشروق', time: pTimes.Sunrise },
      { name: 'الظهر', time: pTimes.Dhuhr },
      { name: 'العصر', time: pTimes.Asr },
      { name: 'المغرب', time: pTimes.Maghrib },
      { name: 'العشاء', time: pTimes.Isha },
    ];

    let found = false;
    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setHours(hours, minutes, 0);

      if (prayerDate > now) {
        const diff = prayerDate.getTime() - now.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        
        setNextPrayer({
          name: prayer.name,
          time: prayer.time,
          remaining: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        });
        found = true;
        break;
      }
    }

    if (!found) {
      // Next prayer is tomorrow's Fajr
      const [hours, minutes] = pTimes.Fajr.split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setDate(prayerDate.getDate() + 1);
      prayerDate.setHours(hours, minutes, 0);
      
      const diff = prayerDate.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setNextPrayer({
        name: 'الفجر',
        time: pTimes.Fajr,
        remaining: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      });
    }
  };

  const prayerNames: Record<string, string> = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className={`p-6 rounded-3xl border transition-all duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>مواقيت الصلاة</h2>
              <div className="flex items-center gap-1 text-emerald-500 text-xs mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{location.city}، {location.country}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={fetchPrayerTimes}
            className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
          >
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={loading ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}>
              <Volume2 className="w-5 h-5" />
            </motion.div>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            <p className={isDarkMode ? 'text-slate-400' : 'text-emerald-600'}>جاري تحديث المواقيت...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-500 font-bold">{error}</p>
            <button 
              onClick={fetchPrayerTimes}
              className="mt-4 text-sm font-bold text-emerald-600 hover:underline"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : times && (
          <div className="space-y-6">
            {/* Next Prayer Countdown */}
            <div className={`p-6 rounded-2xl text-center relative overflow-hidden ${isDarkMode ? 'bg-slate-900/50' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'}`}>
              <div className="relative z-10">
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-100'}`}>الصلاة القادمة: {nextPrayer?.name}</p>
                <h3 className="text-4xl font-black mb-1">{nextPrayer?.remaining}</h3>
                <p className="text-xs opacity-80">حان موعدها في {nextPrayer?.time}</p>
              </div>
              {!isDarkMode && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              )}
            </div>

            {/* Prayer Grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(times).map(([key, time]) => {
                const isActive = nextPrayer?.name === prayerNames[key];
                return (
                  <div 
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive 
                        ? (isDarkMode ? 'bg-emerald-600/20 border-emerald-500/50' : 'bg-emerald-50 border-emerald-200 shadow-sm') 
                        : (isDarkMode ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50 border-slate-100')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${isActive ? 'text-emerald-600' : (isDarkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                        {prayerNames[key]}
                      </span>
                      {isActive && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                    </div>
                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Settings Info Banner */}
      <div className={`p-4 rounded-2xl flex items-start gap-3 ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-800'}`}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          يمكنك تفعيل منبه الأذان واختيار صوت المؤذن (مصري أو سعودي) من قسم الإعدادات. سيتم تشغيل الأذان تلقائياً عند دخول وقت الصلاة.
        </p>
      </div>
    </div>
  );
}
