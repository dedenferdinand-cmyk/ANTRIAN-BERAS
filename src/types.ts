/**
 * Types for BULOG Wargaluyu Queue System
 */

export type QueueStatus = 'menunggu' | 'dipanggil' | 'verifikasi' | 'selesai' | 'dilewati';

export interface QueueItem {
  id: string;
  nomor_antrian: number;
  status: QueueStatus;
  waktu_ambil: string;
  waktu_panggil?: string;
  waktu_selesai?: string;
}

export interface QueueStats {
  total: number;
  menunggu: number;
  dipanggil: number;
  verifikasi: number;
  selesai: number;
  dilewati: number;
  nomor_saat_ini: number;
}

export interface BroadcastMessage {
  type: 'INIT' | 'UPDATE' | 'RESET' | 'STATS';
  payload: {
    queues: QueueItem[];
    stats: QueueStats;
    latestCalled?: QueueItem;
    timestamp: number;
  };
}
