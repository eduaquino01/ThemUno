'use client';

import { useCallback, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface UseTableListConfig<T> {
  pageSize: number;
  // Texto concatenado usado pela busca livre (ex.: `${c.title} ${c.counterpart}`).
  searchText?: (item: T) => string;
  // Cada filtro devolve o valor discreto do item (ex.: status). O select do
  // chamador guarda a opção escolhida; 'ALL' / '' significa "sem filtro".
  filters?: Record<string, (item: T) => string>;
  // Comparadores asc por chave de coluna; a direção é aplicada pelo hook.
  sorters?: Record<string, (a: T, b: T) => number>;
  initialSort?: { key: string; dir: SortDir };
}

// Busca + filtros + ordenação + paginação client-side para as tabelas de
// cadastro (admin) e para a lista de contratos. Centraliza a lógica que hoje
// está duplicada em ContractsClient e FinanceClient, incluindo o reset da
// página para 1 sempre que a busca/filtros mudam.
export function useTableList<T>(items: T[], config: UseTableListConfig<T>) {
  const { pageSize, searchText, filters, sorters, initialSort } = config;

  const [search, setSearchRaw] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string | null; dir: SortDir }>(
    initialSort ?? { key: null, dir: 'asc' },
  );
  const [page, setPage] = useState(1);

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchRaw('');
    setFilterValues({});
    setPage(1);
  }, []);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    Object.values(filterValues).filter((value) => value && value !== 'ALL').length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = items.filter((item) => {
      if (term && searchText && !searchText(item).toLowerCase().includes(term)) {
        return false;
      }
      if (filters) {
        for (const [key, getValue] of Object.entries(filters)) {
          const selected = filterValues[key];
          if (selected && selected !== 'ALL' && getValue(item) !== selected) {
            return false;
          }
        }
      }
      return true;
    });

    if (sort.key && sorters?.[sort.key]) {
      const compare = sorters[sort.key];
      result = [...result].sort((a, b) => (sort.dir === 'asc' ? compare(a, b) : -compare(a, b)));
    }
    return result;
  }, [items, search, filterValues, filters, searchText, sort, sorters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return {
    search,
    setSearch,
    filterValues,
    setFilter,
    sortKey: sort.key,
    sortDir: sort.dir,
    toggleSort,
    clearFilters,
    activeFilterCount,
    filtered,
    filteredCount: filtered.length,
    paged,
    page: safePage,
    setPage,
    pageSize,
  };
}
