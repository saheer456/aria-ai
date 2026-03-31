'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

interface ModelStatus {
  id: string;
  name: string;
  status: 'online' | 'offline';
}

export function ModelStatusTracker() {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="skeleton w-32 h-6 rounded-full" />;
  }

  const allOffline = models.every((m) => m.status === 'offline');
  const someOffline = models.some((m) => m.status === 'offline') && !allOffline;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
        <Activity size={12} className={allOffline ? 'text-slate-500' : someOffline ? 'text-amber-400' : 'text-teal-400'} />
        <span>Systems</span>
      </div>
      <div className="w-[1px] h-3 bg-white/10" />
      <div className="flex gap-2">
        <AnimatePresence>
          {models.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-1.5"
              title={`${m.name}: ${m.status.toUpperCase()}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shadow-sm ${
                  m.status === 'online' ? 'bg-teal-400 shadow-teal-500/50' : 'bg-slate-600'
                }`}
              />
              <span className="text-[10px] text-slate-400 tracking-wide uppercase">{m.name.split(' ')[0]}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
