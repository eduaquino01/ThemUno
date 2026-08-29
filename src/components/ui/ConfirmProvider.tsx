'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

type ConfirmFn = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends Required<ConfirmOptions> {
  message: string;
}

// Substitui o confirm() nativo do navegador (que também bloqueia a thread e
// não combina com o resto da interface) por um modal com a mesma linguagem
// visual já usada nos diálogos de exclusão de contrato do app. useConfirm()
// devolve uma Promise<boolean>, então o call site troca
// `if (confirm('...'))` por `if (await confirm('...'))`.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((message, options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setIsResolving(false);
      setPending({
        message,
        title: options?.title ?? 'Confirmar ação?',
        confirmLabel: options?.confirmLabel ?? 'Confirmar',
        cancelLabel: options?.cancelLabel ?? 'Cancelar',
        tone: options?.tone ?? 'default',
      });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setPending(null);
    setIsResolving(false);
  }, []);

  const isDanger = pending?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md bg-[#0d1527] border ${isDanger ? 'border-rose-500/30' : 'border-blue-500/30'} rounded-xl shadow-2xl p-6 space-y-4 animate-fade-in`}
          >
            <div className={`flex items-center gap-3 ${isDanger ? 'text-rose-400' : 'text-blue-400'}`}>
              {isDanger ? <AlertTriangle className="w-6 h-6 shrink-0" /> : <HelpCircle className="w-6 h-6 shrink-0" />}
              <h3 className="font-bold text-lg text-white">{pending.title}</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{pending.message}</p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => settle(false)}
                disabled={isResolving}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                {pending.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsResolving(true);
                  settle(true);
                }}
                disabled={isResolving}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-60 ${
                  isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm precisa ser usado dentro de um <ConfirmProvider>.');
  }
  return context;
}
