import { useState, useEffect } from 'react';
import { Bell, Clock, Save, CheckCircle2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationPreferences } from '../types';

export default function NotificationSettings({ isDarkMode }: { isDarkMode: boolean }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    quranReminder: { enabled: false, time: '20:00' },
    morningAzkar: { enabled: false, time: '06:00' },
    eveningAzkar: { enabled: false, time: '17:00' },
    salawat: { enabled: false, interval: 300 },
    adhan: { enabled: true, voice: 'saudi' },
    location: { city: 'Cairo', country: 'Egypt' }
  });
  const [showSaved, setShowSaved] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const saved = localStorage.getItem('notification_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPrefs(prev => ({
          ...prev,
          ...parsed,
          quranReminder: { ...prev.quranReminder, ...parsed.quranReminder },
          morningAzkar: { ...prev.morningAzkar, ...parsed.morningAzkar },
          eveningAzkar: { ...prev.eveningAzkar, ...parsed.eveningAzkar },
          salawat: parsed.salawat ? { ...prev.salawat, ...parsed.salawat } : prev.salawat,
          adhan: parsed.adhan ? { ...prev.adhan, ...parsed.adhan } : prev.adhan,
          location: parsed.location ? { ...prev.location, ...parsed.location } : prev.location
        }));
      } catch (e) {
        console.error('Error parsing notification prefs', e);
      }
    }
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  const savePrefs = () => {
    localStorage.setItem('notification_prefs', JSON.stringify(prefs));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
    
    window.dispatchEvent(new Event('notification_prefs_updated'));
    
    if (permission !== 'granted') {
      requestPermission();
    }
  };

  const toggle = (key: keyof Omit<NotificationPreferences, 'salawat' | 'adhan'> | 'salawat' | 'adhan') => {
    setPrefs(prev => {
      const current = prev[key];
      return {
        ...prev,
        [key]: { ...current, enabled: !current.enabled }
      };
    });
  };

  const updateTime = (key: keyof Omit<NotificationPreferences, 'salawat'>, time: string) => {
    setPrefs(prev => ({
      ...prev,
      [key]: { ...prev[key], time }
    }));
  };

  const updateInterval = (val: number, isMin: boolean) => {
    const interval = isMin ? val * 60 : val;
    setPrefs(prev => ({ ...prev, salawat: { ...prev.salawat, interval } }));
  };

  const updateLocation = (key: 'city' | 'country', value: string) => {
    setPrefs(prev => ({
      ...prev,
      location: { ...prev.location, [key]: value }
    }));
  };

  return (
    <div className={`backdrop-blur-sm p-6 rounded-2xl shadow-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100'}`}>
      <div className="flex items-center gap-2 mb-6">
        <Bell className={`w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
        <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>تنبيهات الذكر والعبادة</h2>
      </div>

      <div className="space-y-4">
        <ReminderItem 
          title="تذكير الورد اليومي"
          pref={prefs.quranReminder}
          onToggle={() => toggle('quranReminder')}
          onTimeChange={(t) => updateTime('quranReminder', t)}
          isDarkMode={isDarkMode}
        />
        <ReminderItem 
          title="أذكار الصباح"
          pref={prefs.morningAzkar}
          onToggle={() => toggle('morningAzkar')}
          onTimeChange={(t) => updateTime('morningAzkar', t)}
          isDarkMode={isDarkMode}
        />
        <ReminderItem 
          title="أذكار المساء"
          pref={prefs.eveningAzkar}
          onToggle={() => toggle('eveningAzkar')}
          onTimeChange={(t) => updateTime('eveningAzkar', t)}
          isDarkMode={isDarkMode}
        />

        {/* Adhan Settings */}
        <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-emerald-900'}`}>تنبيه الأذان</span>
              <span className="text-xs text-emerald-500">تشغيل الأذان عند دخول الوقت</span>
            </div>
            <button
              onClick={() => toggle('adhan')}
              className={`relative w-12 h-6 rounded-full transition-colors ${prefs.adhan.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.adhan.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          
          {prefs.adhan.enabled && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-3 overflow-hidden pt-2 border-t border-emerald-100/50 dark:border-slate-800"
            >
              <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-emerald-800'}`}>اختر صوت المؤذن:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPrefs(prev => ({ ...prev, adhan: { ...prev.adhan, voice: 'saudi' } }))}
                  className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                    prefs.adhan.voice === 'saudi' 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-emerald-100 text-emerald-600')
                  }`}
                >
                  صوت سعودي (الحرم)
                </button>
                <button
                  onClick={() => setPrefs(prev => ({ ...prev, adhan: { ...prev.adhan, voice: 'egyptian' } }))}
                  className={`p-2 rounded-lg text-xs font-bold transition-all border ${
                    prefs.adhan.voice === 'egyptian' 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-emerald-100 text-emerald-600')
                  }`}
                >
                  صوت مصري
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-emerald-900'}`}>تذكير الصلاة على النبي</span>
              <span className="text-xs text-emerald-500">تذكير صوتي "صلي على محمد"</span>
            </div>
            <button
              onClick={() => toggle('salawat')}
              className={`relative w-12 h-6 rounded-full transition-colors ${prefs.salawat.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.salawat.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          
          {prefs.salawat.enabled && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-4 overflow-hidden pt-2"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-emerald-500" />
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="5"
                    value={prefs.salawat.interval >= 60 ? Math.floor(prefs.salawat.interval / 60) : prefs.salawat.interval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      updateInterval(val, prefs.salawat.interval >= 60);
                    }}
                    className={`w-20 bg-transparent border-b border-emerald-200 dark:border-slate-700 focus:ring-0 font-bold text-lg text-center ${isDarkMode ? 'text-white' : 'text-emerald-800'}`}
                  />
                  <select 
                    value={prefs.salawat.interval >= 60 ? 'min' : 'sec'}
                    onChange={(e) => {
                      const currentVal = prefs.salawat.interval >= 60 ? Math.floor(prefs.salawat.interval / 60) : prefs.salawat.interval;
                      updateInterval(currentVal, e.target.value === 'min');
                    }}
                    className={`bg-transparent border-none text-sm font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
                  >
                    <option value="sec" className="bg-slate-800">ثانية</option>
                    <option value="min" className="bg-slate-800">دقيقة</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيتم التذكير بالصلاة على النبي كل {prefs.salawat.interval >= 60 ? `${Math.floor(prefs.salawat.interval / 60)} دقيقة` : `${prefs.salawat.interval} ثانية`}
              </p>
            </motion.div>
          )}
        </div>

        {/* Location Settings */}
        <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-emerald-900'}`}>تحديد الموقع (لمواقيت الصلاة)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-bold mr-2">الدولة (بالإنجليزي)</label>
              <input 
                type="text"
                value={prefs.location.country}
                onChange={(e) => updateLocation('country', e.target.value)}
                placeholder="Egypt"
                className={`w-full p-2 rounded-lg text-sm bg-transparent border ${isDarkMode ? 'border-slate-700 text-white' : 'border-emerald-100 text-emerald-900'}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-emerald-500 font-bold mr-2">المدينة (بالإنجليزي)</label>
              <input 
                type="text"
                value={prefs.location.city}
                onChange={(e) => updateLocation('city', e.target.value)}
                placeholder="Cairo"
                className={`w-full p-2 rounded-lg text-sm bg-transparent border ${isDarkMode ? 'border-slate-700 text-white' : 'border-emerald-100 text-emerald-900'}`}
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">يرجى كتابة اسم الدولة والمدينة باللغة الإنجليزية (مثلاً: Egypt, Saudi Arabia, Dubai) لضمان دقة المواقيت.</p>
        </div>

        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={savePrefs}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
          >
            <Save className="w-5 h-5" />
            <span>حفظ الإعدادات</span>
          </button>

          <AnimatePresence>
            {showSaved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 text-emerald-500 font-bold"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>تم الحفظ</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ReminderItem({ title, pref, onToggle, onTimeChange, isDarkMode }: {
  title: string;
  pref: { enabled: boolean; time: string };
  onToggle: () => void;
  onTimeChange: (time: string) => void;
  isDarkMode: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-emerald-50/50 border-emerald-100'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-emerald-900'}`}>{title}</span>
        <button
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${pref.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${pref.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>
      
      <AnimatePresence>
        {pref.enabled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 mt-4 pt-4 border-t border-emerald-100/50 dark:border-slate-800"
          >
            <Clock className="w-4 h-4 text-emerald-500" />
            <input 
              type="time" 
              value={pref.time}
              onChange={(e) => onTimeChange(e.target.value)}
              className={`bg-transparent border-none focus:ring-0 font-bold ${isDarkMode ? 'text-white' : 'text-emerald-800'}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
