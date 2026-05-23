import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { QueueItem, QueueStats, BroadcastMessage } from './src/types.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_QUEUE = 1138;
const DB_FILE = path.join(process.cwd(), 'queues-db.json');

// Initialize Express App and HTTP Server
const app = express();
app.use(express.json());

const httpServer = createServer(app);

// WebSocket Server for live client notification
const wss = new WebSocketServer({ noServer: true });

// Connected WebSocket Clients
const clients = new Set<WebSocket>();

// Local Database State
let queuesState: QueueItem[] = [];
let latestCalledState: QueueItem | undefined = undefined;

// Load initial queues data from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      queuesState = parsed.queues || [];
      latestCalledState = parsed.latestCalled || undefined;
      console.log(`Database loaded successfully. Total items: ${queuesState.length}`);
    } else {
      queuesState = [];
      latestCalledState = undefined;
      console.log('No local database file found. Initializing empty queues.');
    }
  } catch (err) {
    console.error('Failed to load local database, resetting state:', err);
    queuesState = [];
    latestCalledState = undefined;
  }
}

// Save queues data to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      queues: queuesState,
      latestCalled: latestCalledState
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save state to queues-db.json:', err);
  }
}

loadDatabase();

// Lazy Supabase client setup
let supabaseClient: any = null;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

function getSupabase() {
  if (!supabaseClient && supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase client initialized successfully!');
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
    }
  }
  return supabaseClient;
}

// Write-through background synchronization to Supabase
async function syncToSupabase(item: QueueItem, operation: 'insert' | 'update' | 'delete') {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const dbPayload = {
      id: item.id,
      nomor_antrian: item.nomor_antrian,
      status: item.status,
      waktu_ambil: item.waktu_ambil,
      waktu_panggil: item.waktu_panggil || null,
      waktu_selesai: item.waktu_selesai || null
    };

    if (operation === 'insert') {
      const { error } = await supabase.from('antrian').insert([dbPayload]);
      if (error) console.warn('Supabase Insert Error (Using local fallback):', error.message);
    } else if (operation === 'update') {
      const { error } = await supabase.from('antrian').update(dbPayload).eq('nomor_antrian', item.nomor_antrian);
      if (error) console.warn('Supabase Update Error (Using local fallback):', error.message);
    } else if (operation === 'delete') {
      const { error } = await supabase.from('antrian').delete().eq('nomor_antrian', item.nomor_antrian);
      if (error) console.warn('Supabase Delete Error (Using local fallback):', error.message);
    }
  } catch (err) {
    console.warn('Supabase sync failure (Continuing locally):', err);
  }
}

async function syncAllToSupabase() {
  const supabase = getSupabase();
  if (!supabase) return;
  console.log('Syncing whole state to Supabase...');
  try {
    for (const item of queuesState) {
      await syncToSupabase(item, 'insert');
    }
  } catch (err) {
    console.warn('Sync all state failed:', err);
  }
}

async function syncFromSupabaseOnStartup() {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('Supabase is not configured yet. Using local queue file as database.');
    return;
  }
  
  try {
    console.log('Connection detected! Syncing queues from Supabase on startup...');
    const { data, error } = await supabase
      .from('antrian')
      .select('*')
      .order('nomor_antrian', { ascending: true });
      
    if (error) {
      console.error('Failed to sync from Supabase database table "antrian" on startup:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const fetchedQueues: QueueItem[] = data.map((row: any) => ({
        id: row.id,
        nomor_antrian: Number(row.nomor_antrian),
        status: row.status,
        waktu_ambil: row.waktu_ambil || new Date().toISOString(),
        waktu_panggil: row.waktu_panggil || undefined,
        waktu_selesai: row.waktu_selesai || undefined
      }));
      
      queuesState = fetchedQueues;
      
      // Determine latest called item
      const activeCalled = fetchedQueues.filter(q => q.status === 'dipanggil');
      if (activeCalled.length > 0) {
        activeCalled.sort((a, b) => {
          const ta = a.waktu_panggil ? new Date(a.waktu_panggil).getTime() : 0;
          const tb = b.waktu_panggil ? new Date(b.waktu_panggil).getTime() : 0;
          return tb - ta;
        });
        latestCalledState = activeCalled[0];
      } else {
        latestCalledState = undefined;
      }
      
      console.log(`Synced ${queuesState.length} records successfully from Supabase!`);
      saveDatabase();
    } else {
      console.log('Supabase table "antrian" is empty. Writing local database to Supabase...');
      if (queuesState.length > 0) {
        await syncAllToSupabase();
      }
    }
  } catch (err) {
    console.error('Exception during startup database sync from Supabase:', err);
  }
}

// Compute dynamic stats
function computeStats(): QueueStats {
  const stats: QueueStats = {
    total: queuesState.length,
    menunggu: 0,
    dipanggil: 0,
    verifikasi: 0,
    selesai: 0,
    dilewati: 0,
    nomor_saat_ini: 0
  };

  queuesState.forEach(item => {
    stats[item.status]++;
  });

  // Latest actively processed queue number
  const activeStatuses = ['dipanggil', 'verifikasi'];
  const activeItems = queuesState
    .filter(item => activeStatuses.includes(item.status))
    .map(item => item.nomor_antrian);

  // If none active, find the highest "selesai" or "dilewati" number, or default to 0
  if (activeItems.length > 0) {
    stats.nomor_saat_ini = Math.min(...activeItems);
  } else {
    const finishedItems = queuesState
      .filter(item => ['selesai', 'dilewati'].includes(item.status))
      .map(item => item.nomor_antrian);
    stats.nomor_saat_ini = finishedItems.length > 0 ? Math.max(...finishedItems) : 0;
  }

  return stats;
}

// Broadcast to up-to-date clients
function broadcastState(type: 'INIT' | 'UPDATE' | 'RESET' = 'UPDATE') {
  const payload: BroadcastMessage = {
    type,
    payload: {
      queues: queuesState,
      stats: computeStats(),
      latestCalled: latestCalledState,
      timestamp: Date.now()
    }
  };

  const messageStr = JSON.stringify(payload);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// --- API ENDPOINTS ---

// Check credentials info
app.get('/api/queues/config', (req, res) => {
  const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);
  res.json({
    status: 'ok',
    isSupabaseConfigured,
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : undefined,
    maxLimit: MAX_QUEUE,
    currentTime: new Date().toISOString()
  });
});

// Get all queues and stats
app.get('/api/queues', (req, res) => {
  res.json({
    queues: queuesState,
    stats: computeStats(),
    latestCalled: latestCalledState
  });
});

// Take a new queue ticket (Warga Ambil Antrian)
app.post('/api/queues/take', async (req, res) => {
  const size = queuesState.length;
  if (size >= MAX_QUEUE) {
    return res.status(400).json({ error: 'Nomor antrian hari ini sudah habis' });
  }

  // Next available number (consecutive)
  const nextNum = size + 1;

  const newTicket: QueueItem = {
    id: crypto.randomUUID(),
    nomor_antrian: nextNum,
    status: 'menunggu',
    waktu_ambil: new Date().toISOString()
  };

  queuesState.push(newTicket);
  saveDatabase();
  
  // Async update to Supabase
  await syncToSupabase(newTicket, 'insert');

  broadcastState('UPDATE');

  res.status(201).json(newTicket);
});

// Modify/Call/Update a queue item (Admin Calls)
app.post('/api/queues/call', async (req, res) => {
  const { nomor_antrian, status } = req.body;

  if (nomor_antrian === undefined || !status) {
    return res.status(400).json({ error: 'Body harus menyertakan nomor_antrian dan status' });
  }

  const num = Number(nomor_antrian);
  if (isNaN(num) || num < 1 || num > MAX_QUEUE) {
    return res.status(400).json({ error: `Nomor antrian harus berkisar antara 1 dan ${MAX_QUEUE}` });
  }

  let index = queuesState.findIndex(q => q.nomor_antrian === num);
  
  // Auto-create queue item dynamically if it was never generated from citizen taker
  if (index === -1) {
    const newTicket: QueueItem = {
      id: crypto.randomUUID(),
      nomor_antrian: num,
      status: 'menunggu',
      waktu_ambil: new Date().toISOString()
    };
    queuesState.push(newTicket);
    // Maintain ascending ticket sorted order
    queuesState.sort((a, b) => a.nomor_antrian - b.nomor_antrian);
    saveDatabase();
    
    // Store in background Supabase
    await syncToSupabase(newTicket, 'insert');
    
    // Reindex
    index = queuesState.findIndex(q => q.nomor_antrian === num);
  }

  const item = queuesState[index];
  const oldStatus = item.status;
  item.status = status;

  const now = new Date().toISOString();
  if (status === 'dipanggil') {
    item.waktu_panggil = now;
    latestCalledState = item; // Mark as currently speaking/called
  } else if (status === 'verifikasi') {
    // Moved to clerk verification desk
    item.waktu_panggil = item.waktu_panggil || now;
  } else if (status === 'selesai') {
    item.waktu_selesai = now;
    if (latestCalledState?.nomor_antrian === item.nomor_antrian) {
      latestCalledState = undefined;
    }
  } else if (status === 'dilewati') {
    item.waktu_selesai = now;
    if (latestCalledState?.nomor_antrian === item.nomor_antrian) {
      latestCalledState = undefined;
    }
  }

  queuesState[index] = item;
  saveDatabase();

  // Async sync to Supabase
  await syncToSupabase(item, 'update');

  broadcastState('UPDATE');

  res.json({ success: true, item, stats: computeStats() });
});

// Reset queue harian
app.post('/api/queues/reset', async (req, res) => {
  console.log('Resetting whole queue database...');
  
  // If Supabase is connected, drop or delete entries
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Clear target table
      const { error } = await supabase.from('antrian').delete().neq('nomor_antrian', 0);
      if (error) console.warn('Supabase failed to clear on reset:', error.message);
    } catch (e) {
      console.warn('Supabase reset error:', e);
    }
  }

  queuesState = [];
  latestCalledState = undefined;
  saveDatabase();

  broadcastState('RESET');

  res.json({ success: true, message: 'Database antrian berhasil di-reset ulang!' });
});

// Export CSV report of stats and queues
app.get('/api/queues/export', (req, res) => {
  let csv = 'No,Nomor Antrian,Status,Waktu Ambil,Waktu Dipanggil,Waktu Selesai Verifikasi,Durasi Layanan (Menit)\n';
  
  queuesState.forEach((item, idx) => {
    let durasiStr = '-';
    if (item.waktu_ambil && item.waktu_selesai) {
      const takeTime = new Date(item.waktu_ambil).getTime();
      const finishTime = new Date(item.waktu_selesai).getTime();
      const diffMs = finishTime - takeTime;
      durasiStr = (diffMs / (1000 * 60)).toFixed(1);
    }

    const formatTime = (iso?: string) => {
      if (!iso) return '-';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString('id-ID', { hour12: false });
      } catch {
        return '-';
      }
    };

    csv += `${idx + 1},Antrian #${item.nomor_antrian},${item.status},"${item.waktu_ambil ? new Date(item.waktu_ambil).toLocaleString('id-ID') : '-'}","${formatTime(item.waktu_panggil)}","${formatTime(item.waktu_selesai)}",${durasiStr}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=laporan-antrian-bulog-wargaluyu-${new Date().toISOString().split('T')[0]}.csv`);
  res.status(200).send(csv);
});


// HTTP to WS Connection Upgrade
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`New WS client connected. Current active: ${clients.size}`);

  // Send initial full sync
  ws.send(JSON.stringify({
    type: 'INIT',
    payload: {
      queues: queuesState,
      stats: computeStats(),
      latestCalled: latestCalledState,
      timestamp: Date.now()
    }
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WS client disconnected. Current active: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('WS client encountered error:', err);
    clients.delete(ws);
  });
});

// Create Vite server or serve final production static build
async function startApp() {
  // Sync state from Supabase if variables are configured
  await syncFromSupabaseOnStartup();

  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting full-stack helper in DEVELOPMENT mode (mounting Vite)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting full-stack helper in PRODUCTION mode (serving static dist)...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Sistem Antrian BULOG Wargaluyu is running natively on port http://localhost:${PORT}`);
  });
}

startApp();
