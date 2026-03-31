'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  delay?: number;
}

export function FeatureCard({ icon, title, description, onClick, delay = 0 }: FeatureCardProps) {
  return (
    <motion.button
      className="glass-card rounded-2xl p-5 text-left w-full cursor-pointer group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(20, 184, 166, 0.2)', backgroundColor: 'rgba(15, 17, 26, 0.8)', borderColor: 'rgba(94, 234, 212, 0.2)' }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3 group-hover:shadow-[0_0_15px_rgba(20,184,166,0.2)] transition-shadow">
        <span className="text-teal-400 text-lg">{icon}</span>
      </div>
      <p className="text-white font-semibold text-sm leading-tight mb-1">{title}</p>
      <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
    </motion.button>
  );
}
