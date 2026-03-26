import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function Toast({ message, type = 'success' }: { message: string, type?: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
        type === 'success' 
          ? 'bg-success text-white border-success/20' 
          : 'bg-danger text-white border-danger/20'
      }`}
    >
      {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span className="font-bold text-sm tracking-tight">{message}</span>
    </motion.div>
  );
}
