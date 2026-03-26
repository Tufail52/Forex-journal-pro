import React from 'react';
import { History, CheckCircle, TrendingUp, MapPin, Flame, AlertTriangle, TrendingDown } from 'lucide-react';
import { JournalStats, Trade } from '../types';
import { EquityChart, PnlBarChart } from './Charts';

const formatCurrency = (val: number) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
const formatPercent = (val: number) => val.toFixed(2) + '%';
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export function Dashboard({ stats, trades, onTradeClick }: { stats: JournalStats, trades: Trade[], onTradeClick: (id: string) => void }) {
  const lastTrades = trades.slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-text-muted">Aperçu global de vos performances</p>
        </div>
      </header>

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
