'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Building2, Check, Loader2, Pencil, Power, X } from 'lucide-react';
import { setCompanyActive, updateCompany } from '../actions';
import type { AdminCompany } from '../AdminClient';
import { useTableList } from '@/lib/useTableList';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import DataToolbar from '@/components/admin/DataToolbar';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const PAGE_SIZE = 25;

type EditState = {
  id: string;
  name: string;
  code: string;
  tax_id: string;
  color: string;
  is_holding: boolean;
};

export default function CompaniesPanel({ initialCompanies }: { initialCompanies: AdminCompany[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState(initialCompanies);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  const config = useMemo(
    () => ({
      pageSize: PAGE_SIZE,
      searchText: (c: AdminCompany) => `${c.name} ${c.code} ${c.tax_id ?? ''}`,
      filters: {
        status: (c: AdminCompany) => (c.is_active ? 'active' : 'inactive'),
      },
      sorters: {
        name: (a: AdminCompany, b: AdminCompany) => a.name.localeCompare(b.name, 'pt-BR'),
        contracts: (a: AdminCompany, b: AdminCompany) => a.counts.contracts - b.counts.contracts,
        entries: (a: AdminCompany, b: AdminCompany) => a.counts.financial_entries - b.counts.financial_entries,
      },
      initialSort: { key: 'name', dir: 'asc' as const },
    }),
    [],
  );

  const list = useTableList(companies, config);

  const openEdit = (company: AdminCompany) => {
    setFormError('');
    setEditing({
      id: company.id,
      name: company.name,
      code: company.code,
      tax_id: company.tax_id ?? '',
      color: company.color,
      is_holding: company.is_holding,
    });
  };

  const submitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError('');
    startTransition(async () => {
      try {
        await updateCompany(editing.id, {
          name: editing.name.trim(),
          code: editing.code.trim(),
          tax_id: editing.tax_id.trim() || null,
          color: editing.color,
          is_holding: editing.is_holding,
        });
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  name: editing.name.trim(),
                  code: editing.code.trim(),
                  tax_id: editing.tax_id.trim() || null,
                  color: editing.color,
                  is_holding: editing.is_holding,
                }
              : c,
          ),
        );
        setEditing(null);
        toast.success('Empresa atualizada.');
        router.refresh();
      } catch (error: any) {
        setFormError(error?.message || 'Erro ao atualizar empresa.');
      }
    });
  };

  const toggleActive = async (company: AdminCompany) => {
    const next = !company.is_active;
    if (next === false) {
      const ok = await confirm(
        `Desativar "${company.name}"? Ela deixa de aparecer nos seletores de empresa do sistema, mas os contratos e lançamentos são mantidos. Você pode reativá-la aqui a qualquer momento.`,
        { title: 'Desativar empresa?', confirmLabel: 'Desativar', tone: 'danger' },
      );
      if (!ok) return;
    }
    startTransition(async () => {
      try {
        await setCompanyActive(company.id, next);
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, is_active: next } : c)));
        toast.success(next ? 'Empresa reativada.' : 'Empresa desativada.');
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao alterar o status da empresa.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <DataToolbar
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por nome, código ou CNPJ..."
        filters={[
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
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">
                  <button type="button" onClick={() => list.toggleSort('name')} className="flex items-center gap-1 hover:text-white">
                    Empresa <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">CNPJ</th>
                <th className="px-5 py-3 text-right">
                  <button type="button" onClick={() => list.toggleSort('contracts')} className="flex items-center gap-1 hover:text-white">
                    Contratos <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
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
                list.paged.map((company) => (
                  <tr key={company.id} className="hover:bg-white/5">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: company.color }} />
                        <span className="font-semibold text-white">{company.name}</span>
                        {company.is_holding && (
                          <span className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">
                            Holding
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-300">{company.code}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{company.tax_id || '—'}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{company.counts.contracts}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{company.counts.financial_entries}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          company.is_active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {company.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(company)}
                          className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-950/40 hover:text-amber-300"
                          title="Editar empresa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(company)}
                          disabled={isPending}
                          className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                            company.is_active
                              ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                              : 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                          }`}
                          title={company.is_active ? 'Desativar' : 'Reativar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8">
                    <EmptyState icon={Building2} title="Nenhuma empresa encontrada" description="Ajuste a busca ou os filtros." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} pageSize={list.pageSize} totalItems={list.filteredCount} onPageChange={list.setPage} />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1527] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] bg-slate-950/20 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Editar Empresa</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4 p-6 text-xs">
              {formError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-rose-300">{formError}</div>
              )}
              <div>
                <label className="mb-1 block font-semibold text-slate-300">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Código *</label>
                  <input
                    type="text"
                    required
                    value={editing.code}
                    onChange={(event) => setEditing({ ...editing, code: event.target.value })}
                    className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">CNPJ</label>
                  <input
                    type="text"
                    value={editing.tax_id}
                    onChange={(event) => setEditing({ ...editing, tax_id: event.target.value })}
                    className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="font-semibold text-slate-300">Cor</label>
                  <input
                    type="color"
                    value={editing.color}
                    onChange={(event) => setEditing({ ...editing, color: event.target.value })}
                    className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="font-mono text-slate-400">{editing.color}</span>
                </div>
                <label className="flex items-center gap-2 font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={editing.is_holding}
                    onChange={(event) => setEditing({ ...editing, is_holding: event.target.checked })}
                    className="h-4 w-4 rounded border border-[#1e293b] bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  É holding
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-[#1e293b] pt-4">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 font-semibold text-gray-400 hover:text-white">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
