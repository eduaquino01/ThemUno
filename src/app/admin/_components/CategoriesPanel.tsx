'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Check, FolderTree, GitMerge, Loader2, Pencil, Power, X } from 'lucide-react';
import { mergeFinancialCategories, updateFinancialCategory } from '../actions';
import type { AdminCategory } from '../AdminClient';
import { useTableList } from '@/lib/useTableList';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { normalizeCategoryName } from '@/lib/text';
import DataToolbar from '@/components/admin/DataToolbar';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const PAGE_SIZE = 30;

const natureLabel = (nature: string) => (nature === 'REVENUE' ? 'Receita' : 'Despesa');

type DuplicateGroup = {
  key: string;
  company_id: string;
  company_name: string;
  nature: string;
  members: AdminCategory[];
};

type RowEdit = { name: string; sort_order: string };

export default function CategoriesPanel({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowEdit, setRowEdit] = useState<RowEdit>({ name: '', sort_order: '0' });
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const companyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    categories.forEach((category) => seen.set(category.company_id, category.company_name));
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [categories]);

  const config = useMemo(
    () => ({
      pageSize: PAGE_SIZE,
      searchText: (c: AdminCategory) => `${c.name} ${c.company_name}`,
      filters: {
        company: (c: AdminCategory) => c.company_id,
        nature: (c: AdminCategory) => c.nature,
        status: (c: AdminCategory) => (c.is_active ? 'active' : 'inactive'),
      },
      sorters: {
        name: (a: AdminCategory, b: AdminCategory) => a.name.localeCompare(b.name, 'pt-BR'),
        entries: (a: AdminCategory, b: AdminCategory) => a.entry_count - b.entry_count,
      },
      initialSort: { key: 'name', dir: 'asc' as const },
    }),
    [],
  );

  const list = useTableList(categories, config);

  // Grupos de categorias que "colidem" quando o nome é normalizado (acentos,
  // caixa, espaços), dentro da mesma empresa e natureza. É a base do painel de
  // duplicatas — o merge só é oferecido para esses grupos.
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const buckets = new Map<string, DuplicateGroup>();
    for (const category of categories) {
      const normalized = normalizeCategoryName(category.name);
      const key = `${category.company_id}::${category.nature}::${normalized}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.members.push(category);
      } else {
        buckets.set(key, {
          key,
          company_id: category.company_id,
          company_name: category.company_name,
          nature: category.nature,
          members: [category],
        });
      }
    }
    return [...buckets.values()]
      .filter((group) => group.members.length > 1)
      .sort((a, b) => b.members.length - a.members.length);
  }, [categories]);

  const startRowEdit = (category: AdminCategory) => {
    setEditingId(category.id);
    setRowEdit({ name: category.name, sort_order: String(category.sort_order) });
  };

  const saveRowEdit = (category: AdminCategory) => {
    const name = rowEdit.name.trim();
    const sortOrder = Number(rowEdit.sort_order);
    if (!name) {
      toast.error('O nome da categoria não pode ficar vazio.');
      return;
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      toast.error('A ordem deve ser um número maior ou igual a zero.');
      return;
    }
    if (name === category.name && sortOrder === category.sort_order) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      try {
        await updateFinancialCategory(category.id, { name, sort_order: sortOrder });
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, name, sort_order: sortOrder } : c)),
        );
        setEditingId(null);
        toast.success('Categoria atualizada.');
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao atualizar categoria.');
      }
    });
  };

  const toggleActive = (category: AdminCategory) => {
    const next = !category.is_active;
    startTransition(async () => {
      try {
        await updateFinancialCategory(category.id, { is_active: next });
        setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, is_active: next } : c)));
        toast.success(next ? 'Categoria reativada.' : 'Categoria inativada.');
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao alterar o status.');
      }
    });
  };

  const openMerge = (group: DuplicateGroup) => {
    setMergeGroup(group);
    // Alvo sugerido: a categoria do grupo com mais lançamentos.
    const suggested = [...group.members].sort((a, b) => b.entry_count - a.entry_count)[0];
    setMergeTargetId(suggested.id);
  };

  const confirmMerge = async () => {
    if (!mergeGroup || !mergeTargetId) return;
    const target = mergeGroup.members.find((m) => m.id === mergeTargetId)!;
    const sources = mergeGroup.members.filter((m) => m.id !== mergeTargetId);
    const ok = await confirm(
      `Unir ${sources.length} categoria(s) em "${target.name}"? Todos os lançamentos das categorias de origem passam para "${target.name}" e as de origem são excluídas. Os totais do painel financeiro não mudam.`,
      { title: 'Unir categorias?', confirmLabel: 'Unir', tone: 'danger' },
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        const result = await mergeFinancialCategories({
          targetId: mergeTargetId,
          sourceIds: sources.map((s) => s.id),
        });
        const sourceIds = new Set(sources.map((s) => s.id));
        setCategories((prev) =>
          prev
            .filter((c) => !sourceIds.has(c.id))
            .map((c) =>
              c.id === mergeTargetId ? { ...c, entry_count: c.entry_count + result.movedEntries } : c,
            ),
        );
        setMergeGroup(null);
        toast.success(
          `${result.removedCategories} categoria(s) unida(s); ${result.movedEntries} lançamento(s) realocado(s).`,
        );
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao unir categorias.');
      }
    });
  };

  return (
    <div className="space-y-4">
      {duplicateGroups.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
            <GitMerge className="h-4 w-4" />
            {duplicateGroups.length} grupo(s) de categorias possivelmente duplicadas
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            Nomes que só diferem em acento, caixa ou espaços, na mesma empresa e natureza.
          </p>
          <div className="mt-3 space-y-2">
            {duplicateGroups.map((group) => (
              <div
                key={group.key}
                className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-slate-950/40 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-semibold text-white">{group.company_name}</span>
                  <span className="text-amber-200/70"> · {natureLabel(group.nature)} · </span>
                  <span className="text-slate-300">
                    {group.members.map((m) => `"${m.name}" (${m.entry_count})`).join(', ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openMerge(group)}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white transition-colors hover:bg-amber-500"
                >
                  Unir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataToolbar
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar categoria ou empresa..."
        filters={[
          {
            key: 'company',
            label: 'Empresa',
            value: list.filterValues.company ?? 'ALL',
            options: [{ value: 'ALL', label: 'Todas as empresas' }, ...companyOptions],
          },
          {
            key: 'nature',
            label: 'Natureza',
            value: list.filterValues.nature ?? 'ALL',
            options: [
              { value: 'ALL', label: 'Receitas e despesas' },
              { value: 'REVENUE', label: 'Receitas' },
              { value: 'EXPENSE', label: 'Despesas' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: list.filterValues.status ?? 'ALL',
            options: [
              { value: 'ALL', label: 'Ativas e inativas' },
              { value: 'active', label: 'Somente ativas' },
              { value: 'inactive', label: 'Somente inativas' },
            ],
          },
        ]}
        onFilterChange={list.setFilter}
        activeFilterCount={list.activeFilterCount}
        onClearFilters={list.clearFilters}
      />

      <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1527]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Natureza</th>
                <th className="px-5 py-3">
                  <button type="button" onClick={() => list.toggleSort('name')} className="flex items-center gap-1 hover:text-white">
                    Categoria <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-right">Ordem</th>
                <th className="px-5 py-3 text-right">
                  <button type="button" onClick={() => list.toggleSort('entries')} className="ml-auto flex items-center gap-1 hover:text-white">
                    Lançamentos <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/50">
              {list.paged.length > 0 ? (
                list.paged.map((category) => {
                  const isEditing = editingId === category.id;
                  return (
                    <tr key={category.id} className="hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.company_color }} />
                          <span className="text-gray-300">{category.company_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            category.nature === 'REVENUE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {natureLabel(category.nature)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={rowEdit.name}
                            onChange={(event) => setRowEdit({ ...rowEdit, name: event.target.value })}
                            className="w-full max-w-xs rounded-lg border border-blue-500/40 bg-slate-950 px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        ) : (
                          <span className="font-semibold text-white">{category.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={rowEdit.sort_order}
                            onChange={(event) => setRowEdit({ ...rowEdit, sort_order: event.target.value })}
                            className="w-16 rounded-lg border border-blue-500/40 bg-slate-950 px-2 py-1 text-right text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                        ) : (
                          <span className="text-gray-400">{category.sort_order}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-300">{category.entry_count}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            category.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                          }`}
                        >
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveRowEdit(category)}
                                disabled={isPending}
                                className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-950/40 disabled:opacity-40"
                                title="Salvar"
                              >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-800 hover:text-white"
                                title="Cancelar"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startRowEdit(category)}
                                className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-950/40 hover:text-amber-300"
                                title="Editar nome / ordem"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleActive(category)}
                                disabled={isPending}
                                className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                                  category.is_active
                                    ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                                    : 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                                }`}
                                title={category.is_active ? 'Inativar' : 'Reativar'}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8">
                    <EmptyState
                      icon={FolderTree}
                      title="Nenhuma categoria encontrada"
                      description="As categorias são criadas automaticamente ao importar planilhas no módulo Financeiro."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} pageSize={list.pageSize} totalItems={list.filteredCount} onPageChange={list.setPage} />
      </div>

      {mergeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1527] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] bg-slate-950/20 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <GitMerge className="h-4 w-4 text-amber-400" /> Unir categorias
              </h3>
              <button type="button" onClick={() => setMergeGroup(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-xs">
              <p className="text-slate-300">
                {mergeGroup.company_name} · {natureLabel(mergeGroup.nature)}. Escolha a categoria que
                permanece — as demais são unidas a ela.
              </p>
              <div className="space-y-2">
                {mergeGroup.members.map((member) => (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 ${
                      mergeTargetId === member.id
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-[#1e293b] bg-slate-950/40'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold text-white">
                      <input
                        type="radio"
                        name="merge-target"
                        checked={mergeTargetId === member.id}
                        onChange={() => setMergeTargetId(member.id)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      {member.name}
                    </span>
                    <span className="text-slate-400">{member.entry_count} lançamento(s)</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 border-t border-[#1e293b] pt-4">
                <button type="button" onClick={() => setMergeGroup(null)} className="px-4 py-2 font-semibold text-gray-400 hover:text-white">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmMerge}
                  disabled={isPending || !mergeTargetId}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}
                  Unir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
