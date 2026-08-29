'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// Paginação simples e reutilizável para listas grandes (contratos, lançamentos
// financeiros, credenciais). Antes dessas listas eram renderizadas por
// inteiro no DOM de uma vez — em alguns casos com um corte silencioso em
// 1000 itens que descartava o restante sem nenhum aviso. Isso troca o corte
// silencioso por navegação explícita entre páginas.
export default function Pagination({ page, pageSize, totalItems, onPageChange, className = '' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className={`flex items-center justify-between gap-4 px-6 py-3 border-t border-[#1e293b] text-xs text-gray-400 ${className}`}>
      <span>
        Mostrando <span className="font-semibold text-gray-300">{startItem}–{endItem}</span> de{' '}
        <span className="font-semibold text-gray-300">{totalItems}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="p-1.5 rounded-lg border border-[#1e293b] text-gray-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-gray-300 min-w-[70px] text-center">
          Página {safePage} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="p-1.5 rounded-lg border border-[#1e293b] text-gray-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
