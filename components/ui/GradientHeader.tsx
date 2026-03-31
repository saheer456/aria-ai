'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GradientHeaderProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function GradientHeader({ children, className = '', animate = false }: GradientHeaderProps) {
  const Component = animate ? motion.h1 : 'h1';
  const props = animate
    ? {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' },
      }
    : {};

  return (
    // @ts-expect-error framer-motion polymorphism
    <Component className={`gradient-text font-bold ${className}`} {...props}>
      {children}
    </Component>
  );
}
