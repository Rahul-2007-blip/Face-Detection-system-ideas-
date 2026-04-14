import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, animate = true, style }) => {
  const Component = animate ? motion.div : 'div';
  
  return (
    <Component
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]",
        "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-white/10 before:to-transparent",
        "after:absolute after:inset-0 after:-z-10 after:shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]",
        className
      )}
    >
      {children}
    </Component>
  );
};
