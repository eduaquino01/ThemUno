'use client';

import { Filter, Plus, Search, X } from 'lucide-react';

export interface ToolbarFilter {
  key: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}

interface DataToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ToolbarFilter[];
  onFilterChange?: (key: string, value: string) => void;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

// Barra padrão de busca + filtros + ação primária das telas de cadastro.
// Mesma linguagem visual da barra de filtros de /contracts.
export default function DataToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  onFilterChange,
  activeFilterCount = 0,
  onClearFilters,
  actionLabel,
  onAction,
}: DataToolbarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#1e293b] bg-[#0d1527] p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-[#1e293b] bg-slate-950 py-2 pl-9 pr-4 text-sm text-white placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {filters.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            Filtrar:
          </span>
        )}

        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value}
            aria-label={filter.label}
            onChange={(event) => onFilterChange?.(filter.key, event.target.value)}
            className="rounded-lg border border-[#1e293b] bg-slate-950 px-3 py-1.5 text-xs text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {activeFilterCount > 0 && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1 rounded-lg border border-[#1e293b] px-2.5 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Limpar ({activeFilterCount})
          </button>
        )}

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/10 transition-colors hover:bg-blue-500 md:ml-0"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
