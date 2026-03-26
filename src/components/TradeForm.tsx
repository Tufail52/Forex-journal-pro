import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Camera } from 'lucide-react';
import { Trade, Strategy } from '../types';
import { getSession, calculateDuration } from '../lib/utils';

const PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF', 'EUR/JPY', 'GBP/JPY', 'EUR/GBP', 'AUD/JPY', 'XAU/USD'];

export function TradeForm({ initialData, onSave, onCancel, journalColor, journalId }: { 
  initialData?: Trade, 
  onSave: (data: Partial<Trade>) => void, 
  onCancel: () => void, 
  journalColor: string, 
  journalId: string 
}) {
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
