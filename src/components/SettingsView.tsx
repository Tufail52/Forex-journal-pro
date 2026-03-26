import React, { useState } from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { GoogleSheetsConfig, JournalStats } from '../types';

export function SettingsView({ journalId, journalName, config, isGoogleConnected, onConnectGoogle, onCreateSheet, onSyncAll, onSaveName, onDisconnect, stats }: { 
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
