import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Search, Music2, BookOpen, X, Maximize2, Info, ChevronUp, ChevronDown, Minus, Plus, History, GraduationCap, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reciter, Surah, Verse, AyahTiming, RecentSurah, KhatmaProgress } from '../types';

const RECITER_MAPPING: Record<string, number> = {
  'مشاري العفاسي': 7,
  'مشاري بن راشد العفاسي': 7,
  'عبد الباسط عبد الصمد': 1,
  'عبدالباسط عبدالصمد': 1,
  'عبدالرحمن السديس': 3,
  'عبد الرحمن السديس': 3,
  'سعود الشريم': 11,
  'سعود بن إبراهيم الشريم': 11,
  'ماهر المعيقلي': 12,
  'ماهر بن حمد المعيقلي': 12,
  'سعد الغامدي': 10,
  'علي الحذيفي': 8,
  'أبو بكر الشاطري': 4,
  'محمود خليل الحصري': 6,
  'ناصر القطامي': 11,
  'ياسر الدوسري': 124,
  'محمد صديق المنشاوي': 8,
  'المنشاوي': 8,
  'محمد أيوب': 116,
  'أحمد العجمي': 115,
  'فارس عباد': 117,
  'إدريس أبكر': 118,
  'ماهر المعيقلي (المصحف المرتل)': 12,
  'خالد الجليل': 119,
  'محمد البراك': 0,
  'محمد بن جاسم البراك': 0
};

export default function QuranSection({ isDarkMode }: { isDarkMode: boolean }) {
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reciterSearch, setReciterSearch] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSurahId, setCurrentSurahId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recitersRes, surahsRes] = await Promise.all([
          fetch('https://mp3quran.net/api/v3/reciters?language=ar'),
          fetch('https://mp3quran.net/api/v3/suwar')
        ]);
        const recitersData = await recitersRes.json();
        const surahsData = await surahsRes.json();
        
        // Filter reciters to prioritize those with complete Mushaf
        const processedReciters = recitersData.reciters.map((r: any) => {
          // Find Mushaf with most surahs (ideally 114)
          const sortedMoshafs = [...r.moshaf].sort((a, b) => b.surah_list.split(',').length - a.surah_list.split(',').length);
          return { ...r, moshaf: sortedMoshafs };
        }).sort((a: any, b: any) => {
          // Put famous ones first
          const aFamous = RECITER_MAPPING[a.name] ? 1 : 0;
          const bFamous = RECITER_MAPPING[b.name] ? 1 : 0;
          if (aFamous !== bFamous) return bFamous - aFamous;
          
          // Then by completeness
          const aCount = a.moshaf[0]?.surah_list.split(',').length || 0;
          const bCount = b.moshaf[0]?.surah_list.split(',').length || 0;
          return bCount - aCount;
        });

        setReciters(processedReciters);
        
        const sortedSurahs = surahsData.suwar.map((s: any) => ({
          id: s.id,
          name: s.name,
          englishName: s.name,
          versesCount: s.verses_count || 0
        })).sort((a: any, b: any) => a.id - b.id);

        setSurahs(sortedSurahs);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching Quran data:', error);
        setIsLoading(false);
      }
    };
    fetchData();
    
    // Load recent from localStorage
    const savedRecent = localStorage.getItem('recent_surahs');
    if (savedRecent) {
      try {
        setRecentSurahs(JSON.parse(savedRecent));
      } catch (e) {
        console.error('Error parsing recent surahs', e);
      }
    }

    // Load khatma progress
    const savedKhatma = localStorage.getItem('khatma_progress');
    if (savedKhatma) {
      try {
        setKhatma(JSON.parse(savedKhatma));
      } catch (e) {
        console.error('Error parsing khatma progress', e);
      }
    }
  }, []);

  const updateKhatmaPage = (page: number) => {
    const newKhatma = { ...khatma, currentPage: page };
    setKhatma(newKhatma);
    localStorage.setItem('khatma_progress', JSON.stringify(newKhatma));
  };

  const addToRecent = (surahId: number, reciter: Reciter) => {
    const surahName = surahs.find(s => s.id === surahId)?.name || '';
    const newRecent: RecentSurah = {
      surahId,
      surahName,
      reciterId: reciter.id,
      reciterName: reciter.name,
      timestamp: Date.now()
    };

    setRecentSurahs(prev => {
      // Remove if exists
      const filtered = prev.filter(r => !(r.surahId === surahId && r.reciterId === reciter.id));
      const updated = [newRecent, ...filtered].slice(0, 10);
      localStorage.setItem('recent_surahs', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromRecent = (surahId: number, reciterId: number) => {
    setRecentSurahs(prev => {
      const updated = prev.filter(r => !(r.surahId === surahId && r.reciterId === reciterId));
      localStorage.setItem('recent_surahs', JSON.stringify(updated));
      return updated;
    });
  };

  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [surahText, setSurahText] = useState<{ verses: Verse[], name: string } | null>(null);
  const [timingData, setTimingData] = useState<AyahTiming[]>([]);
  const [showReadingView, setShowReadingView] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [fontSize, setFontSize] = useState(2.2); // Default in rem
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
  const [recentSurahs, setRecentSurahs] = useState<RecentSurah[]>([]);
  const [isMiniPlayerHidden, setIsMiniPlayerHidden] = useState(false);
  const [khatma, setKhatma] = useState<KhatmaProgress>({ currentPage: 1 });
  const [showFocusMode, setShowFocusMode] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const fetchSurahSyncData = async (id: number) => {
    try {
      const reciterName = selectedReciter?.name.trim() || '';
      const reciterId = RECITER_MAPPING[reciterName] || 7;
      
      let versesData, timingsData;
      
      if (reciterId > 0) {
        const [versesRes, timingsRes] = await Promise.all([
          fetch(`https://api.quran.com/api/v4/verses/by_chapter/${id}?words=true&word_fields=text_uthmani&per_page=300`),
          fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_chapter/${id}?per_page=300&segments=true`)
        ]);
        versesData = await versesRes.json();
        timingsData = await timingsRes.json();
      } else {
        const versesRes = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${id}?words=true&word_fields=text_uthmani&per_page=300`);
        versesData = await versesRes.json();
        timingsData = { audio_files: [] };
      }
      
      // Fetch Tafsir (Muyassar - ID 16)
      const tafsirRes = await fetch(`https://api.quran.com/api/v4/quran/tafsirs/16?chapter_number=${id}`);
      const tafsirData = await tafsirRes.json();
      
      // Create a map for tafsir by verse number
      const tafsirMap: Record<number, string> = {};
      tafsirData.tafsirs?.forEach((t: any) => {
        const verseNum = parseInt(t.verse_key.split(':')[1]);
        tafsirMap[verseNum] = t.text;
      });

      const versesWithTafsir = versesData.verses.map((v: any) => ({
        ...v,
        tafsir: tafsirMap[v.verse_number] || tafsirMap[v.id] || ""
      }));

      const audioFile = timingsData.audio_files?.[0];
      if (audioFile && audioFile.verse_timings) {
        setTimingData(audioFile.verse_timings);
      } else {
        // Fallback to verse timings if word timings not available
        // quran.com sometimes doesn't provide word segments for all
        setTimingData(audioFile?.verse_timings || []);
      }
      
      setSurahText({ verses: versesWithTafsir, name: surahs.find(s => s.id === id)?.name || '' });
    } catch (error) {
      console.error('Error fetching surah sync data:', error);
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}`);
      const data = await res.json();
      const simpleVerses = data.data.ayahs.map((a: any) => ({
        id: a.number,
        verse_key: `${id}:${a.numberInSurah}`,
        text_uthmani: a.text,
        words: a.text.split(' ').map((w: string, i: number) => ({ id: i, position: i + 1, text_uthmani: w }))
      }));
      setSurahText({ verses: simpleVerses, name: data.data.name });
    }
  };

  useEffect(() => {
    if (!currentAudio) return;
    const updateTime = () => {
      const timeMs = currentAudio.currentTime * 1000;
      
      // Find current Ayah
      const ayah = timingData.find(t => timeMs >= t.timestamp_from && timeMs <= t.timestamp_to);
      
      if (ayah) {
        if (ayah.verse_key !== currentVerseKey) {
          setCurrentVerseKey(ayah.verse_key);
        }
        
        // Find current word
        if (ayah.segments) {
          const segment = ayah.segments.find(s => timeMs >= s[1] && timeMs <= s[2]);
          if (segment && segment[0] !== currentWordIndex) {
            setCurrentWordIndex(segment[0]);
          }
        } else {
          setCurrentWordIndex(null);
        }
      }
    };
    currentAudio.addEventListener('timeupdate', updateTime);
    return () => currentAudio.removeEventListener('timeupdate', updateTime);
  }, [currentAudio, timingData]);

  useEffect(() => {
    const handleScroll = () => {
      const target = activeWordRef.current || document.getElementById(`verse-${currentVerseKey}`);
      if (target && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Only scroll if the target is not clearly in view or every time for smooth follow
        const relativeTop = targetRect.top - containerRect.top;
        const targetScroll = container.scrollTop + relativeTop - (containerRect.height / 2);
        
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    };
    
    // Increased delay slightly for better DOM sync
    const timeout = setTimeout(handleScroll, 100);
    return () => clearTimeout(timeout);
  }, [currentWordIndex, currentVerseKey, fontSize]);

  const playSurah = (surahId: number) => {
    if (!selectedReciter || !selectedReciter.moshaf[0]) return;

    if (currentAudio) {
      currentAudio.pause();
    }

    const moshaf = selectedReciter.moshaf[0];
    const surahStr = surahId.toString().padStart(3, '0');
    const audioUrl = `${moshaf.server}/${surahStr}.mp3`;
    
    setIsAudioLoading(true);
    const audio = new Audio(audioUrl);
    
    fetchSurahSyncData(surahId);
    setIsMiniPlayerHidden(false); // Show mini player when new surah starts

    audio.oncanplay = () => {
      setIsAudioLoading(false);
      audio.play().catch(err => {
        console.error('Playback error:', err);
        setIsPlaying(false);
        setCurrentSurahId(null);
      });
    };
    
    setCurrentAudio(audio);
    setIsPlaying(true);
    setCurrentSurahId(surahId);
    addToRecent(surahId, selectedReciter);

    audio.onerror = () => {
      setIsAudioLoading(false);
      setIsPlaying(false);
      setCurrentSurahId(null);
      alert('عذراً، حدث خطأ في تشغيل السورة. تأكد من اتصال الإنترنت.');
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentSurahId(null);
      setCurrentVerseKey(null);
      setCurrentWordIndex(null);
    };
  };

  const togglePlay = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const currentReciterName = selectedReciter?.name.trim() || '';
  const mappedReciterId = RECITER_MAPPING[currentReciterName] || 7;

  const filteredReciters = reciters.filter(r => 
    r.name.toLowerCase().includes(reciterSearch.toLowerCase())
  );

  const filteredSurahs = surahs.filter(s => {
    const isMatched = s.name.includes(searchQuery);
    if (!selectedReciter) return isMatched;
    
    const moshaf = selectedReciter.moshaf[0];
    const list = moshaf.surah_list.split(',');
    return isMatched && list.includes(s.id.toString());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDarkMode ? 'border-emerald-400' : 'border-emerald-600'}`}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Khatma Progress */}
      <div className={`backdrop-blur-sm p-5 rounded-2xl shadow-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
            <GraduationCap className="w-6 h-6" />
            <h2 className="text-xl font-black">تقدم الختمة</h2>
          </div>
          <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-emerald-600'}`}>
            الصفحة {khatma.currentPage} من 604
          </div>
        </div>

        <div className="relative h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(khatma.currentPage / 604) * 100}%` }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <input 
              type="range" 
              min="1" 
              max="604" 
              value={khatma.currentPage}
              onChange={(e) => updateKhatmaPage(parseInt(e.target.value))}
              className="w-full h-2 bg-emerald-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => updateKhatmaPage(Math.max(1, khatma.currentPage - 1))}
              className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-emerald-100 hover:bg-emerald-50 text-emerald-900'}`}
            >
              -1
            </button>
            <button 
              onClick={() => updateKhatmaPage(Math.min(604, khatma.currentPage + 1))}
              className={`p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-emerald-100 hover:bg-emerald-50 text-emerald-900'}`}
            >
              +1
            </button>
            <button 
              onClick={() => {
                const page = prompt('أدخل رقم الصفحة التي وصلت إليها (1-604):');
                if (page) {
                  const pageNum = parseInt(page);
                  if (pageNum >= 1 && pageNum <= 604) updateKhatmaPage(pageNum);
                }
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              تعديل
            </button>
          </div>
        </div>

        {khatma.currentPage === 604 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold justify-center"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>هنيئاً لك! لقد أتممت الختمة.</span>
          </motion.div>
        )}
      </div>

      {/* Recently Listened */}
      {recentSurahs.length > 0 && (
        <div className={`backdrop-blur-sm p-4 rounded-2xl shadow-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100'}`}>
          <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
            <History className="w-5 h-5" />
            <h2 className="text-lg font-bold">آخر ما استمعت إليه</h2>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {recentSurahs.map((recent, idx) => (
              <div
                key={`${recent.surahId}-${recent.reciterId}-${idx}`}
                className="relative group flex-shrink-0 w-48"
              >
                <button
                  onClick={() => {
                    const reciter = reciters.find(r => r.id === recent.reciterId);
                    if (reciter) {
                      setSelectedReciter(reciter);
                      playSurah(recent.surahId);
                    }
                  }}
                  className={`w-full p-3 rounded-xl border text-right transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-slate-900 border-slate-700 hover:border-emerald-500' 
                      : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      سورة {recent.surahId}
                    </span>
                    <Play className={`w-3 h-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <p className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{recent.surahName}</p>
                  <p className="text-xs text-emerald-500 truncate">{recent.reciterName}</p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromRecent(recent.surahId, recent.reciterId);
                  }}
                  className={`absolute -top-2 -left-2 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400' : 'bg-white border-emerald-100 text-emerald-400 hover:text-red-500'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Mini Player / Reading Toggle */}
      <AnimatePresence>
        {currentSurahId && !isMiniPlayerHidden && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-4 right-4 z-40 p-4 rounded-2xl shadow-xl border flex items-center justify-between transition-colors duration-500 ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-3 bg-emerald-600 text-white rounded-full shadow-md active:scale-95 transition-transform"
              >
                {isAudioLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
              </button>
              <div>
                <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  {surahs.find(s => s.id === currentSurahId)?.name}
                </p>
                <p className="text-xs text-emerald-500">{selectedReciter?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReadingView(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm font-bold hidden sm:inline">قراءة السورة</span>
              </button>
              
              <button
                onClick={() => setIsMiniPlayerHidden(true)}
                className={`p-2 rounded-xl transition-colors ${
                  isDarkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-emerald-50 text-emerald-400'
                }`}
                title="إخفاء المشغل"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading Modal */}
      <AnimatePresence>
        {showReadingView && surahText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
              <motion.div
                layout
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className={`w-full max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl transition-colors duration-500 relative ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-[#FFFDF9] border-emerald-50'
                }`}
              >
                {/* Focus Mode Exit Overlay */}
                <AnimatePresence>
                  {showFocusMode && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setShowFocusMode(false)}
                      className="absolute top-4 right-4 z-50 p-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 rounded-full backdrop-blur-md border border-emerald-500/20 transition-all active:scale-95"
                    >
                      <EyeOff className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Modal Header */}
                <AnimatePresence>
                  {!showFocusMode && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`p-4 sm:p-6 border-b flex items-center justify-between overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-emerald-50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl hidden sm:block">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{surahText.name}</h2>
                          <p className="text-xs sm:text-sm text-emerald-500">بصوت {selectedReciter?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4">
                        <button
                          onClick={() => setShowFocusMode(true)}
                          className={`p-2 sm:p-3 rounded-2xl transition-colors ${
                            isDarkMode ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="وضع التركيز"
                        >
                          <Eye className="w-6 h-6" />
                        </button>

                        <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-emerald-50 border-emerald-100'}`}>
                          <button 
                            onClick={() => setFontSize(prev => Math.max(1.2, prev - 0.2))}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-emerald-700'}`}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className={`text-xs font-bold w-8 text-center ${isDarkMode ? 'text-slate-300' : 'text-emerald-800'}`}>
                            {Math.round((fontSize / 2.2) * 100)}%
                          </span>
                          <button 
                            onClick={() => setFontSize(prev => Math.min(4.0, prev + 0.2))}
                            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-white text-emerald-700'}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => setShowReadingView(false)}
                          className={`p-2 sm:p-3 rounded-2xl transition-colors ${
                            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quran Text Content - Word by Word */}
                <div 
                  ref={scrollContainerRef}
                  className={`flex-1 overflow-y-auto custom-scrollbar text-center transition-all duration-700 ${showFocusMode ? 'p-12 sm:p-20' : 'p-8'}`}
                >
                  <div 
                    className={`leading-[2.8] font-quran transition-all inline-block`}
                    style={{ 
                      fontFamily: "'Amiri', serif", 
                      fontSize: showFocusMode ? `${fontSize * 1.2}rem` : `${fontSize}rem` 
                    }}
                  >
                  {/* Basmalah */}
                  {currentSurahId !== 1 && currentSurahId !== 9 && (
                    <div className="mb-12 text-emerald-600 font-bold text-4xl">
                      بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                    </div>
                  )}
                  
                  {surahText.verses.map((verse) => (
                    <span 
                      key={verse.id} 
                      id={`verse-${verse.verse_key}`}
                      className={`inline-block mx-1 rounded-2xl transition-colors duration-500 ${
                        currentVerseKey === verse.verse_key && !currentWordIndex 
                          ? (isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50') 
                          : ''
                      }`}
                    >
                      {verse.words.map((word) => {
                        const isCurrentWord = currentVerseKey === verse.verse_key && currentWordIndex === word.position;
                        const isCurrentAyah = currentVerseKey === verse.verse_key;
                        
                        // Fallback highlighting if only Ayah level is known
                        const isAyahHighlighted = isCurrentAyah && (!timingData.find(t => t.verse_key === currentVerseKey)?.segments);

                        return (
                          <motion.span
                            key={word.id}
                            ref={isCurrentWord ? activeWordRef : null}
                            animate={{
                              color: isCurrentWord ? '#10b981' : (isCurrentAyah ? (isDarkMode ? '#ffffff' : '#000000') : (isDarkMode ? '#64748b' : '#94a3b8')),
                              scale: isCurrentWord ? 1.2 : (isAyahHighlighted ? 1.05 : 1),
                              backgroundColor: isCurrentWord 
                                ? (isDarkMode ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)') 
                                : (isAyahHighlighted ? (isDarkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)') : 'transparent'),
                              textShadow: isCurrentWord ? '0 0 15px rgba(16,185,129,0.5)' : 'none'
                            }}
                            className={`inline-block px-1.5 py-0.5 rounded-lg transition-all duration-200 cursor-default font-bold`}
                          >
                            {word.text_uthmani}
                          </motion.span>
                        );
                      })}
                      <span className="text-emerald-500/40 text-2xl mx-2 font-sans opacity-50">۝</span>
                    </span>
                  ))}
                </div>
              </div>

                {/* Bottom Controls & Tafsir */}
                <AnimatePresence>
                  {!showFocusMode && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`p-6 border-t flex flex-col gap-4 overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-emerald-50'}`}
                    >
                      {/* Tafsir Toggle & Panel */}
                      <div className="w-full">
                        <button
                          onClick={() => setShowTafsir(!showTafsir)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            isDarkMode ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            <span className="font-bold">التفسير الميسر للآية الحالية</span>
                          </div>
                          {showTafsir ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                        
                        <AnimatePresence>
                          {showTafsir && currentVerseKey && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className={`mt-3 p-4 rounded-xl text-sm leading-relaxed text-right ${
                                isDarkMode ? 'bg-slate-800/50 text-slate-300' : 'bg-white border border-emerald-100 text-slate-700'
                              }`}>
                                {surahText.verses.find(v => v.verse_key === currentVerseKey)?.tafsir ? (
                                  <div dangerouslySetInnerHTML={{ __html: surahText.verses.find(v => v.verse_key === currentVerseKey)!.tafsir! }} />
                                ) : (
                                  "جاري تحميل التفسير أو غير متوفر حالياً..."
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center justify-center gap-6">
                        <button
                          onClick={togglePlay}
                          className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-lg active:scale-95 flex items-center justify-center transition-transform"
                        >
                          {isAudioLoading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : isPlaying ? (
                            <Pause className="w-8 h-8 fill-current" />
                          ) : (
                            <Play className="w-8 h-8 fill-current pr-1" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reciter Selection */}
      <div className={`backdrop-blur-sm p-4 rounded-2xl shadow-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100'}`}>
        <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
          <Music2 className="w-5 h-5" />
          <h2 className="text-lg font-bold">اختر القارئ</h2>
        </div>
        
        <div className="relative mb-4">
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-emerald-400'}`} />
          <input
            type="text"
            placeholder="بحث عن قارئ..."
            className={`w-full pr-10 pl-4 py-2 rounded-xl focus:outline-none focus:ring-2 transition-colors duration-300 text-right ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-white focus:ring-emerald-500' 
                : 'bg-emerald-50 border-transparent text-slate-900 focus:ring-emerald-500'
            }`}
            value={reciterSearch}
            onChange={(e) => setReciterSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filteredReciters.slice(0, 20).map((reciter) => (
            <button
              key={reciter.id}
              onClick={() => setSelectedReciter(reciter)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-300 ${
                selectedReciter?.id === reciter.id
                  ? (isDarkMode ? 'bg-emerald-700 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md')
                  : (isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')
              }`}
            >
              {reciter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Surah List */}
      <div className={`backdrop-blur-sm p-4 rounded-2xl shadow-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-emerald-100'}`}>
        <div className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">قائمة السور</h2>
        </div>

        <div className="relative mb-4">
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-emerald-400'}`} />
          <input
            type="text"
            placeholder="بحث عن سورة..."
            className={`w-full pr-10 pl-4 py-2 rounded-xl focus:outline-none focus:ring-2 transition-colors duration-300 text-right ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700 text-white focus:ring-emerald-500' 
                : 'bg-emerald-50 border-transparent text-slate-900 focus:ring-emerald-500'
            }`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {!selectedReciter && (
          <p className={`text-center py-8 rounded-xl mb-4 ${isDarkMode ? 'text-emerald-400 bg-emerald-900/20' : 'text-emerald-600 bg-emerald-50'}`}>
            الرجاء اختيار القارئ أولاً للاستماع
          </p>
        )}

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1 custom-scrollbar`}>
          {filteredSurahs.map((surah) => (
            <div
              key={surah.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                currentSurahId === surah.id
                  ? (isDarkMode ? 'bg-emerald-900/40 border-emerald-500 shadow-sm' : 'bg-emerald-50 border-emerald-300 shadow-sm')
                  : (isDarkMode ? 'bg-slate-900/50 border-slate-700 hover:border-emerald-700' : 'bg-white border-emerald-50 hover:border-emerald-200')
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${
                  isDarkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {surah.id}
                </span>
                <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-emerald-900'}`}>{surah.name}</span>
              </div>
              
              {selectedReciter && (
                <div className="flex items-center gap-2">
                   <button
                    onClick={() => {
                      if (currentSurahId !== surah.id) {
                        playSurah(surah.id);
                      }
                      setShowReadingView(true);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      isDarkMode ? 'text-emerald-500 hover:bg-slate-700' : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title="قراءة"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => currentSurahId === surah.id ? togglePlay() : playSurah(surah.id)}
                    className={`p-2 rounded-full transition-colors relative ${
                      currentSurahId === surah.id
                        ? 'bg-emerald-600 text-white'
                        : (isDarkMode ? 'bg-slate-700 text-emerald-400 hover:bg-slate-600' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200')
                    }`}
                  >
                  {currentSurahId === surah.id && isAudioLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : currentSurahId === surah.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
              </div>
            )}
            </div>
          ))}
        </div>
      </div>

      {/* Mini Player Sticky (Optional if needed, but keeping it simple for now) */}
    </div>
  );
}
