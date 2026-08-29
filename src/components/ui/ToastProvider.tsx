'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  error: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-950/90',
    text: 'text-rose-200',
    icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
  },
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/90',
    text: 'text-emerald-200',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  },
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-950/90',
    text: 'text-blue-200',
    icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  },
};

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  error: 7000,
  success: 4500,
  info: 5000,
};

// Substitui os alert() nativos do navegador (que bloqueiam a thread e quebram
// o visual do resto do sistema) por uma notificação consistente com o tema
// escuro já usado nos modais de confirmação do app.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, variant, message }]);
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[variant]);
  }, [dismiss]);

  const value: ToastContextValue = {
    error: useCallback((message: string) => push('error', message), [push]),
    success: useCallback((message: string) => push('success', message), [push]),
    info: useCallback((message: string) => push('info', message), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border ${style.border} ${style.bg} ${style.text} backdrop-blur-xl shadow-2xl p-3.5 text-xs leading-relaxed animate-fade-in`}
            >
              {style.icon}
              <p className="flex-1 pt-px">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Fechar notificação"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast precisa ser usado dentro de um <ToastProvider>.');
  }
  return context;
}
