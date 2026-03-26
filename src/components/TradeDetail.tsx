import React from 'react';
import { ArrowLeft, Edit, Trash2, Clock, MapPin, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Trade } from '../types';
import { formatDate, calculateDuration } from '../lib/utils';

export function TradeDetail({ trade, onBack, onDelete, onEdit }: { 
  trade: Trade, 
  onBack: () => void, 
  onDelete: (id: string) => void, 
  onEdit: (id: string) => void 
}) {
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
