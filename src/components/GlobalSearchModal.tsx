'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Building2, CreditCard, Key, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SearchItem {
  id: string;
  type: 'CONTRACT' | 'COMPANY' | 'INVOICE' | 'CREDENTIAL';
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  contracts?: any[];
  companies?: any[];
  invoices?: any[];
  credentials?: any[];
}

export function GlobalSearchModal({
  contracts = [],
  companies = [],
  invoices = [],
  credentials = [],
}: GlobalSearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl transition-all shadow-sm"
        title="Busca Global (Cmd+K)"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span>Buscar...</span>
        <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  // Filter items
  const cleanQuery = query.toLowerCase().trim();
  const results: SearchItem[] = [];

  if (cleanQuery.length > 0) {
    // Contracts
    contracts.forEach((c) => {
      if (
        c.title?.toLowerCase().includes(cleanQuery) ||
        c.counterpart?.toLowerCase().includes(cleanQuery) ||
        c.type?.toLowerCase().includes(cleanQuery)
      ) {
        results.push({
          id: `contract-${c.id}`,
          type: 'CONTRACT',
          title: c.title,
          subtitle: `${c.counterpart} • ${c.type}`,
          url: `/contracts/${c.id}`,
        });
      }
    });

    // Companies
    companies.forEach((comp) => {
      if (
        comp.name?.toLowerCase().includes(cleanQuery) ||
        comp.code?.toLowerCase().includes(cleanQuery) ||
        comp.tax_id?.toLowerCase().includes(cleanQuery)
      ) {
        results.push({
          id: `company-${comp.id}`,
          type: 'COMPANY',
          title: comp.name,
          subtitle: `Código: ${comp.code} ${comp.tax_id ? `• CNPJ: ${comp.tax_id}` : ''}`,
          url: `/contracts?company=${comp.id}`,
        });
      }
    });

    // Invoices
    invoices.forEach((inv) => {
      if (inv.invoice_number?.toLowerCase().includes(cleanQuery)) {
        results.push({
          id: `invoice-${inv.id}`,
          type: 'INVOICE',
          title: `Fatura Nº ${inv.invoice_number}`,
          subtitle: `Valor: R$ ${Number(inv.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          url: `/billing`,
        });
      }
    });

    // Credentials
    credentials.forEach((cred) => {
      if (
        cred.title?.toLowerCase().includes(cleanQuery) ||
        cred.username?.toLowerCase().includes(cleanQuery)
      ) {
        results.push({
          id: `credential-${cred.id}`,
          type: 'CREDENTIAL',
          title: cred.title,
          subtitle: cred.username ? `Usuário: ${cred.username}` : 'Cofre de Credenciais',
          url: cred.contract_id ? `/contracts/${cred.contract_id}` : '/',
        });
      }
    });
  }

  const getItemIcon = (type: SearchItem['type']) => {
    switch (type) {
      case 'CONTRACT': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'COMPANY': return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'INVOICE': return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'CREDENTIAL': return <Key className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar contratos, empresas, faturas ou senhas... (Esc para fechar)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto p-2">
          {cleanQuery.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Digite para buscar contratos, empresas, notas fiscais ou credenciais...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum resultado encontrado para <span className="font-semibold text-slate-200">"{query}"</span>.
            </div>
          ) : (
            <div className="space-y-1">
              {results.slice(0, 15).map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:border-blue-500/40">
                      {getItemIcon(item.type)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{results.length} resultados</span>
          <span>Pressione <kbd className="px-1 text-[10px] bg-slate-800 border border-slate-700 rounded">Esc</kbd> para fechar</span>
        </div>
      </div>
    </div>
  );
}
