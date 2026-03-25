export type Session = 'Asie' | 'Londres' | 'New York' | 'Hors Session';
export type Direction = 'BUY' | 'SELL';
export type Strategy = 'Continuation' | 'Retournement';

export interface Trade {
  id: string;
  pair: string;
  direction: Direction;
  entryDate: string;
  exitDate: string;
  session: Session;
  riskPercent: number;
  pnlPercent: number;
  pnlAmount: number;
  strategy: Strategy;
  confluences: boolean[]; // 5 items
  screenshots: string[]; // base64
  notes: string;
  emotion: string;
  createdAt: number;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  connected: boolean;
}

export interface JournalStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
}
