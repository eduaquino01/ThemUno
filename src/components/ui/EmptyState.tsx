'use client';

import React from 'react';
import { LucideIcon, FileX } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`p-12 rounded-2xl bg-[#0d1527] border border-[#1e293b] text-center space-y-4 max-w-lg mx-auto ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <div className="space-y-1">
        <h4 className="font-extrabold text-white text-base leading-snug">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
