/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  PlusCircle, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Flame, 
  Image as ImageIcon, 
  Trash2, 
  Edit, 
  Save, 
  LogOut,
  ChevronRight,
  X,
  Camera,
  Check,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, Session, Direction, Strategy, GoogleSheetsConfig, JournalStats } from './types';

// --- Constants ---
const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/JPY', 'XAU/USD'];
const JOURNALS = [
  { id: 'j1', emoji: '📈', color: '#3B82F6' },
  { id: 'j2', emoji: '📉', color: '#10B981' },
  { id: 'j3', emoji: '💰', color: '#F59E0B' }
];

// --- Utils ---
const formatCurrency = (val: number) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
const formatPercent = (val: number) => val.toFixed(2) + '%';
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const getSession = (dateStr: string): Session => {
  const date = new Date(dateStr);
  const hour = date.getUTCHours();
  if (hour >= 0 && hour < 12) return 'Asie';
  if (hour >= 7 && hour < 16) return 'Londres';
  if (hour >= 12 && hour < 21) return 'New York';
  return 'Hors Session';
};

const calculateDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 0) return '0 min';
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (days > 0) return `${days}j ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}min`;
  return `${mins}min`;
};

// --- Components ---

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => (
  <motion.div 
    initial={{ x: 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 100, opacity: 0 }}
    className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border ${
      type === 'success' ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'
    }`}
  >
    {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    <span className="font-medium">{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={16} /></button>
  </motion.div>
);

export default function App() {
  // --- State ---
  const [currentJournalId, setCurrentJournalId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings' | 'new'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalNames, setJournalNames] = useState<Record<string, string>>({ j1: 'Journal 1', j2: 'Journal 2', j3: 'Journal 3' });
  const [sheetsConfigs, setSheetsConfigs] = useState<Record<string, GoogleSheetsConfig>>({});
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);
  const [viewingTradeId, setViewingTradeId] = useState<string | null>(null);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  // --- Load Data ---
  useEffect(() => {
    const savedJournalId = localStorage.getItem('current-journal-id');
    const savedNames = localStorage.getItem('journal-names');
    const savedConfigs = localStorage.getItem('sheets-configs');
    
    if (savedJournalId) setCurrentJournalId(savedJournalId);
    else setCurrentJournalId('j1');

    if (savedNames) setJournalNames(JSON.parse(savedNames));
    if (savedConfigs) setSheetsConfigs(JSON.parse(savedConfigs));

    // Check Google Connection Status
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsGoogleConnected(data.connected));

    // Listen for OAuth Success
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleConnected(true);
        addToast('Google Sheets connecté !');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (currentJournalId) {
      localStorage.setItem('current-journal-id', currentJournalId);
      const config = sheetsConfigs[currentJournalId];
      if (config?.spreadsheetId && isGoogleConnected) {
        fetch(`/api/trades?spreadsheetId=${config.spreadsheetId}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setTrades(data);
          })
          .catch(err => console.error("Failed to fetch trades", err));
      } else {
        const savedTrades = localStorage.getItem(`t-${currentJournalId}`);
        if (savedTrades) setTrades(JSON.parse(savedTrades));
        else setTrades([]);
      }
    }
  }, [currentJournalId, sheetsConfigs, isGoogleConnected]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const saveTrades = (newTrades: Trade[]) => {
    if (!currentJournalId) return;
    setTrades(newTrades);
    localStorage.setItem(`t-${currentJournalId}`, JSON.stringify(newTrades));
  };

  // --- Stats Calculation ---
  const stats = useMemo((): JournalStats => {
    if (trades.length === 0) return { totalTrades: 0, winRate: 0, totalPnl: 0, avgPnl: 0, bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0 };
    const wins = trades.filter(t => t.pnlAmount > 0);
    const losses = trades.filter(t => t.pnlAmount < 0);
    const totalPnl = trades.reduce((acc, t) => acc + t.pnlAmount, 0);
    return {
      totalTrades: trades.length,
      winRate: (wins.length / trades.length) * 100,
      totalPnl,
      avgPnl: totalPnl / trades.length,
      bestTrade: Math.max(...trades.map(t => t.pnlAmount)),
      worstTrade: Math.min(...trades.map(t => t.pnlAmount)),
      avgWin: wins.length > 0 ? wins.reduce((acc, t) => acc + t.pnlAmount, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((acc, t) => acc + t.pnlAmount, 0) / losses.length : 0,
    };
  }, [trades]);

  // --- Handlers ---
  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    if (!currentJournalId) return;
    
    const newTrade: Trade = {
      id: editingTradeId || Math.random().toString(36).substr(2, 9),
      pair: tradeData.pair || PAIRS[0],
      direction: tradeData.direction || 'BUY',
      entryDate: tradeData.entryDate || new Date().toISOString().slice(0, 16),
      exitDate: tradeData.exitDate || new Date().toISOString().slice(0, 16),
      session: getSession(tradeData.entryDate || new Date().toISOString()),
      riskPercent: tradeData.riskPercent || 0,
      pnlPercent: tradeData.pnlPercent || 0,
      pnlAmount: tradeData.pnlAmount || 0,
      strategy: tradeData.strategy || 'Continuation',
      confluences: tradeData.confluences || [false, false, false, false, false],
      screenshots: tradeData.screenshots || [],
      notes: tradeData.notes || '',
      emotion: tradeData.emotion || '',
      createdAt: Date.now()
    };

    let updatedTrades;
    if (editingTradeId) {
      updatedTrades = trades.map(t => t.id === editingTradeId ? newTrade : t);
      addToast('Trade mis à jour');
    } else {
      updatedTrades = [newTrade, ...trades];
      addToast('Nouveau trade enregistré');
      
      // Google Sheets Sync
      const config = sheetsConfigs[currentJournalId];
      if (isGoogleConnected && config?.spreadsheetId) {
        try {
          await fetch('/api/trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spreadsheetId: config.spreadsheetId, trade: newTrade })
          });
          addToast('Synchronisé avec Google Sheets');
        } catch (error) {
          console.error("Failed to sync with Google Sheets", error);
          addToast('Erreur de synchronisation Google Sheets', 'error');
        }
      }
    }

    saveTrades(updatedTrades);
    setEditingTradeId(null);
    setActiveTab('dashboard');
  };

  const handleConnectGoogle = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.open(url, 'google_oauth', 'width=600,height=700');
  };

  const handleCreateSheet = async () => {
    if (!currentJournalId) return;
    try {
      const res = await fetch('/api/sheets/create', { method: 'POST' });
      const { spreadsheetId } = await res.json();
      const newConfig = { spreadsheetId, connected: true };
      const newConfigs = { ...sheetsConfigs, [currentJournalId]: newConfig };
      setSheetsConfigs(newConfigs);
      localStorage.setItem('sheets-configs', JSON.stringify(newConfigs));
      addToast('Google Sheet créé et connecté !');
    } catch (error) {
      addToast('Erreur lors de la création du Sheet', 'error');
    }
  };

  const handleSyncAll = async () => {
    const config = sheetsConfigs[currentJournalId];
    if (!isGoogleConnected || !config?.spreadsheetId) return;

    try {
      await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: config.spreadsheetId, trades })
      });
      addToast('Tous les trades ont été synchronisés');
    } catch (error) {
      console.error("Failed to sync all trades", error);
      addToast('Erreur lors de la synchronisation complète', 'error');
    }
  };

  const handleDeleteTrade = (id: string) => {
    if (confirm('Supprimer ce trade ?')) {
      saveTrades(trades.filter(t => t.id !== id));
      setViewingTradeId(null);
      addToast('Trade supprimé');
    }
  };

  // --- Views ---

  if (!currentJournalId) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Forex Journal Pro</h1>
          <p className="text-text-muted">Gérez vos performances de trading avec précision</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {JOURNALS.map(j => {
            const jTrades = JSON.parse(localStorage.getItem(`t-${j.id}`) || '[]');
            const jWins = jTrades.filter((t: any) => t.pnlAmount > 0).length;
            const jWr = jTrades.length > 0 ? (jWins / jTrades.length) * 100 : 0;
            const jPnl = jTrades.reduce((acc: number, t: any) => acc + t.pnlAmount, 0);

            return (
              <motion.div
                key={j.id}
                whileHover={{ y: -5 }}
                className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center cursor-pointer group"
                onClick={() => setCurrentJournalId(j.id)}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{j.emoji}</div>
                <h2 className="text-xl font-bold mb-4">{journalNames[j.id]}</h2>
                
                <div className="w-full space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Trades</span>
                    <span className="font-mono">{jTrades.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Win Rate</span>
                    <span className="font-mono">{jWr.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">P&L Total</span>
                    <span className={`font-mono ${jPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {jPnl >= 0 ? '+' : ''}{jPnl.toFixed(2)}$
                    </span>
                  </div>
                </div>

                <button className="w-full py-2 bg-primary/10 text-primary rounded-lg font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                  Ouvrir
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentJournal = JOURNALS.find(j => j.id === currentJournalId)!;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-16 md:w-20 bg-card border-r border-border flex flex-col items-center py-6 fixed h-full z-40">
        <button 
          onClick={() => setCurrentJournalId(null)}
          className="p-3 mb-8 text-text-muted hover:text-text hover:bg-border rounded-xl"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="text-3xl mb-8">{currentJournal.emoji}</div>

        <nav className="flex flex-col gap-4 w-full px-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
            { id: 'history', icon: History, label: 'Hist' },
            { id: 'new', icon: PlusCircle, label: 'New' },
            { id: 'settings', icon: Settings, label: 'Set' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setViewingTradeId(null);
                setEditingTradeId(null);
              }}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-border'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[10px] mt-1 font-bold uppercase">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <div className={`w-3 h-3 rounded-full ${sheetsConfigs[currentJournalId]?.spreadsheetId ? 'bg-success' : 'bg-border'}`} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-16 md:ml-20 flex-1 p-4 md:p-8">
        <AnimatePresence mode="wait">
          {toasts.map(t => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
          ))}
        </AnimatePresence>

        {viewingTradeId ? (
          <TradeDetail 
            trade={trades.find(t => t.id === viewingTradeId)!} 
            onBack={() => setViewingTradeId(null)}
            onDelete={handleDeleteTrade}
            onEdit={(id) => {
              setEditingTradeId(id);
              setActiveTab('new');
              setViewingTradeId(null);
            }}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard stats={stats} trades={trades} onTradeClick={setViewingTradeId} />
        ) : activeTab === 'history' ? (
          <HistoryView trades={trades} onTradeClick={setViewingTradeId} />
        ) : activeTab === 'new' ? (
          <TradeForm 
            initialData={editingTradeId ? trades.find(t => t.id === editingTradeId) : undefined}
            onSave={handleSaveTrade} 
            onCancel={() => {
              setActiveTab('dashboard');
              setEditingTradeId(null);
            }}
            journalColor={currentJournal.color}
            journalId={currentJournalId}
          />
        ) : (
          <SettingsView 
            journalId={currentJournalId}
            journalName={journalNames[currentJournalId]}
            config={sheetsConfigs[currentJournalId]}
            isGoogleConnected={isGoogleConnected}
            onConnectGoogle={handleConnectGoogle}
            onCreateSheet={handleCreateSheet}
            onSyncAll={handleSyncAll}
            onSaveName={(name) => {
              const newNames = { ...journalNames, [currentJournalId]: name };
              setJournalNames(newNames);
              localStorage.setItem('journal-names', JSON.stringify(newNames));
              addToast('Nom du journal sauvegardé');
            }}
            onDisconnect={() => {
              const newConfigs = { ...sheetsConfigs };
              delete newConfigs[currentJournalId];
              setSheetsConfigs(newConfigs);
              localStorage.setItem('sheets-configs', JSON.stringify(newConfigs));
              addToast('Google Sheets déconnecté');
            }}
            stats={stats}
          />
        )}
      </main>
    </div>
  );
}

// --- Sub-Views ---

function Dashboard({ stats, trades, onTradeClick }: { stats: JournalStats, trades: Trade[], onTradeClick: (id: string) => void }) {
  const lastTrades = trades.slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-text-muted">Aperçu global de vos performances</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: stats.totalTrades, icon: History },
          { label: 'Win Rate', value: formatPercent(stats.winRate), icon: CheckCircle, color: 'text-primary' },
          { label: 'P&L Total', value: formatCurrency(stats.totalPnl), icon: TrendingUp, color: stats.totalPnl >= 0 ? 'text-success' : 'text-danger' },
          { label: 'P&L Moyen', value: formatCurrency(stats.avgPnl), icon: MapPin },
          { label: 'Meilleur Trade', value: formatCurrency(stats.bestTrade), icon: Flame, color: 'text-success' },
          { label: 'Pire Trade', value: formatCurrency(stats.worstTrade), icon: AlertTriangle, color: 'text-danger' },
          { label: 'Moy. Gain', value: formatCurrency(stats.avgWin), icon: TrendingUp, color: 'text-success' },
          { label: 'Moy. Perte', value: formatCurrency(stats.avgLoss), icon: TrendingDown, color: 'text-danger' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border p-4 rounded-xl">
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase mb-2">
              <s.icon size={14} />
              {s.label}
            </div>
            <div className={`text-xl font-mono font-bold ${s.color || ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl">
          <h3 className="text-sm font-bold uppercase text-text-muted mb-6">Courbe de Capital</h3>
          <EquityChart trades={trades} />
        </div>
        <div className="bg-card border border-border p-6 rounded-xl">
          <h3 className="text-sm font-bold uppercase text-text-muted mb-6">P&L par Trade</h3>
          <PnlBarChart trades={trades} />
        </div>
      </div>

      {/* Last Trades */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase text-text-muted">Derniers Trades</h3>
          <button className="text-xs text-primary font-bold hover:underline">Voir tout</button>
        </div>
        <div className="divide-y divide-border">
          {lastTrades.length > 0 ? lastTrades.map(t => (
            <div 
              key={t.id} 
              onClick={() => onTradeClick(t.id)}
              className="p-4 flex items-center justify-between hover:bg-border/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${t.direction === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {t.direction === 'BUY' ? 'B' : 'S'}
                </div>
                <div>
                  <div className="font-bold">{t.pair}</div>
                  <div className="text-xs text-text-muted">{formatDate(t.entryDate)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-bold ${t.pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                  {t.pnlAmount >= 0 ? '+' : ''}{t.pnlAmount.toFixed(2)}$
                </div>
                <div className="text-xs text-text-muted">{t.pnlPercent.toFixed(2)}%</div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-text-muted">Aucun trade enregistré</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EquityChart({ trades }: { trades: Trade[] }) {
  const [hovered, setHovered] = useState<{ index: number, x: number, y: number } | null>(null);
  
  const equityData = useMemo(() => {
    let current = 0;
    const sortedTrades = [...trades].reverse();
    return sortedTrades.map((t, i) => {
      current += t.pnlAmount;
      return { value: current, trade: t };
    });
  }, [trades]);

  if (equityData.length < 2) return <div className="h-48 flex items-center justify-center text-text-muted italic">Pas assez de données</div>;

  const values = equityData.map(d => d.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padding = 20;
  const width = 500;
  const height = 200;

  const getX = (i: number) => (i / (equityData.length - 1)) * (width - padding * 2) + padding;
  const getY = (v: number) => height - ((v - min) / range) * (height - padding * 2) - padding;

  const points = equityData.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPoints = `${getX(0)},${height} ${points} ${getX(equityData.length - 1)},${height}`;
  const zeroY = getY(0);

  return (
    <div className="relative group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Zero Line */}
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#252D3A" strokeDasharray="4" />
        
        {/* Area */}
        <polyline points={areaPoints} fill="url(#equityGradient)" />
        
        {/* Line */}
        <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Points */}
        {equityData.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.value);
          return (
            <circle 
              key={i} 
              cx={cx} cy={cy} r={hovered?.index === i ? "5" : "3"} 
              fill={d.value >= (equityData[i-1]?.value || 0) ? '#10B981' : '#EF4444'} 
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHovered({ index: i, x: cx, y: cy })}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute z-50 pointer-events-none bg-card border border-border p-3 rounded-lg shadow-xl text-xs min-w-[120px]"
            style={{ 
              left: `${(hovered.x / width) * 100}%`, 
              top: `${(hovered.y / height) * 100}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <div className="font-bold text-text mb-1">{equityData[hovered.index].trade.pair}</div>
            <div className="flex justify-between gap-4 text-text-muted">
              <span>Equity:</span>
              <span className="font-mono font-bold text-primary">{equityData[hovered.index].value.toFixed(2)}$</span>
            </div>
            <div className="flex justify-between gap-4 text-text-muted">
              <span>Trade PnL:</span>
              <span className={`font-mono font-bold ${equityData[hovered.index].trade.pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                {equityData[hovered.index].trade.pnlAmount >= 0 ? '+' : ''}{equityData[hovered.index].trade.pnlAmount.toFixed(2)}$
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PnlBarChart({ trades }: { trades: Trade[] }) {
  const [hovered, setHovered] = useState<{ index: number, x: number, y: number } | null>(null);
  const data = trades.slice(0, 20).reverse();
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-text-muted italic">Aucun trade</div>;

  const max = Math.max(...data.map(t => Math.abs(t.pnlAmount)), 1);
  const width = 500;
  const height = 200;
  const padding = 20;
  const barWidth = (width - padding * 2) / data.length - 4;

  return (
    <div className="relative group">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#252D3A" />
        {data.map((t, i) => {
          const barHeight = (Math.abs(t.pnlAmount) / max) * (height / 2 - padding);
          const x = padding + i * (barWidth + 4);
          const y = t.pnlAmount >= 0 ? height / 2 - barHeight : height / 2;
          return (
            <rect 
              key={t.id}
              x={x} y={y} width={barWidth} height={barHeight}
              fill={t.pnlAmount >= 0 ? '#10B981' : '#EF4444'}
              rx="2"
              className="transition-all cursor-pointer hover:brightness-125"
              onMouseEnter={() => setHovered({ index: i, x: x + barWidth / 2, y: t.pnlAmount >= 0 ? y : y + barHeight })}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute z-50 pointer-events-none bg-card border border-border p-3 rounded-lg shadow-xl text-xs min-w-[120px]"
            style={{ 
              left: `${(hovered.x / width) * 100}%`, 
              top: `${(hovered.y / height) * 100}%`,
              transform: `translate(-50%, ${data[hovered.index].pnlAmount >= 0 ? '-120%' : '20%'})`
            }}
          >
            <div className="font-bold text-text mb-1">{data[hovered.index].pair}</div>
            <div className="flex justify-between gap-4 text-text-muted">
              <span>PnL $:</span>
              <span className={`font-mono font-bold ${data[hovered.index].pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                {data[hovered.index].pnlAmount >= 0 ? '+' : ''}{data[hovered.index].pnlAmount.toFixed(2)}$
              </span>
            </div>
            <div className="flex justify-between gap-4 text-text-muted">
              <span>PnL %:</span>
              <span className={`font-mono font-bold ${data[hovered.index].pnlPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {data[hovered.index].pnlPercent >= 0 ? '+' : ''}{data[hovered.index].pnlPercent.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TradeForm({ initialData, onSave, onCancel, journalColor, journalId }: { initialData?: Trade, onSave: (data: Partial<Trade>) => void, onCancel: () => void, journalColor: string, journalId: string }) {
  const [formData, setFormData] = useState<Partial<Trade>>(initialData || {
    pair: PAIRS[0],
    direction: 'BUY',
    entryDate: new Date().toISOString().slice(0, 16),
    exitDate: new Date().toISOString().slice(0, 16),
    riskPercent: 1,
    pnlPercent: 0,
    pnlAmount: 0,
    strategy: 'Continuation',
    confluences: [false, false, false, false, false],
    screenshots: [],
    notes: '',
    emotion: ''
  });
  const [hasDraft, setHasDraft] = useState(false);

  const draftKey = `trade-draft-${journalId}`;

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft && !initialData) {
      setHasDraft(true);
    }
  }, [draftKey, initialData]);

  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, draftKey]);

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
        setHasDraft(false);
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  };

  const handleSave = () => {
    clearDraft();
    onSave(formData);
  };

  const handleCancel = () => {
    if (confirm('Voulez-vous supprimer le brouillon en cours ?')) {
      clearDraft();
    }
    onCancel();
  };

  const confluenceScore = formData.confluences?.filter(Boolean).length || 0;
  const scoreIcon = confluenceScore < 3 ? '⚠️' : confluenceScore < 5 ? '👍' : '🔥';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setFormData(prev => ({
            ...prev,
            screenshots: [...(prev.screenshots || []), result].slice(0, 2)
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{initialData ? 'Modifier le Trade' : 'Nouveau Trade'}</h1>
        <button onClick={handleCancel} className="text-text-muted hover:text-text"><X size={24} /></button>
      </header>

      <AnimatePresence>
        {hasDraft && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between overflow-hidden"
          >
            <div className="flex items-center gap-3 text-primary">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Un brouillon automatique est disponible.</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={clearDraft}
                className="text-xs font-bold text-text-muted hover:text-text px-3 py-1.5"
              >
                Ignorer
              </button>
              <button 
                onClick={restoreDraft}
                className="text-xs font-bold bg-primary text-white px-4 py-1.5 rounded-lg hover:brightness-110"
              >
                Restaurer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Base Info */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-text-muted">Informations de Base</h3>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-text-muted">Paire</label>
            <select 
              value={formData.pair} 
              onChange={e => setFormData({...formData, pair: e.target.value})}
              className="w-full"
            >
              {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setFormData({...formData, direction: 'BUY'})}
              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.direction === 'BUY' ? 'bg-success border-success text-white' : 'border-border text-text-muted'}`}
            >
              BUY
            </button>
            <button 
              onClick={() => setFormData({...formData, direction: 'SELL'})}
              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${formData.direction === 'SELL' ? 'bg-danger border-danger text-white' : 'border-border text-text-muted'}`}
            >
              SELL
            </button>
          </div>
        </section>

        {/* Dates & Session */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-text-muted">Dates & Session</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">Entrée</label>
              <input 
                type="datetime-local" 
                value={formData.entryDate} 
                onChange={e => setFormData({...formData, entryDate: e.target.value})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">Sortie</label>
              <input 
                type="datetime-local" 
                value={formData.exitDate} 
                onChange={e => setFormData({...formData, exitDate: e.target.value})}
              />
            </div>
          </div>
          <div className="bg-border/30 p-3 rounded-lg flex justify-between text-sm">
            <span>Session: <span className="font-bold text-primary">{getSession(formData.entryDate!)}</span></span>
            <span>Durée: <span className="font-bold">{calculateDuration(formData.entryDate!, formData.exitDate!)}</span></span>
          </div>
        </section>

        {/* Performance */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-text-muted">Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">Risque %</label>
              <input 
                type="number" step="0.1" 
                value={formData.riskPercent} 
                onChange={e => setFormData({...formData, riskPercent: parseFloat(e.target.value)})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">P&L %</label>
              <input 
                type="number" step="0.1" 
                value={formData.pnlPercent} 
                onChange={e => setFormData({...formData, pnlPercent: parseFloat(e.target.value)})}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">P&L $</label>
              <input 
                type="number" step="0.01" 
                value={formData.pnlAmount} 
                onChange={e => setFormData({...formData, pnlAmount: parseFloat(e.target.value)})}
              />
            </div>
          </div>
        </section>

        {/* Strategy */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase text-text-muted">Stratégie & Confluences</h3>
          <select 
            value={formData.strategy} 
            onChange={e => setFormData({...formData, strategy: e.target.value as Strategy})}
            className="w-full"
          >
            <option value="Continuation">Continuation</option>
            <option value="Retournement">Retournement</option>
          </select>
          <div className="space-y-2 bg-card border border-border p-4 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-text-muted">Score: {confluenceScore}/5</span>
              <span className="text-lg">{scoreIcon}</span>
            </div>
            {[
              'Zone Clé (Ancienne Offre/Demande)',
              'Sweep de liquidité avant la cassure',
              'Cassure avec Momentum (BOS/CHoCH)',
              'Présence d\'Imbalances (FVG)',
              'Inducement (Liquidité créée avant le retour)'
            ].map((c, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.confluences?.[i]} 
                  onChange={e => {
                    const newC = [...(formData.confluences || [])];
                    newC[i] = e.target.checked;
                    setFormData({...formData, confluences: newC});
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm group-hover:text-primary transition-colors">{c}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Screenshots */}
        <section className="space-y-4 md:col-span-2">
          <h3 className="text-xs font-bold uppercase text-text-muted">Captures d'écran (Avant / Après)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formData.screenshots?.map((s, i) => (
              <div key={i} className="relative aspect-video bg-border rounded-lg overflow-hidden group">
                <img src={s} className="w-full h-full object-cover" alt={`Screenshot ${i}`} />
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-[10px] rounded font-bold uppercase">
                  {i === 0 ? 'Avant' : 'Après'}
                </div>
                <button 
                  onClick={() => setFormData({...formData, screenshots: formData.screenshots?.filter((_, idx) => idx !== i)})}
                  className="absolute top-2 right-2 p-1 bg-danger text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {(formData.screenshots?.length || 0) < 2 && (
              <label className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                <Camera size={24} className="text-text-muted mb-2" />
                <span className="text-xs text-text-muted font-bold uppercase">
                  {(formData.screenshots?.length || 0) === 0 ? 'Ajouter Avant' : 'Ajouter Après'}
                </span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </section>

        {/* Notes */}
        <section className="space-y-4 md:col-span-2">
          <h3 className="text-xs font-bold uppercase text-text-muted">Notes & Émotions</h3>
          <textarea 
            placeholder="Décrivez votre trade, vos émotions..."
            className="w-full h-32 resize-none"
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </section>
      </div>

      <div className="flex gap-4 pt-8">
        <button 
          onClick={handleCancel}
          className="flex-1 py-4 bg-border text-text font-bold rounded-xl hover:bg-border/70"
        >
          Annuler
        </button>
        <button 
          onClick={handleSave}
          style={{ backgroundColor: journalColor }}
          className="flex-1 py-4 text-white font-bold rounded-xl shadow-lg hover:brightness-110"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function HistoryView({ trades, onTradeClick }: { trades: Trade[], onTradeClick: (id: string) => void }) {
  const [filters, setFilters] = useState({
    pair: 'All',
    direction: 'All',
    strategy: 'All',
    session: 'All'
  });

  const filteredTrades = trades.filter(t => {
    return (filters.pair === 'All' || t.pair === filters.pair) &&
           (filters.direction === 'All' || t.direction === filters.direction) &&
           (filters.strategy === 'All' || t.strategy === filters.strategy) &&
           (filters.session === 'All' || t.session === filters.session);
  });

  const exportToCSV = () => {
    if (filteredTrades.length === 0) return;
    
    const headers = ['ID', 'Paire', 'Direction', 'Date Entree', 'Date Sortie', 'Session', 'Risque %', 'PnL %', 'PnL $', 'Strategie', 'Notes'];
    const rows = filteredTrades.map(t => [
      t.id,
      t.pair,
      t.direction,
      t.entryDate,
      t.exitDate,
      t.session,
      t.riskPercent,
      t.pnlPercent,
      t.pnlAmount,
      t.strategy,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trades_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Historique</h1>
          <p className="text-text-muted">{filteredTrades.length} trades trouvés</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all"
        >
          <Download size={18} />
          Exporter CSV
        </button>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border p-4 rounded-xl">
        <select value={filters.pair} onChange={e => setFilters({...filters, pair: e.target.value})}>
          <option value="All">Toutes les paires</option>
          {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filters.direction} onChange={e => setFilters({...filters, direction: e.target.value})}>
          <option value="All">Toutes directions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <select value={filters.strategy} onChange={e => setFilters({...filters, strategy: e.target.value})}>
          <option value="All">Toutes stratégies</option>
          <option value="Continuation">Continuation</option>
          <option value="Retournement">Retournement</option>
        </select>
        <select value={filters.session} onChange={e => setFilters({...filters, session: e.target.value})}>
          <option value="All">Toutes sessions</option>
          <option value="Asie">Asie</option>
          <option value="Londres">Londres</option>
          <option value="New York">New York</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredTrades.length > 0 ? filteredTrades.map(t => (
          <div 
            key={t.id} 
            onClick={() => onTradeClick(t.id)}
            className="bg-card border border-border p-4 rounded-xl flex items-center justify-between hover:border-primary/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${t.direction === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {t.direction === 'BUY' ? 'B' : 'S'}
              </div>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  {t.pair}
                  <span className="text-[10px] px-2 py-0.5 bg-border rounded-full text-text-muted uppercase tracking-widest">{t.session}</span>
                </div>
                <div className="text-sm text-text-muted">{formatDate(t.entryDate)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="hidden md:block text-right">
                <div className="text-xs text-text-muted uppercase font-bold">Stratégie</div>
                <div className="text-sm">{t.strategy}</div>
              </div>
              <div className="text-right min-w-[100px]">
                <div className={`font-mono font-bold text-lg ${t.pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
                  {t.pnlAmount >= 0 ? '+' : ''}{t.pnlAmount.toFixed(2)}$
                </div>
                <div className="text-xs text-text-muted">{t.pnlPercent.toFixed(2)}%</div>
              </div>
              <ChevronRight size={20} className="text-text-muted group-hover:text-primary transition-colors" />
            </div>
          </div>
        )) : (
          <div className="p-20 text-center bg-card border border-border border-dashed rounded-xl text-text-muted">
            Aucun trade ne correspond à vos filtres
          </div>
        )}
      </div>
    </div>
  );
}

function TradeDetail({ trade, onBack, onDelete, onEdit }: { trade: Trade, onBack: () => void, onDelete: (id: string) => void, onEdit: (id: string) => void }) {
  const confluenceScore = trade.confluences.filter(Boolean).length;
  const scoreIcon = confluenceScore < 3 ? '⚠️' : confluenceScore < 5 ? '👍' : '🔥';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-text">
          <ArrowLeft size={20} /> Retour
        </button>
        <div className="flex gap-2">
          <button onClick={() => onEdit(trade.id)} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
            <Edit size={20} />
          </button>
          <button onClick={() => onDelete(trade.id)} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-all">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl ${trade.direction === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {trade.direction === 'BUY' ? 'BUY' : 'SELL'}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{trade.pair}</h1>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-border rounded-full text-xs font-bold uppercase tracking-widest">{trade.session}</span>
                <span className="px-3 py-1 bg-border rounded-full text-xs font-bold uppercase tracking-widest">{trade.strategy}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-mono font-bold ${trade.pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
              {trade.pnlAmount >= 0 ? '+' : ''}{trade.pnlAmount.toFixed(2)}$
            </div>
            <div className={`text-xl font-mono font-bold ${trade.pnlAmount >= 0 ? 'text-success' : 'text-danger'}`}>
              {trade.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-y border-border py-8">
          {[
            { label: 'Entrée', value: formatDate(trade.entryDate), icon: Clock },
            { label: 'Sortie', value: formatDate(trade.exitDate), icon: Clock },
            { label: 'Durée', value: calculateDuration(trade.entryDate, trade.exitDate), icon: MapPin },
            { label: 'Risque', value: trade.riskPercent + '%', icon: AlertTriangle },
          ].map((item, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase mb-1">
                <item.icon size={12} />
                {item.label}
              </div>
              <div className="font-bold">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-text-muted">Confluences ({confluenceScore}/5 {scoreIcon})</h3>
            <div className="space-y-2">
            {[
              'Zone Clé (Ancienne Offre/Demande)',
              'Sweep de liquidité avant la cassure',
              'Cassure avec Momentum (BOS/CHoCH)',
              'Présence d\'Imbalances (FVG)',
              'Inducement (Liquidité créée avant le retour)'
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                {trade.confluences[i] ? <CheckCircle size={18} className="text-success" /> : <X size={18} className="text-text-muted opacity-30" />}
                <span className={trade.confluences[i] ? 'text-text' : 'text-text-muted line-through'}>{c}</span>
              </div>
            ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-text-muted">Notes & Émotions</h3>
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
              {trade.notes || "Aucune note pour ce trade."}
            </p>
            {trade.emotion && (
              <div className="mt-4 p-3 bg-border/20 rounded-lg text-sm italic">
                Ressenti: {trade.emotion}
              </div>
            )}
          </div>
        </div>

        {trade.screenshots.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-text-muted">Captures d'écran (Avant / Après)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trade.screenshots.map((s, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-border group">
                  <img src={s} className="w-full h-auto" alt={`Screenshot ${i}`} />
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 text-white text-xs rounded-lg font-bold uppercase tracking-widest backdrop-blur-sm">
                    {i === 0 ? 'Avant' : 'Après'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ journalId, journalName, config, isGoogleConnected, onConnectGoogle, onCreateSheet, onSyncAll, onSaveName, onDisconnect, stats }: { 
  journalId: string, 
  journalName: string, 
  config?: GoogleSheetsConfig, 
  isGoogleConnected: boolean,
  onConnectGoogle: () => void,
  onCreateSheet: () => void,
  onSyncAll: () => void,
  onSaveName: (name: string) => void, 
  onDisconnect: () => void,
  stats: JournalStats
}) {
  const [name, setName] = useState(journalName);

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <header>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-text-muted">Configuration du journal {journalId.toUpperCase()}</p>
      </header>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase text-text-muted">Général</h3>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="flex-1"
            placeholder="Nom du journal"
          />
          <button 
            onClick={() => onSaveName(name)}
            className="px-6 py-2 bg-primary text-white font-bold rounded-lg"
          >
            Sauvegarder
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase text-text-muted">Synchronisation Google Sheets</h3>
          {config?.spreadsheetId && <span className="text-[10px] px-2 py-0.5 bg-success/10 text-success rounded-full font-bold uppercase">Connecté</span>}
        </div>
        <div className="bg-card border border-border p-6 rounded-xl space-y-6">
          {!isGoogleConnected ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-text-muted">Connectez votre compte Google pour synchroniser vos trades avec Google Sheets.</p>
              <button 
                onClick={onConnectGoogle}
                className="px-8 py-3 bg-white text-black font-bold rounded-lg flex items-center gap-3 mx-auto border border-border hover:bg-border/10 transition-all"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Se connecter avec Google
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-success bg-success/5 p-4 rounded-lg border border-success/20">
                <CheckCircle size={20} />
                <span className="text-sm font-medium">Compte Google connecté</span>
              </div>
              
              {!config?.spreadsheetId ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted">Aucun Google Sheet n'est associé à ce journal. Créez-en un nouveau pour commencer la synchronisation.</p>
                  <button 
                    onClick={onCreateSheet}
                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                  >
                    Créer un nouveau Google Sheet
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-text-muted">ID du Spreadsheet</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={config.spreadsheetId} 
                        readOnly
                        className="flex-1 bg-border/20"
                      />
                      <a 
                        href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 bg-border text-text rounded-lg flex items-center justify-center hover:bg-border/70"
                      >
                        Ouvrir
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={onSyncAll}
                      className="flex-1 py-3 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Synchroniser tout
                    </button>
                    <button 
                      onClick={onDisconnect}
                      className="flex-1 py-3 bg-danger/10 text-danger font-bold rounded-lg hover:bg-danger hover:text-white transition-all"
                    >
                      Déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase text-text-muted">Statistiques du Journal</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border p-4 rounded-xl">
            <div className="text-xs text-text-muted font-bold uppercase mb-1">Total P&L</div>
            <div className={`text-2xl font-mono font-bold ${stats.totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.totalPnl.toFixed(2)}$
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <div className="text-xs text-text-muted font-bold uppercase mb-1">Win Rate</div>
            <div className="text-2xl font-mono font-bold text-primary">{stats.winRate.toFixed(1)}%</div>
          </div>
        </div>
      </section>
    </div>
  );
}
