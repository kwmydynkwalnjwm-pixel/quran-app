export interface NotificationPreferences {
  quranReminder: { enabled: boolean; time: string };
  morningAzkar: { enabled: boolean; time: string };
  eveningAzkar: { enabled: boolean; time: string };
  salawat: { enabled: boolean; interval: number };
  adhan: { enabled: boolean; voice: 'egyptian' | 'saudi' };
  location: { city: string; country: string };
}

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface KhatmaProgress {
  currentPage: number;
  totalStats?: {
    completedSurahs: number[];
  };
}

export interface RecentSurah {
  surahId: number;
  surahName: string;
  reciterId: number;
  reciterName: string;
  timestamp: number;
}

export interface Surah {
  id: number;
  name: string;
  englishName: string;
  versesCount: number;
}

export interface Word {
  id: number;
  position: number;
  text_uthmani: string;
}

export interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  words: Word[];
  tafsir?: string;
  timestamps?: {
    timestamp_from: number;
    timestamp_to: number;
  };
}

export interface AyahTiming {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  duration: number;
  segments: [number, number, number][]; // [word_index, start, end]
}

export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface Dhikr {
  id: number;
  text: string;
  count: number;
  description?: string;
  audio?: string;
}

export type TabType = 'quran' | 'adhkar' | 'prayer' | 'tasbih' | 'settings';
