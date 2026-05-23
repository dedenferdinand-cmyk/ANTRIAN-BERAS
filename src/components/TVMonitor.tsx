import React, { useState, useEffect } from 'react';
import { Volume2, Clock, MapPin, Minimize, Maximize, BellRing, Sun, Moon } from 'lucide-react';
import { QueueItem, QueueStats } from '../types';
import BulogLogo from './BulogLogo';
import VillageLogo from './VillageLogo';

interface TVMonitorProps {
  queues: QueueItem[];
  stats: QueueStats;
  latestCalled?: QueueItem;
}

export default function TVMonitor({ queues, stats, latestCalled }: TVMonitorProps) {
  const [time, setTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Indonesian Text-to-Speech announcer (Optimized for Female Voice)
  const announceSpokenSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // cancel pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      
      // Try to associate Indonesia specific female voice accent
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => {
        const isIndo = v.lang.startsWith('id') || v.lang.includes('id') || v.lang.includes('ID');
        if (!isIndo) return false;
        const nameLower = v.name.toLowerCase();
        // Clues for female voices (e.g., Gadis, Siti, Yasmin, Dami, Google, Zira, female etc.)
        return nameLower.includes('gadis') || 
               nameLower.includes('siti') || 
               nameLower.includes('female') || 
               nameLower.includes('perempuan') ||
               nameLower.includes('google') ||
               nameLower.includes('yasmin') ||
               nameLower.includes('dami') ||
               nameLower.includes('zira');
      }) || voices.find(v => v.lang.startsWith('id') || v.lang.includes('ID')) || voices.find(v => v.name.toLowerCase().includes('female'));
      
      if (matchVoice) {
        utterance.voice = matchVoice;
      }
      utterance.rate = 0.85; // highly articulate clear speech rate
      utterance.pitch = 1.15; // slightly higher pitch to sound more feminine and friendly
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS Speech error:', e);
    }
  };

  // Web Audio chime generator (pleasing sound, no external MP3 needed!)
  const playElectronicChime = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        // pleasant volume envelope
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      // Play C-major arpeggio (hospital bell)
      playTone(523.25, now, 0.4);       // C5
      playTone(659.25, now + 0.15, 0.4); // E5
      playTone(783.99, now + 0.3, 0.4);  // G5
      playTone(1046.50, now + 0.45, 0.6); // C6
      
      return new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.warn('Synthesized chime error:', err);
    }
  };

  const unlockAudio = async () => {
    try {
      setAudioUnlocked(true);
      await playElectronicChime();
      announceSpokenSpeech("Audio suara perempuan siap digunakan untuk panggilan antrian.");
    } catch (e) {
      console.warn("Failed to unlock audio:", e);
      setAudioUnlocked(true);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      if (!audioUnlocked) {
        unlockAudio();
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [audioUnlocked]);

  // Listen to the backend for calling updates
  useEffect(() => {
    if (latestCalled && latestCalled.status === 'dipanggil' && latestCalled.id !== lastAnnouncedId) {
      // Trigger voice call
      setLastAnnouncedId(latestCalled.id);
      setIsFlashing(true);
      
      const callSequence = async () => {
        await playElectronicChime();
        announceSpokenSpeech(`Nomor antrian ${latestCalled.nomor_antrian}, silakan menuju ke meja verifikasi`);
      };
      
      callSequence();

      // Flashing visual backdrop timeout
      const flashTimer = setTimeout(() => {
        setIsFlashing(false);
      }, 5000);

      return () => clearTimeout(flashTimer);
    }
  }, [latestCalled, lastAnnouncedId]);

  // Fullscreen support
  const handleToggleFullscreen = () => {
    const docEl = document.getElementById('tv-display-root');
    if (!docEl) return;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Dynamic colors for modes
  const bgThemeClass = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const panelThemeClass = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl';

  const formatClockTime = () => {
    return time.toLocaleTimeString('id-ID', { hour12: false });
  };

  const formatClockDate = () => {
    return time.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // History of recently called queues
  const recentlyCalled = queues
    .filter(q => q.status === 'dipanggil' || q.status === 'verifikasi')
    .sort((a, b) => {
      const timeA = a.waktu_panggil ? new Date(a.waktu_panggil).getTime() : 0;
      const timeB = b.waktu_panggil ? new Date(b.waktu_panggil).getTime() : 0;
      return timeB - timeA;
    })
    .slice(1, 4); // exclude active primary called

  return (
    <div
      id="tv-display-root"
      className={`min-h-screen ${bgThemeClass} flex flex-col justify-between p-6 transition-colors duration-500 font-sans relative overflow-hidden`}
    >
      
      {/* Absolute floating controls for operator */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 select-none">
        {!audioUnlocked ? (
          <button
            onClick={unlockAudio}
            title="Klik untuk mengaktifkan suara announcer perempuan"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-full flex items-center gap-2 animate-pulse shadow-xl transition-all uppercase cursor-pointer"
          >
            <Volume2 className="h-4 w-4 text-slate-950" />
            Aktifkan Suara Perempuan (Klik Sini)
          </button>
        ) : (
          <div className="bg-emerald-600 border border-emerald-400 text-white font-black text-xs px-4 py-2.5 rounded-full flex items-center gap-2 shadow-lg">
            <Volume2 className="h-4 w-4 text-white" />
            Suara Announcer Perempuan Aktif
          </div>
        )}
        <button
          onClick={() => setIsDarkMode(prev => !prev)}
          title="Toggle Gelap/Terang"
          className="p-3 rounded-full bg-slate-800/10 hover:bg-slate-800/20 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition shadow-sm border border-slate-200/40"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-3 rounded-full bg-slate-800/10 hover:bg-slate-800/20 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition shadow-sm border border-slate-200/40"
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* HEADER SECTION */}
      <div className={`p-4 md:p-6 rounded-3xl ${panelThemeClass} border flex flex-col md:flex-row justify-between items-center gap-4`}>
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <BulogLogo className="h-10 w-10 md:h-12 md:w-12" />
          <div className="hidden md:block h-10 w-px bg-slate-300 dark:bg-slate-700" />
          <VillageLogo className="h-10 w-10 md:h-12 md:w-12" />
        </div>

        <div className="text-center md:text-right">
          <h2 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center justify-center md:justify-end gap-1.5 animate-pulse">
            <BellRing className="h-4 w-4" />
            LIVE MONITOR ANTRIAN DESA
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">Paket: Beras 20 kg & Minyak 4 Liter</p>
        </div>
      </div>

      {/* CORE DISPLAY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 flex-grow items-stretch">
        
        {/* BIG BOX 1: Large Number being called (Col-span 2) */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div
            className={`flex-grow rounded-3xl border-2 flex flex-col justify-center items-center p-8 transition-all duration-300 relative overflow-hidden ${
              isFlashing
                ? 'bg-blue-600 border-yellow-400 text-white animate-pulse shadow-2xl shadow-blue-500/30'
                : isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white shadow-xl'
                : 'bg-white border-blue-100 text-[#1E40AF] shadow-xl'
            }`}
          >
            {/* Top border strip style */}
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
            
            {/* Display tag */}
            <span className={`font-bold uppercase tracking-[0.2em] text-sm mb-4 duration-300 ${
              isFlashing ? 'text-yellow-300' : isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              Nomor Antrian Saat Ini
            </span>

            {/* Giant Number styled beautifully */}
            <div className="text-center relative">
              <h2 id="tv-large-number" className={`text-[150px] md:text-[200px] font-black leading-none tracking-tighter ${
                isFlashing ? 'text-white' : isDarkMode ? 'text-white' : 'text-blue-900'
              }`}>
                {latestCalled ? String(latestCalled.nomor_antrian).padStart(3, '0') : '000'}
              </h2>
            </div>

            {/* Verification desk instruction */}
            <div className="mt-4 flex flex-col items-center">
              <div className="px-8 py-3 bg-emerald-600 text-white rounded-full font-bold text-lg md:text-2xl uppercase tracking-wider shadow-lg flex items-center gap-2 animate-bounce">
                <MapPin className="h-5 w-5" />
                Menuju Meja Verifikasi
              </div>
              <p className="mt-4 text-xs md:text-sm text-slate-400 font-medium italic">
                Harap siapkan KTP dan Kartu Keluarga asli
              </p>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-50 dark:bg-blue-950/20 rounded-full opacity-40 -z-10" />

          </div>
        </div>

        {/* BOX 2: Clock & Side Stats Table (Col-span 1) */}
        <div className="flex flex-col gap-6 justify-between balance-height">
          
          {/* Realtime clock display widget */}
          <div className={`p-6 rounded-3xl ${panelThemeClass} border text-center flex flex-col justify-center items-center shadow-md`}>
            <Clock className="h-6 w-6 text-[#1E40AF] mb-1.5 animate-spin" style={{ animationDuration: '60s' }} />
            <span id="tv-clock-time" className="text-4xl font-extrabold tracking-tight font-mono text-slate-800 dark:text-white leading-none">
              {formatClockTime()}
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase mt-2 font-sans tracking-wide">
              {formatClockDate()}
            </span>
          </div>

          {/* Recently called Queue history log */}
          <div className={`p-5 rounded-3xl ${panelThemeClass} border flex-grow flex flex-col justify-between`}>
            <div>
              <h3 className="text-xs tracking-wider uppercase font-black text-emerald-600 mb-3 border-b pb-2 dark:border-slate-800">
                Panggilan Terakhir
              </h3>
              
              <div className="space-y-2 mt-2">
                {recentlyCalled.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                    Belum ada riwayat panggil
                  </div>
                ) : (
                  recentlyCalled.map(q => (
                    <div key={q.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 p-2 rounded-xl">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Antrian #{q.nomor_antrian}</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-bold px-2 py-0.5 rounded-md uppercase">
                        {q.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Static layout summary of remaining people in Desa */}
            <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Belum Dilayani</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {stats.menunggu} Warga
                </span>
              </div>
              <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-800" />
              <div className="text-right">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Selesai Dibagikan</span>
                <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                  {stats.selesai} <span className="text-xs font-normal">/ {stats.total}</span>
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FOOTER DIGITAL BULLETIN (RUNNING Ticker text ticker) */}
      <div className="w-full overflow-hidden bg-slate-900 text-slate-100 py-3 px-6 rounded-2xl border border-slate-800 shadow-xl flex items-center mt-auto">
        <div className="flex gap-2 items-center bg-blue-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-lg mr-4 uppercase shrink-0">
          <Volume2 className="h-3.5 w-3.5 animate-bounce" />
          Info Desa
        </div>
        <div className="relative w-full flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap text-xs font-bold text-slate-300 space-x-12">
            <span>Penyaluran cadangan pangan beras BULOG Pemerintah RI Alokasi Beras 20 kg dan Minyak 4 Liter untuk Keluarga Penerima Manfaat (KPM) Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung.</span>
            <span>★ Harap antri dengan tertib, sabar, dan tertata sesuai arahan petugas Meja Verifikasi Pemerintah Desa.</span>
            <span>★ Laporkan kendala administrasi Anda langsung ke bagian verifikator di Meja Pelayanan Kantor Desa Wargaluyu. Hatur nuhun.</span>
          </div>
        </div>
      </div>

    </div>
  );
}
