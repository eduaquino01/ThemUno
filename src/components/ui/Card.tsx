'use client';

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverGlow?: boolean;
  ambientColor?: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'none';
}

export default function Card({
  children,
  className = '',
  hoverGlow = true,
  ambientColor = 'none',
}: CardProps) {
  const ambientGlows = {
    blue: 'before:bg-blue-500/10',
    emerald: 'before:bg-emerald-500/10',
    rose: 'before:bg-rose-500/10',
    amber: 'before:bg-amber-500/10',
    purple: 'before:bg-purple-500/10',
    none: '',
  };

  return (
    <div
      className={`relative p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden ${
        hoverGlow ? 'hover:border-slate-700 hover:shadow-2xl transition-all duration-300' : ''
      } ${ambientColor !== 'none' ? `before:absolute before:top-0 before:right-0 before:w-32 before:h-32 before:rounded-full before:blur-3xl before:-mr-10 before:-mt-10 ${ambientGlows[ambientColor]}` : ''} ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
