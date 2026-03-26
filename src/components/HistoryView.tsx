import React, { useState } from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { Trade } from '../types';

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/JPY', 'XAU/USD'];

export function HistoryView({ trades, onTradeClick }: { trades: Trade[], onTradeClick: (id: string) => void }) {
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
