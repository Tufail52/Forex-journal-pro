import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade } from '../types';

export function EquityChart({ trades }: { trades: Trade[] }) {
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
        
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#252D3A" strokeDasharray="4" />
        <polyline points={areaPoints} fill="url(#equityGradient)" />
        <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
        
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

export function PnlBarChart({ trades }: { trades: Trade[] }) {
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
