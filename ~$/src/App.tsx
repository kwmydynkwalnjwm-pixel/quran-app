import React, { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Device } from '@capacitor/device';
import { BookMarked, Heart, Fingerprint, Star, Moon, Sun, Settings, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QuranSection from './components/QuranSection';
import AdhkarSection from './components/AdhkarSection';
import TasbihSection from './components/TasbihSection';
import PrayerTimesSection from './components/PrayerTimesSection';
import NotificationSettings from './components/NotificationSettings';
import { TabType, NotificationPreferences, PrayerTimes } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('quran');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Request permissions for native notifications if on mobile
    const requestNativePerms = async () => {
      try {
        const info = await Device.getInfo();
        if (info.platform !== 'web') {
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display !== 'granted') {
            console.warn('Native notification permission denied');
          }
        }
      } catch (e) {
        console.log('Not in Capacitor environment');
      }
    };
    requestNativePerms();
  }, []);

  useEffect(() => {
    // Adhan and Reminders Background Check
    let dailyPrayerTimes: PrayerTimes | null = null;
    
    const fetchTodayPrayerTimes = async () => {
      const saved = localStorage.getItem('notification_prefs');
      let city = 'Cairo';
      let country = 'Egypt';
      
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.location) {
          city = prefs.location.city;
          country = prefs.location.country;
        }
      }

      try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
        const data = await response.json();
        if (data.code === 200) {
          dailyPrayerTimes = data.data.timings;
          // Cache for offline use
          localStorage.setItem('cached_prayer_times', JSON.stringify({
            date: new Date().toDateString(),
            times: dailyPrayerTimes
          }));
        }
      } catch (e) {
        console.warn('Offline or fetch failed, trying cache...', e);
        const cached = localStorage.getItem('cached_prayer_times');
        if (cached) {
          const { date, times } = JSON.parse(cached);
          if (date === new Date().toDateString()) {
            dailyPrayerTimes = times;
          }
        }
      }
    };

    const checkAdhanAndReminders = () => {
      const saved = localStorage.getItem('notification_prefs');
      if (!saved) return;
      
      try {
        const prefs: NotificationPreferences = JSON.parse(saved);
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const lastCheckKey = 'last_notification_check';
        const lastCheck = localStorage.getItem(lastCheckKey);
        
        if (lastCheck === currentTime) return; // Already checked this minute
        localStorage.setItem(lastCheckKey, currentTime);

        // 1. Check Adhan
        if (prefs.adhan?.enabled && dailyPrayerTimes) {
          const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
          for (const key of prayerKeys) {
            if ((dailyPrayerTimes as any)[key] === currentTime) {
              const voiceUrl = prefs.adhan.voice === 'saudi' 
                ? 'https://www.islamcan.com/audio/adhan/makkah.mp3' 
                : 'https://www.islamcan.com/audio/adhan/mustafaismail.mp3';
              
              const audio = new Audio(voiceUrl);
              audio.play().catch(e => console.log('Adhan blocked by browser policy', e));
              
              // Trigger Native or Web Notification
              const title = 'حان وقت الصلاة';
              const body = `الآن موعد صلاة ${key}`;
              
              if (Notification.permission === 'granted') {
                new Notification(title, { body });
              }
              
              // Try Native Local Notification for Android/iOS
              try {
                LocalNotifications.schedule({
                  notifications: [{
                    title,
                    body,
                    id: Math.floor(Math.random() * 10000),
                    schedule: { at: new Date() },
                    sound: 'adhan.mp3',
                    actionTypeId: '',
                    extra: null
                  }]
                });
              } catch (e) {}
              
              break;
            }
          }
        }

        // 2. Check Other Reminders
        const triggerNotification = (title: string, body: string) => {
          if (Notification.permission === 'granted') {
            try {
              new Notification(title, { body, icon: '/star.png' });
            } catch (e) {
              console.error('Notification creation failed', e);
            }
          }
        };

        if (prefs.quranReminder?.enabled && prefs.quranReminder.time === currentTime) {
          triggerNotification('تذكير الورد اليومي', 'حان وقت قراءة وردك اليومي من القرآن الكريم.');
        }
        if (prefs.morningAzkar?.enabled && prefs.morningAzkar.time === currentTime) {
          triggerNotification('أذكار الصباح', 'حان وقت قراءة أذكار الصباح، حفظك الله.');
        }
        if (prefs.eveningAzkar?.enabled && prefs.eveningAzkar.time === currentTime) {
          triggerNotification('أذكار المساء', 'حان وقت قراءة أذكار المساء، بارك الله فيك.');
        }
      } catch (e) {
        console.error('Background check error', e);
      }
    };

    fetchTodayPrayerTimes();
    const interval = setInterval(checkAdhanAndReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Background Salawat reminder logic
    let salawatInterval: NodeJS.Timeout;
    
    const playSalawat = () => {
      const saved = localStorage.getItem('notification_prefs');
      if (!saved) return;
      try {
        const prefs: NotificationPreferences = JSON.parse(saved);
        if (prefs.salawat?.enabled) {
          // Use TTS for exact "صلي على محمد" phrase and to avoid long recordings
          if ('speechSynthesis' in window) {
            // Cancel any ongoing speech to prevent overlap
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance('صلي على محمد');
            utterance.lang = 'ar-SA';
            utterance.rate = 0.9; // Slightly slower for clarity
            window.speechSynthesis.speak(utterance);
          }
        }
      } catch (e) {
        console.error('Salawat play error', e);
      }
    };

    const setupSalawat = () => {
      const saved = localStorage.getItem('notification_prefs');
      if (!saved) return;
      try {
        const prefs: NotificationPreferences = JSON.parse(saved);
        if (prefs.salawat?.enabled && prefs.salawat.interval > 0) {
          salawatInterval = setInterval(playSalawat, prefs.salawat.interval * 1000);
        }
      } catch (e) {
        console.error('Salawat setup error', e);
      }
    };

    setupSalawat();
    
    const handleUpdate = () => {
      clearInterval(salawatInterval);
      setupSalawat();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('notification_prefs_updated', handleUpdate);

    return () => {
      clearInterval(salawatInterval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('notification_prefs_updated', handleUpdate);
    };
  }, []);

  const renderSection = () => {
    switch (activeTab) {
      case 'quran':
        return <QuranSection isDarkMode={isDarkMode} />;
      case 'adhkar':
        return <AdhkarSection isDarkMode={isDarkMode} />;
      case 'prayer':
        return <PrayerTimesSection isDarkMode={isDarkMode} />;
      case 'tasbih':
        return <TasbihSection isDarkMode={isDarkMode} />;
      case 'settings':
        return <NotificationSettings isDarkMode={isDarkMode} />;
      default:
        return <QuranSection isDarkMode={isDarkMode} />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'quran': return 'القرآن الكريم';
      case 'adhkar': return 'الأذكار اليومية';
      case 'prayer': return 'مواقيت الصلاة';
      case 'tasbih': return 'السبحة الإلكترونية';
      case 'settings': return 'الإعدادات';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-[#FDFBF7] text-slate-900'} text-right font-sans selection:bg-emerald-100 selection:text-emerald-900`} dir="rtl">
      {/* Background Ornament */}
      <div className={`fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden ${isDarkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M50 0L60 40L100 50L60 60L50 100L40 60L0 50L40 40Z" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#pattern)" />
        </svg>
      </div>

      <div className="max-w-md mx-auto min-h-screen flex flex-col relative pb-24">
        {/* Header */}
        <header className="p-6 pt-12 text-center relative">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`absolute left-6 top-12 p-3 rounded-2xl transition-all duration-300 ${isDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-white text-emerald-600 border-emerald-50'} border shadow-sm active:scale-90`}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-2 transition-colors duration-500 ${isDarkMode ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
              <Star className="text-white w-8 h-8 fill-current" />
            </div>
            <h1 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
              {getTitle()}
            </h1>
            <p className={`font-medium text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
          </motion.div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Navigation Bar */}
        <nav className={`fixed bottom-0 left-0 right-0 p-4 pb-8 backdrop-blur-xl border-t z-50 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-emerald-50'}`}>
          <div className="max-w-md mx-auto flex items-center justify-around">
            <NavButton 
              isActive={activeTab === 'quran'} 
              onClick={() => setActiveTab('quran')}
              icon={<BookMarked className="w-6 h-6" />}
              label="القرآن"
              isDarkMode={isDarkMode}
            />
            <NavButton 
              isActive={activeTab === 'adhkar'} 
              onClick={() => setActiveTab('adhkar')}
              icon={<Heart className="w-6 h-6" />}
              label="الأذكار"
              isDarkMode={isDarkMode}
            />
            <NavButton 
              isActive={activeTab === 'prayer'} 
              onClick={() => setActiveTab('prayer')}
              icon={<Clock className="w-6 h-6" />}
              label="الصلاة"
              isDarkMode={isDarkMode}
            />
            <NavButton 
              isActive={activeTab === 'tasbih'} 
              onClick={() => setActiveTab('tasbih')}
              icon={<Fingerprint className="w-6 h-6" />}
              label="السبحة"
              isDarkMode={isDarkMode}
            />
            <NavButton 
              isActive={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-6 h-6" />}
              label="الإعدادات"
              isDarkMode={isDarkMode}
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavButton({ isActive, onClick, icon, label, isDarkMode }: { isActive: boolean, onClick: () => void, icon: React.ReactNode, label: string, isDarkMode: boolean }) {
  const activeColor = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  const inactiveColor = isDarkMode ? 'text-slate-500' : 'text-emerald-400';
  
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all duration-300 relative group ${
        isActive ? `${activeColor} scale-110` : `${inactiveColor} hover:${isDarkMode ? 'text-slate-300' : 'text-emerald-500'}`
      }`}
    >
      <div className={`p-2 rounded-xl transition-all duration-300 ${
        isActive 
          ? (isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50') 
          : (isDarkMode ? 'group-hover:bg-slate-800/50' : 'group-hover:bg-emerald-50/50')
      }`}>
        {icon}
      </div>
      <span className="text-xs font-bold">{label}</span>
      {isActive && (
        <motion.div 
          layoutId="nav-pill"
          className={`absolute -top-1 w-1 h-1 rounded-full ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-600'}`}
        />
      )}
    </button>
  );
}

