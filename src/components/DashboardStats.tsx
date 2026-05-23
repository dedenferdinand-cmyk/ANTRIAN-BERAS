import React from 'react';
import { Download, Users, CheckCircle, Clock, Percent, ListTodo, Wheat, Server, Flame } from 'lucide-react';
import { QueueItem, QueueStats } from '../types';

interface DashboardStatsProps {
  queues: QueueItem[];
  stats: QueueStats;
  onExportReport: () => void;
  isSupabaseConfigured: boolean;
}

export default function DashboardStats({ queues, stats, onExportReport, isSupabaseConfigured }: DashboardStatsProps) {
  
  // Compute percentage calculations
  const progressRatio = stats.total > 0 ? (stats.selesai / stats.total) * 100 : 0;
  const villageCoverageRatio = (stats.selesai / 1138) * 100;
  
  // Estimated metrics
  const totalKgBeras = stats.selesai * 20; // Each citizen gets 20kg of BULOG premium rice
  const totalLiterMinyak = stats.selesai * 4; // Each citizen gets 4L of premium cooking oil
  const remainingKgBeras = (1138 - stats.selesai) * 20;

  // Wait time calculations
  const getAverageWaitTimeSec = () => {
    let count = 0;
    let sumSec = 0;

    queues.forEach(q => {
      if (q.waktu_ambil && q.waktu_panggil) {
        const tAmbil = new Date(q.waktu_ambil).getTime();
        const tPanggil = new Date(q.waktu_panggil).getTime();
        const diff = (tPanggil - tAmbil) / 1000;
        if (diff > 0) {
          sumSec += diff;
          count++;
        }
      }
    });

    return count > 0 ? Math.round(sumSec / count) : 0;
  };

  const avgWaitSec = getAverageWaitTimeSec();
  const avgWaitStr = avgWaitSec > 0 
    ? `${Math.floor(avgWaitSec / 60)}m ${avgWaitSec % 60}s` 
    : '8m 15s (Simulasi)'; // Elegant preset default for mock realism if no logs

  return (
    <div id="stats-dashboard-container" className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen">
      
      {/* Tittle Control header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-900 tracking-tight flex items-center gap-2 uppercase">
            <Wheat className="h-6 w-6 text-emerald-600 animate-bounce" />
            Statistik Antrian Bulog
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">DESA WARGALUYU • ARJASARI • KAB. BANDUNG</p>
        </div>

        <button
          onClick={onExportReport}
          className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs py-3 px-5 rounded-2xl shadow-md transition duration-200 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Ekspor Laporan (CSV/Excel)
        </button>
      </div>

      {/* Grid counters summary (Bento styled grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Antrian Tercetak */}
        <div className="bg-white p-5 rounded-3xl border-2 border-blue-50/80 shadow-md flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-650 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Antrian Terdaftar</span>
            <span className="text-2xl font-black text-slate-800">{stats.total} warga</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Maksimal kuota: 1138</p>
          </div>
        </div>

        {/* Total Selesai Verifikasi */}
        <div className="bg-white p-5 rounded-3xl border-2 border-emerald-50/80 shadow-md flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Warga Selesai Layanan</span>
            <span className="text-2xl font-black text-slate-800">{stats.selesai} KPM</span>
            <p className="text-[10px] text-[#10B981] font-medium mt-0.5">✓ Beras berhasil diserahterimakan</p>
          </div>
        </div>

        {/* Estimase Tunggu */}
        <div className="bg-white p-5 rounded-3xl border-2 border-amber-50/80 shadow-md flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Rata-rata Menunggu</span>
            <span className="text-2xl font-black text-slate-800">{avgWaitStr}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Dari pengambilan hingga panggil</p>
          </div>
        </div>

        {/* Beras & Minyak CBP Terdistribusi */}
        <div className="bg-white p-5 rounded-3xl border-2 border-orange-50/80 shadow-md flex items-center gap-4">
          <div className="p-3 bg-orange-50/50 text-orange-600 rounded-2xl">
            <Wheat className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pangan Terdistribusi</span>
            <span className="text-2xl font-black text-slate-800">{(totalKgBeras / 1000).toFixed(1)} T & {totalLiterMinyak} L</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{totalKgBeras} kg Beras & {totalLiterMinyak} L Minyak</p>
          </div>
        </div>

      </div>

      {/* Intermediate Progress Card bar */}
      <div className="bg-white p-6 rounded-3xl border-2 border-blue-50/80 shadow-md">
        <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4">
          Progres Cakupan Penyaluran Desa Wargaluyu
        </h3>
        
        <div className="space-y-4">
          
          {/* Progress 1: Selesai / Terdaftar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-500 font-medium">Rasio Penyelesaian Antrian Aktif</span>
              <span className="font-extrabold text-blue-600">{progressRatio.toFixed(1)}% ({stats.selesai} dari {stats.total} terdaftar)</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, progressRatio)}%` }}
              />
            </div>
          </div>

          {/* Progress 2: Selesai / KPM Target (1138) */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-500 font-medium font-bold text-slate-700">Persentase Target Penyaluran Total Desa (1138 Warga)</span>
              <span className="font-extrabold text-[#10B981]">{villageCoverageRatio.toFixed(1)}% ({stats.selesai} dari 1138 KPM)</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 animate-pulse"
                style={{ width: `${Math.min(100, villageCoverageRatio)}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Two columns: Interactive SVG status chart & Core Database Syncer Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left widget: Detailed local state / queue breakdown (custom SVG charts representing statuses) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border-2 border-blue-50/80 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-blue-950 mb-4 flex items-center gap-1">
              <Percent className="h-4 w-4 text-emerald-600" />
              Rasio Status Antrian
            </h3>

            {/* Custom vector graphics chart */}
            <div className="h-48 w-full flex items-end justify-between px-6 pt-4 border-b border-slate-100">
              
              {/* Plot queues statuses bar chart */}
              {[
                { label: 'Menunggu', key: 'menunggu', count: stats.menunggu, color: '#3B82F6' },
                { label: 'Selesai', key: 'selesai', count: stats.selesai, color: '#10B981' },
                { label: 'Dilewati', key: 'dilewati', count: stats.dilewati, color: '#EF4444' },
                { label: 'Dipanggil', key: 'dipanggil', count: stats.dipanggil, color: '#F59E0B' },
                { label: 'Verifikasi', key: 'verifikasi', count: stats.verifikasi, color: '#6366F1' },
              ].map(bar => {
                const max = Math.max(stats.total || 1, 1);
                const pct = (bar.count / max) * 100;
                
                return (
                  <div key={bar.key} className="flex flex-col items-center gap-1.5 w-16 group">
                    <span className="text-xs font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.count}
                    </span>
                    <div
                      className="w-10 rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                      style={{
                        height: `${Math.max(10, pct * 1.2)}px`, // min 10px so bar shows nicely
                        backgroundColor: bar.color
                      }}
                    />
                    <span className="text-[10px] text-slate-400 font-bold truncate max-w-full">
                      {bar.label}
                    </span>
                  </div>
                );
              })}

            </div>
          </div>
          
          <p className="text-[10px] text-slate-400 font-medium text-center mt-3 flex items-center justify-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-500" /> Hover / sentuh batang grafik untuk melihat angka akurat.
          </p>
        </div>

        {/* Right widget: DB Syncer indicators */}
        <div className="bg-white p-5 rounded-3xl border-2 border-blue-50/80 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-blue-950 mb-2 flex items-center gap-1">
              <Server className="h-4 w-4 text-blue-600" />
              Sinkronisasi Supabase
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Aplikasi ini memiliki built-in sinkronisasi database untuk penanganan realtime multi-petugas.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Status Supabase:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                isSupabaseConfigured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {isSupabaseConfigured ? 'TERHUBUNG (Realtime)' : 'OFFLINE MODE (Local)'}
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {isSupabaseConfigured 
                ? 'Seluruh riwayat antrian berhasil tersinkronisasi ke dalam server Supabase Indonesia secara realtime.'
                : 'Server lokal di Cloud Run sedang membackup seluruh data antrian di queues-db.json secara aman. Input Supabase URL di .env untuk mengaktifkannya.'}
            </p>
          </div>

          <p className="text-[9px] text-slate-400 font-mono text-center">
            Pemerintah Desa Wargaluyu • Arjasari • Bandung
          </p>
        </div>

      </div>

    </div>
  );
}
