import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  Settings, 
  LogOut, 
  ChevronRight, 
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { Trade, JournalStats, GoogleSheetsConfig, Session } from './types';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { TradeForm } from './components/TradeForm';
import { TradeDetail } from './components/TradeDetail';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
import { getSession } from './lib/utils';

const JOURNALS = [
  { id: 'personal', name: 'Personnel', color: '#6366f1' },
  { id: 'prop', name: 'Prop Firm', color: '#10b981' },
  { id: 'demo', name: 'Demo', color: '#f59e0b' }
];

export default function App() {
  const [activeJournal, setActiveJournal] = useState(JOURNALS[0]);
  const [view, setView] = useState<'dashboard' | 'history' | 'form' | 'detail' | 'settings'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<GoogleSheetsConfig | undefined>();
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchTrades = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/trades?journalId=${activeJournal.id}`);
        if (res.ok) {
          const data = await res.json();
          setTrades(data);
        }
      } catch (e) {
        console.error("Failed to fetch trades", e);
      } finally {
        setIsLoading(false);
      }
    };

    const checkGoogleStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setIsGoogleConnected(data.connected);
          setGoogleConfig(data.config?.[activeJournal.id]);
        }
      } catch (e) {
        console.error("Failed to check google status", e);
      }
    };

    fetchTrades();
    checkGoogleStatus();
  }, [activeJournal.id]);

  const stats = useMemo<JournalStats>(() => {
    const totalTrades = trades.length;
    if (totalTrades === 0) return { totalTrades: 0, winRate: 0, totalPnl: 0, avgPnl: 0, bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0 };
    
    const wins = trades.filter(t => t.pnlAmount > 0);
    const losses = trades.filter(t => t.pnlAmount <= 0);
    const totalPnl = trades.reduce((acc, t) => acc + t.pnlAmount, 0);
    
    return {
      totalTrades,
      winRate: (wins.length / totalTrades) * 100,
      totalPnl,
      avgPnl: totalPnl / totalTrades,
      bestTrade: Math.max(...trades.map(t => t.pnlAmount)),
      worstTrade: Math.min(...trades.map(t => t.pnlAmount)),
      avgWin: wins.length > 0 ? wins.reduce((acc, t) => acc + t.pnlAmount, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((acc, t) => acc + t.pnlAmount, 0) / losses.length : 0,
    };
  }, [trades]);

  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    const isNew = !tradeData.id;
    const method = isNew ? 'POST' : 'PATCH';
    const url = isNew ? '/api/trades' : `/api/trades/${tradeData.id}`;
    
    const payload = {
      ...tradeData,
      journalId: activeJournal.id,
      session: getSession(tradeData.entryDate!)
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedTrade = await res.json();
        if (isNew) {
          setTrades([savedTrade, ...trades]);
        } else {
          setTrades(trades.map(t => t.id === savedTrade.id ? savedTrade : t));
        }
        showToast(isNew ? 'Trade enregistré !' : 'Trade mis à jour !');
        setView('dashboard');
      }
    } catch (e) {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce trade ?')) return;
    
    try {
      const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTrades(trades.filter(t => t.id !== id));
        showToast('Trade supprimé');
        setView('history');
      }
    } catch (e) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/url');
      if (res.ok) {
        const { url } = await res.json();
        const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
        
        const checkWindow = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkWindow);
            window.location.reload();
          }
        }, 1000);
      }
    } catch (e) {
      showToast('Erreur de connexion Google', 'error');
    }
  };

  const handleCreateSheet = async () => {
    try {
      const res = await fetch('/api/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalId: activeJournal.id })
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleConfig(data);
        showToast('Google Sheet créé avec succès !');
      }
    } catch (e) {
      showToast('Erreur lors de la création du sheet', 'error');
    }
  };

  const handleSyncAll = async () => {
    if (!confirm('Voulez-vous synchroniser tous vos trades avec Google Sheets ? Cela écrasera les données existantes dans le sheet.')) return;
    
    try {
      const res = await fetch('/api/trades', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalId: activeJournal.id, trades })
      });
      if (res.ok) {
        showToast('Synchronisation complète réussie !');
      } else {
        showToast('Erreur lors de la synchronisation', 'error');
      }
    } catch (e) {
      showToast('Erreur réseau lors de la synchronisation', 'error');
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('Voulez-vous déconnecter votre compte Google ?')) return;
    try {
      const res = await fetch('/api/auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setIsGoogleConnected(false);
        setGoogleConfig(undefined);
        showToast('Compte Google déconnecté');
      }
    } catch (e) {
      showToast('Erreur lors de la déconnexion', 'error');
    }
  };

  const selectedTrade = trades.find(t => t.id === selectedTradeId);

  return (
    <div className="min-h-screen bg-background text-text flex">
      {/* Sidebar */}
      <aside className="w-20 border-r border-border bg-card flex flex-col items-center py-8 fixed h-full z-20">
        <div className="flex flex-col items-center w-full">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30 mb-10">
            F
          </div>

          <nav className="space-y-4 w-full px-2">
            {[
              { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
              { id: 'history', label: 'Hist', icon: History },
              { id: 'form', label: 'New', icon: PlusCircle },
              { id: 'settings', label: 'Set', icon: Settings },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-full flex flex-col items-center gap-1 py-3 rounded-xl font-bold transition-all ${view === item.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-border/50'}`}
              >
                <item.icon size={22} />
                <span className="text-[10px] uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col items-center gap-6 w-full px-2">
          <div className="flex flex-col items-center gap-2">
            {JOURNALS.map(j => (
              <button
                key={j.id}
                onClick={() => setActiveJournal(j)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeJournal.id === j.id ? 'bg-border ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:bg-border/50'}`}
                title={j.name}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: j.color }} />
              </button>
            ))}
          </div>

          <button className="p-3 text-danger hover:bg-danger/10 rounded-xl transition-all" title="Déconnexion">
            <LogOut size={22} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 p-8 md:p-12 min-h-screen">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted gap-4">
            <RefreshCw size={40} className="animate-spin text-primary" />
            <span className="font-bold uppercase tracking-widest text-xs">Chargement des données...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedTradeId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && (
                <Dashboard 
                  stats={stats} 
                  trades={trades} 
                  onTradeClick={(id) => {
                    setSelectedTradeId(id);
                    setView('detail');
                  }} 
                />
              )}
              {view === 'history' && (
                <HistoryView 
                  trades={trades} 
                  onTradeClick={(id) => {
                    setSelectedTradeId(id);
                    setView('detail');
                  }} 
                />
              )}
              {view === 'form' && (
                <TradeForm 
                  onSave={handleSaveTrade} 
                  onCancel={() => setView('dashboard')} 
                  journalColor={activeJournal.color}
                  journalId={activeJournal.id}
                />
              )}
              {view === 'detail' && selectedTrade && (
                <TradeDetail 
                  trade={selectedTrade} 
                  onBack={() => setView('history')} 
                  onDelete={handleDeleteTrade}
                  onEdit={() => setView('form')}
                />
              )}
              {view === 'settings' && (
                <SettingsView 
                  journalId={activeJournal.id}
                  journalName={activeJournal.name}
                  config={googleConfig}
                  isGoogleConnected={isGoogleConnected}
                  onConnectGoogle={handleConnectGoogle}
                  onCreateSheet={handleCreateSheet}
                  onSyncAll={handleSyncAll}
                  onSaveName={(name) => showToast(`Journal renommé en ${name}`)}
                  onDisconnect={handleDisconnectGoogle}
                  stats={stats}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
