'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'revenue' | 'expense' | 'active' | 'review' | 'draft' | 'critical' | 'info' | 'ghost';
  size?: 'xs' | 'sm';
  className?: string;
}

export default function Badge({
  children,
  variant = 'info',
  size = 'xs',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    revenue: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    expense: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    draft: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-extrabold animate-pulse',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ghost: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border tracking-wider',
    sm: 'text-xs px-2.5 py-1 rounded-lg font-bold border tracking-wider',
  };

  return (
    <span className={`inline-flex items-center gap-1 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
