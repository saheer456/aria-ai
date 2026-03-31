'use client';

import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceOrbProps {
  isListening: boolean;
  onClick?: () => void;
}

export function VoiceOrb({ isListening, onClick }: VoiceOrbProps) {
  return (
    <div className="relative flex items-center justify-center w-48 h-48" onClick={onClick}>
      {/* Pulse rings */}
      {isListening && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-teal-500/30"
              style={{ width: 80, height: 80 }}
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              transition={{
                duration: 1.8,
                delay: i * 0.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Outer glow ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(20,184,166,0.1) 0%, transparent 70%)',
        }}
        animate={isListening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main orb */}
      <motion.div
        className="relative w-24 h-24 rounded-full cursor-pointer flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.9) 0%, rgba(13, 148, 136, 1) 100%)',
          boxShadow: isListening
            ? '0 0 50px rgba(13, 148, 136, 0.5), 0 0 100px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
            : '0 0 20px rgba(13, 148, 136, 0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
        animate={isListening ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}
      >
        {/* Inner sphere highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25) 0%, transparent 55%)',
          }}
        />
        <Mic
          size={32}
          className="text-white relative z-10"
          strokeWidth={isListening ? 2.5 : 1.8}
        />
      </motion.div>
    </div>
  );
}
