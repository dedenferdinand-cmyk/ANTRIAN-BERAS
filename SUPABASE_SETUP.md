# Panduan Setup Supabase & Vercel
## Sistem Antrian Beras BULOG - Desa Wargaluyu

Panduan lengkap ini menjelaskan langkah demi langkah untuk melakukan konfigurasi Database Supabase, meluncurkan replikasi real-time, memahami struktur folder, dan melakukan deployment aplikasi ke production.

---

### 1. Struktur Folder Project

Aplikasi ini dirancang dengan struktur full-stack modern yang sangat ramah pemeliharaan:

```text
/
├── .env.example               # Contoh konfigurasi environment variable
├── index.html                 # Entrypoint index halaman HTML klien
├── package.json               # Konfigurasi dependensi NPM dan script build/start
├── server.ts                  # Backend Express Server, WebSocket hub & API Supabase
├── SUPABASE_SETUP.md          # Dokumen panduan integrasi ini
├── src/
│   ├── main.tsx               # Entrypoint inisiasi React
│   ├── index.css              # Setup styles CSS global menggunakan Tailwind CSS
│   ├── App.tsx                # Panel Router utama, WS client & koordinasi tab
│   ├── types.ts               # Definisi format data QueueItem, Stats & Broadcast
│   └── components/
│       ├── BulogLogo.tsx      # Representasi logo vektor BULOG (SVG modern)
│       ├── VillageLogo.tsx    # Representasi logo Pemdes Wargaluyu (SVG modern)
│       ├── TakeQueuePage.tsx  # Halaman layanan ambil nomor antrian warga mandiri
│       ├── AdminPanel.tsx     # Panel pemanggil antrian HP android petugas (PIN: 12345)
│       ├── TVMonitor.tsx      # Tampilan TV monitor dengan efek panggil & TTS suara otomatis
│       └── DashboardStats.tsx # Halaman bento statistik, progres & unduh CSV Excel
```

---

### 2. Skema Database Supabase

Masuk ke **Supabase Dashboard** ([https://supabase.com](https://supabase.com)) -> Pilih project Anda -> Jelajahi **SQL Editor** -> Jalankan query SQL berikut untuk membuat tabel `antrian` dan mengaktifkan integrasi Real-time:

```sql
-- 1. Buat tabel antrian
CREATE TABLE public.antrian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_antrian INT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'menunggu', -- 'menunggu', 'dipanggil', 'verifikasi', 'selesai', 'dilewati'
  waktu_ambil TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  waktu_panggil TIMESTAMP WITH TIME ZONE,
  waktu_selesai TIMESTAMP WITH TIME ZONE
);

-- 2. Beri hak akses (Rls bypass atau beri ijin ke anon role)
ALTER TABLE public.antrian ENABLE ROW LEVEL SECURITY;

-- 3. Policy agar anon bisa select, insert dan update
CREATE POLICY "Allow anon select" ON public.antrian FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.antrian FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.antrian FOR UPDATE USING (true);

-- 4. Aktifkan Replikasi Realtime ke tabel antrian
ALTER PUBLICATION supabase_realtime ADD TABLE public.antrian;
```

---

### 3. Konfigurasi Environment Variables (`.env`)

Isi parameter kunci API Supabase Anda di panel rahasia (Secrets) AI Studio atau di dalam berkas `.env` local:

```env
# URL Supabase Anda (bisa didapatkan di Project Settings -> API)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Public anon key Supabase Anda
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsIn..."
```

> **Catatan:** Sistem ini dilengkapi dengan **Dual-Mode Sync**. Jika variabel `.env` di atas diisi, sistem akan mencadangkan status ke Supabase. Jika kosong, sistem tetap berjalan 100% normal dan real-time menggunakan database lokal (`queues-db.json`) dan WebSocket Express port 3000!

---

### 4. Cara Deploy ke Vercel

Karena aplikasi ini menggunakan Server Express (`server.ts`) yang menangani koneksi WebSocket secara real-time dari TV Monitor dan HP android secara simultan, opsi serverless murni (seperti standard Vercel JSON API) kadang membatasi koneksi WebSocket yang panjang.

Berikut jalur rekomendasi deployment terbaik:

#### Opsi A: Cloud Run / Docker (Sangat direkomendasikan untuk real-time WebSocket)
Aplikasi ini sudah dikonfigurasi 100% cloud-native siap dideploy di Docker/Cloud Run secara instan menggunakan standard start:
```bash
npm run build
npm run start
```

#### Opsi B: Vercel (Menggunakan model API Route Serverless)
Jika Anda tetap ingin meluncurkan Frontend statik di Vercel dan menghubungkannya dengan endpoint database Supabase secara langsung:
1. Push kode repository ini ke GitHub.
2. Sambungkan repo ke **Dashboard Vercel**.
3. Daftarkan variabel lingkungan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di menu **Vercel Project Settings -> Environment Variables**.
4. Klik **Deploy**. Frontend akan aktif secara global dan melakukan sinkronisasi real-time langsung ke tabel DB Supabase.
