import { Session } from '../types';

export const formatCurrency = (val: number) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' });
export const formatPercent = (val: number) => val.toFixed(2) + '%';
export const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export const getSession = (dateStr: string): Session => {
  const date = new Date(dateStr);
  const hour = date.getUTCHours();
  if (hour >= 0 && hour < 12) return 'Asie';
  if (hour >= 7 && hour < 16) return 'Londres';
  if (hour >= 12 && hour < 21) return 'New York';
  return 'Hors Session';
};

export const calculateDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 0) return '0 min';
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  
  if (days > 0) return `${days}j ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}min`;
  return `${mins}min`;
};
