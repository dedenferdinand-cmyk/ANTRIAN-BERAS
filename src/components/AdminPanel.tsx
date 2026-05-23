import React, { useState } from 'react';
import { Volume2, CheckCircle, Navigation, ShieldCheck, UserX, Lock, Play, Maximize2, Minimize2, Trash2, ListOrdered, ChevronRight, Ban, Ticket } from 'lucide-react';
import { QueueItem, QueueStats } from '../types';

interface AdminPanelProps {
  queues: QueueItem[];
  stats: QueueStats;
  onCallQueue: (nomor: number, status: string) => Promise<boolean>;
  onResetQueue: () => Promise<boolean>;
  onTakeQueue?: () => Promise<any>;
}

export default function AdminPanel({ queues, stats, onCallQueue, onResetQueue, onTakeQueue }: AdminPanelProps) {
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('bulog_wargaluyu_admin') === 'true';
  });
  const [loginError, setLoginError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedNumInput, setSelectedNumInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'menunggu' | 'dipanggil' | 'selesai' | 'dilewati'>('semua');

  // Handle simple login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '12345' || pin === 'admin') {
      setIsLoggedIn(true);
      localStorage.setItem('bulog_wargaluyu_admin', 'true');
      setLoginError('');
    } else {
      setLoginError('PIN Admin salah! Gunakan PIN default: 12345');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('bulog_wargaluyu_admin');
  };

  // Toggle Screen Fullscreen Mode for Admin Handsets
  const toggleFullscreen = () => {
    const docEl = document.documentElement;
    if (!fullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setFullscreen(false);
    }
  };

  // Find next waiting queue ticket
  const nextWaitingItem = queues.find(q => q.status === 'menunggu');
  const activeCallingItem = queues.find(q => q.status === 'dipanggil');

  // Determine next consecutive number if no waiting item exists
  const maxRegisteredNum = queues.reduce((max, q) => q.nomor_antrian > max ? q.nomor_antrian : max, 0);
  const nextConsecutiveNum = maxRegisteredNum + 1 <= 1138 ? maxRegisteredNum + 1 : null;

  const [isAddingTicket, setIsAddingTicket] = useState(false);

  const handleAddTicket = async () => {
    if (!onTakeQueue) return;
    if (queues.length >= 1138) {
      alert('Telah mencapai batas maksimal 1138 antrian harian.');
      return;
    }
    setIsAddingTicket(true);
    try {
      const ticket = await onTakeQueue();
      if (ticket) {
        // Simple elegant feedback
      }
    } catch (e) {
      console.warn('Gagal menambahkan antrian:', e);
    } finally {
      setIsAddingTicket(false);
    }
  };

  const triggerCall = async (num: number, status: string) => {
    await onCallQueue(num, status);
  };

  // Call the single next queue item in list
  const handleCallNext = async () => {
    if (nextWaitingItem) {
      await triggerCall(nextWaitingItem.nomor_antrian, 'dipanggil');
    } else if (nextConsecutiveNum) {
      await triggerCall(nextConsecutiveNum, 'dipanggil');
    } else {
      alert('Telah mencapai batas maksimal 1138 antrian harian.');
    }
  };

  // Handler for manual jumper number
  const handleManualCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(selectedNumInput, 10);
    if (!num || num < 1 || num > 1138) {
      alert('Masukkan nomor antrian yang valid (1-1138)');
      return;
    }
    await triggerCall(num, 'dipanggil');
    setSelectedNumInput('');
  };

  const handleReset = async () => {
    if (window.confirm('PERINGATAN KRITIS: Anda akan menghapus seluruh data antrian hari ini dan memulai ulang dari 0. Yakin ingin melanjutkan?')) {
      const confirmPin = prompt('Masukkan PIN Admin untuk konfirmasi reset harian (Default: 12345):');
      if (confirmPin === '12345' || confirmPin === 'admin') {
        await onResetQueue();
        alert('Database antrian berhasil di-reset ke 0!');
      } else {
        alert('PIN salah. Proses reset dibatalkan.');
      }
    }
  };

  // Filter queues
  const filteredQueues = queues.filter(q => {
    if (filterStatus === 'semua') return true;
    return q.status === filterStatus;
  });

  // Login Screen render
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 text-[#1E40AF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Login Petugas Desa</h2>
            <p className="text-xs text-slate-400 mt-1">Konfirmasi otorisasi penyaluran beras BULOG</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">PIN AKSES PETUGAS</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Masukkan PIN (Default: 12345)"
                  className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-center font-bold tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  autoFocus
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-1.5 text-center">Petunjuk: Masukkan PIN <span className="font-bold text-blue-600">12345</span> untuk login langsung.</span>
            </div>

            {loginError && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg text-center border border-red-100">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition duration-200 shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Masuk ke Panel Kontrol
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col ${fullscreen ? 'p-0' : 'p-4'}`}>
      
      {/* Control Header BAR */}
      <div className="bg-slate-800 rounded-2xl px-4 py-3 flex justify-between items-center gap-2 border border-slate-700/50 mb-4 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping" />
          <div>
            <span className="text-slate-400 text-[10px] font-mono block">TERMINAL HP PETUGAS</span>
            <span className="font-black text-xs md:text-sm tracking-tight text-white uppercase">Meja Verifikasi</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleFullscreen}
            title="Layar Penuh"
            className="p-2 text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="text-[10px] bg-red-900/40 border border-red-500/40 text-red-300 font-bold px-3 py-2 rounded-lg hover:bg-red-900 transition-colors"
          >
            Selesai Tugas
          </button>
        </div>
      </div>

      {/* Grid containing Dialer buttons & live counters */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Column 1: Core dialer controls of the queue */}
        <div className="lg:col-span-2 bg-slate-800 rounded-3xl border border-slate-700/50 p-5 flex flex-col justify-between shadow-2xl space-y-5">
          
          {/* Dashboard State displaying */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Antrian Dipanggil</span>
              <span className="text-3xl font-black text-amber-400">
                {activeCallingItem ? `#${activeCallingItem.nomor_antrian}` : '-'}
              </span>
            </div>
            
            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Sisa Menunggu</span>
              <span className="text-3xl font-black text-blue-400">
                {stats.menunggu} <span className="text-xs text-slate-500">Orang</span>
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Dilayani</span>
              <span className="text-3xl font-black text-[#10B981]">
                {stats.selesai}
              </span>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/30">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Dilewati</span>
              <span className="text-3xl font-black text-red-400">
                {stats.dilewati}
              </span>
            </div>
          </div>

          {/* Core Huge Tap Targets (optimized for touch screens) */}
          <div className="space-y-3 my-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tambah/Registrasi Antrian Baru */}
              <button
                id="admin-btn-add-ticket"
                onClick={handleAddTicket}
                disabled={isAddingTicket || queues.length >= 1138}
                className={`py-6 md:py-8 font-black text-xl rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 border-2 ${
                  queues.length < 1138
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-xl shadow-emerald-500/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-700/30 text-slate-500 border-dashed border-slate-600/50 cursor-not-allowed'
                }`}
              >
                <Ticket className="h-7 w-7" />
                TAMBAH ANTRIAN (AMBIL TIKET)
                <span className="text-xs font-mono text-emerald-200 mt-1 uppercase font-semibold">
                  TIKET BERIKUTNYA: #{queues.length + 1 <= 1138 ? queues.length + 1 : 'HABIS'}
                </span>
              </button>

              {/* Call Next Button - Extra LARGE */}
              <button
                id="admin-btn-call-next"
                onClick={handleCallNext}
                disabled={!nextWaitingItem && !nextConsecutiveNum}
                className={`py-6 md:py-8 font-black text-xl rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 border-2 ${
                  (nextWaitingItem || nextConsecutiveNum)
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-xl shadow-blue-500/20 active:scale-95 cursor-pointer'
                    : 'bg-slate-700/30 text-slate-500 border-dashed border-slate-600/50 cursor-not-allowed'
                }`}
              >
                <Volume2 className={`h-7 w-7 ${(nextWaitingItem || nextConsecutiveNum) ? 'animate-bounce' : ''}`} />
                PANGGIL BERIKUTNYA
                {(nextWaitingItem || nextConsecutiveNum) && (
                  <span className="text-xs font-mono text-blue-200 mt-1 uppercase font-semibold">
                    MEMANGGIL NO: #{nextWaitingItem ? nextWaitingItem.nomor_antrian : nextConsecutiveNum}
                  </span>
                )}
              </button>
            </div>

            {/* Secondary operations grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* RE-CALL (Panggil Ulang) */}
              <button
                id="admin-btn-recall"
                onClick={() => activeCallingItem && triggerCall(activeCallingItem.nomor_antrian, 'dipanggil')}
                disabled={!activeCallingItem}
                className={`py-4 px-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-transform duration-100 ${
                  activeCallingItem
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 active:scale-95'
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Volume2 className="h-5 w-5" />
                Panggil Ulang
              </button>

              {/* FINISH (Selesai Verifikasi) */}
              <button
                id="admin-btn-verify-done"
                onClick={() => activeCallingItem && triggerCall(activeCallingItem.nomor_antrian, 'verifikasi')}
                disabled={!activeCallingItem}
                className={`py-4 px-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-transform duration-100 ${
                  activeCallingItem
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="h-5 w-5" />
                Verifikasi Desk
              </button>

              {/* SKIP (Lewati Warga) */}
              <button
                id="admin-btn-skip"
                onClick={() => activeCallingItem && triggerCall(activeCallingItem.nomor_antrian, 'dilewati')}
                disabled={!activeCallingItem}
                className={`py-4 px-4 font-black rounded-2xl flex items-center justify-center gap-2 transition-transform duration-100 ${
                  activeCallingItem
                    ? 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
                    : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                }`}
              >
                <UserX className="h-5 w-5" />
                Lewati
              </button>

            </div>

          </div>

          {/* Quick Manual jump bar or Admin utilities */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-t border-slate-700/40 pt-4 text-xs">
            
            {/* Manual Jump Form */}
            <form onSubmit={handleManualCall} className="flex gap-2 w-full md:w-auto">
              <input
                type="number"
                placeholder="Panggil No Manual (1-1138)"
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 w-full md:w-56 font-bold text-center text-slate-200 focus:outline-none focus:border-blue-500"
                value={selectedNumInput}
                onChange={(e) => setSelectedNumInput(e.target.value)}
              />
              <button
                type="submit"
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-white font-bold flex items-center gap-1 shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                Dihubungi
              </button>
            </form>

            {/* Quick manual state changer if something else needs serving */}
            <button
              onClick={handleReset}
              className="w-full md:w-auto bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-95 transition-all text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Mulai Dari 0 (Reset)
            </button>
          </div>

        </div>

        {/* Column 2: Live ticket list visualization & actions */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700/50 p-4 shadow-2xl flex flex-col h-[450px] lg:h-auto">
          
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-extrabold text-sm tracking-widest text-[#10B981] flex items-center gap-1.5 uppercase">
              <ListOrdered className="h-4 w-4" />
              Daftar Antrian
            </h3>
            
            <span className="text-xs bg-slate-900 px-2 py-1 rounded-md text-emerald-400 font-mono">
              {filteredQueues.length} Items
            </span>
          </div>

          {/* Filter badges */}
          <div className="grid grid-cols-5 gap-1 mb-3">
            {(['semua', 'menunggu', 'dipanggil', 'selesai', 'dilewati'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`py-1 text-[9px] font-bold rounded-lg capitalize truncate transition-colors ${
                  filterStatus === f
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Interactive Scrollable queue list */}
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredQueues.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Tidak ada antrian dengan filter ini
              </div>
            ) : (
              filteredQueues.map(item => {
                
                // Color mapping
                let statusBg = 'bg-slate-900/40 text-slate-400';
                if (item.status === 'menunggu') statusBg = 'bg-blue-900/20 text-blue-400 border border-blue-500/20';
                if (item.status === 'dipanggil') statusBg = 'bg-amber-400 text-slate-950 border border-amber-500';
                if (item.status === 'verifikasi') statusBg = 'bg-indigo-900 text-indigo-200 border border-indigo-500/40';
                if (item.status === 'selesai') statusBg = 'bg-emerald-950 text-emerald-300 border border-emerald-500/30';
                if (item.status === 'dilewati') statusBg = 'bg-red-950 text-red-300 border border-red-500/30';

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 p-2.5 rounded-xl flex justify-between items-center border border-slate-800 hover:border-slate-700 transition-all text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-slate-200 block text-sm">
                        Antrian #{item.nomor_antrian}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {new Date(item.waktu_ambil).toLocaleTimeString('id-ID', { hour12: false })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${statusBg}`}>
                        {item.status}
                      </span>

                      {/* Force jump button */}
                      {item.status !== 'selesai' && item.status !== 'dilewati' ? (
                        <div className="flex gap-1">
                          {item.status === 'menunggu' && (
                            <button
                              onClick={() => triggerCall(item.nomor_antrian, 'dipanggil')}
                              className="bg-blue-600 hover:bg-blue-500 p-1 rounded-md text-white font-bold text-[10px]"
                              title="Panggil Antrian Ini"
                            >
                              Panggil
                            </button>
                          )}
                          {item.status === 'dipanggil' && (
                            <>
                              <button
                                onClick={() => triggerCall(item.nomor_antrian, 'selesai')}
                                className="bg-emerald-600 hover:bg-emerald-500 p-1 rounded-md text-white font-bold text-[10px]"
                              >
                                Selesai
                              </button>
                              <button
                                onClick={() => triggerCall(item.nomor_antrian, 'dilewati')}
                                className="bg-red-600 hover:bg-red-500 p-1 rounded-md text-white font-bold text-[10px]"
                              >
                                Lewat
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
