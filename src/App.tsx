import React, { useState, useEffect, useRef } from 'react';
import { Ticket, ShieldAlert, MonitorUp, BarChart4, ChevronRight, Menu, X, Info } from 'lucide-react';
import { QueueItem, QueueStats } from './types';
import AdminPanel from './components/AdminPanel';
import TVMonitor from './components/TVMonitor';
import DashboardStats from './components/DashboardStats';

export default function App() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    menunggu: 0,
    dipanggil: 0,
    verifikasi: 0,
    selesai: 0,
    dilewati: 0,
    nomor_saat_ini: 0
  });
  const [latestCalled, setLatestCalled] = useState<QueueItem | undefined>(undefined);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false);
  const [wsStatus, setWsStatus] = useState<'menghubungkan' | 'terbuka' | 'tertutup'>('menghubungkan');
  const [showNav, setShowNav] = useState(true); // collapsible testing nav for previewers

  // Hash-based Client-Side Routing
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const hash = window.location.hash;
    if (hash === '#/monitor') return 'monitor';
    if (hash === '#/stats') return 'stats';
    return 'admin';
  });

  // Keep hash in-sync
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/monitor') setCurrentTab('monitor');
      else if (hash === '#/stats') setCurrentTab('stats');
      else setCurrentTab('admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const changeTab = (tab: string) => {
    setCurrentTab(tab);
    window.location.hash = tab === 'admin' ? '#/' : `#/${tab}`;
  };

  // Setup initial REST API load
  const loadState = async () => {
    try {
      const res = await fetch('/api/queues');
      if (res.ok) {
        const data = await res.json();
        setQueues(data.queues || []);
        setStats(data.stats || {});
        setLatestCalled(data.latestCalled || undefined);
      }
    } catch (e) {
      console.warn('Initial REST sync failure:', e);
    }
  };

  // Fetch Supabase & config properties
  useEffect(() => {
    fetch('/api/queues/config')
      .then(res => res.json())
      .then(data => {
        setIsSupabaseConfigured(data.isSupabaseConfigured);
      })
      .catch(() => {});
    
    loadState();
  }, []);

  // Web Socket Realtime Listener with Automatic Fallback HTTP Polling
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      setWsStatus('menghubungkan');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Realtime WebSocket connection opened successfully!');
          setWsStatus('terbuka');
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'INIT' || data.type === 'UPDATE' || data.type === 'RESET') {
              setQueues(data.payload.queues || []);
              setStats(data.payload.stats || {});
              setLatestCalled(data.payload.latestCalled || undefined);
            }
          } catch (err) {
            console.error('Failed to parse websocket message:', err);
          }
        };

        ws.onclose = () => {
          console.warn('WebSocket closed. Reconnecting or falling back...');
          setWsStatus('tertutup');
          // Trigger failover interval state polling immediately to ensure it remains live
          if (!pollInterval) {
            pollInterval = setInterval(loadState, 2000);
          }
          // Retry connecting WS after 5s
          setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };

      } catch (e) {
        console.warn('WebSocket creation failed, using HTTP polling backup:', e);
        setWsStatus('tertutup');
        if (!pollInterval) {
          pollInterval = setInterval(loadState, 2000);
        }
      }
    };

    connectWebSocket();

    return () => {
      ws?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // API Call: Take a new ticket
  const handleTakeQueue = async (): Promise<QueueItem | null> => {
    try {
      const res = await fetch('/api/queues/take', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Optimistically reload locally
        await loadState();
        return data;
      }
    } catch (e) {
      console.error('Take queue error:', e);
    }
    return null;
  };

  // API Call: Officer updates queue status
  const handleCallQueue = async (nomor: number, status: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/queues/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomor_antrian: nomor, status })
      });
      if (res.ok) {
        await loadState();
        return true;
      }
    } catch (e) {
      console.error('Call update queue error:', e);
    }
    return false;
  };

  // API Call: Reset queue
  const handleResetQueue = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/queues/reset', { method: 'POST' });
      if (res.ok) {
        await loadState();
        return true;
      }
    } catch (e) {
      console.error('Reset queue database error:', e);
    }
    return false;
  };

  const handleExportReport = () => {
    window.open('/api/queues/export', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      
      {/* Floating Collapsible Tester Bar to switch screens in AI Studio Preview */}
      <div className="fixed bottom-4 left-4 z-50">
        {!showNav ? (
          <button
            onClick={() => setShowNav(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg border border-blue-400 flex items-center justify-center transition-transform hover:scale-115 active:scale-90"
            title="Buka Navigasi Simulasi"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          <div className="bg-white text-slate-800 p-5 rounded-3xl shadow-2xl border-2 border-slate-200/60 w-80 transition-all animate-fade-in">
            <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-200">
              <span className="text-[10px] font-black text-rose-600 tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                <Info className="h-4 w-4" />
                SIMULATOR LAYAR MULTI-DEVICES
              </span>
              <button
                onClick={() => setShowNav(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
              Pilih mode tampilan untuk simulasi multi-perangkat penyaluran beras Desa Wargaluyu secara realtime:
            </p>

            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => changeTab('admin')}
                className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center justify-between ${
                  currentTab === 'admin' ? 'bg-slate-900 text-white border-l-4 border-amber-400' : 'hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  📱 Panel HP Petugas (Admin)
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => changeTab('monitor')}
                className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center justify-between ${
                  currentTab === 'monitor' ? 'bg-blue-50 text-blue-900 border-l-4 border-blue-600' : 'hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MonitorUp className="h-4 w-4 text-blue-600" />
                  🖥️ Tampilan TV Monitor
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => changeTab('stats')}
                className={`w-full text-left p-2.5 rounded-xl font-bold flex items-center justify-between ${
                  currentTab === 'stats' ? 'bg-amber-5 border-l-4 border-[#F59E0B] text-amber-900' : 'hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart4 className="h-4 w-4 text-[#F59E0B]" />
                  📊 Dashboard Statistik Desa
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 text-slate-400 text-[9px] flex justify-between items-center">
              <span>Status Event: <strong className={wsStatus === 'terbuka' ? 'text-emerald-500':'text-amber-500'}>{wsStatus}</strong></span>
              <span>Supabase: <strong>{isSupabaseConfigured ? 'ON':'OFF'}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB PAGE VIEW */}
      <div>
        {currentTab === 'admin' && (
          <AdminPanel
            queues={queues}
            stats={stats}
            onCallQueue={handleCallQueue}
            onResetQueue={handleResetQueue}
            onTakeQueue={handleTakeQueue}
          />
        )}

        {currentTab === 'monitor' && (
          <TVMonitor
            queues={queues}
            stats={stats}
            latestCalled={latestCalled}
          />
        )}

        {currentTab === 'stats' && (
          <DashboardStats
            queues={queues}
            stats={stats}
            onExportReport={handleExportReport}
            isSupabaseConfigured={isSupabaseConfigured}
          />
        )}
      </div>

    </div>
  );
}
