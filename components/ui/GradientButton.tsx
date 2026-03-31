'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

export function GradientButton({
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  size = 'md',
  id,
}: GradientButtonProps) {
  const sizeClass = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }[size];

  return (
    <motion.button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-gradient rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${className}`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
    >
      {children}
    </motion.button>
  );
}
