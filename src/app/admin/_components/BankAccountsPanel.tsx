'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Check, Landmark, Loader2, Pencil, Plus, Power, X } from 'lucide-react';
import { createBankAccount, setBankAccountActive, updateBankAccount } from '../actions';
import type { AdminBankAccount, AdminCompany } from '../AdminClient';
import { useTableList } from '@/lib/useTableList';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { formatCurrency, parseNumber } from '@/lib/formatters';
import DataToolbar from '@/components/admin/DataToolbar';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const PAGE_SIZE = 25;

type FormState = {
  id: string | null;
  company_id: string;
  bank_name: string;
  branch: string;
  account_number: string;
  opening_balance: string;
  is_active: boolean;
};

const emptyForm = (companyId: string): FormState => ({
  id: null,
  company_id: companyId,
  bank_name: '',
  branch: '',
  account_number: '',
  opening_balance: '',
  is_active: true,
});

export default function BankAccountsPanel({
  initialBankAccounts,
  companies,
}: {
  initialBankAccounts: AdminBankAccount[];
  companies: AdminCompany[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState(initialBankAccounts);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState('');
  const [isPending, startTransition] = useTransition();

  const activeCompanies = useMemo(() => companies.filter((c) => c.is_active), [companies]);

  const config = useMemo(
    () => ({
      pageSize: PAGE_SIZE,
      searchText: (a: AdminBankAccount) =>
        `${a.bank_name} ${a.branch ?? ''} ${a.account_number ?? ''} ${a.company_name}`,
      filters: {
        company: (a: AdminBankAccount) => a.company_id,
        status: (a: AdminBankAccount) => (a.is_active ? 'active' : 'inactive'),
      },
      sorters: {
        bank: (a: AdminBankAccount, b: AdminBankAccount) => a.bank_name.localeCompare(b.bank_name, 'pt-BR'),
        balance: (a: AdminBankAccount, b: AdminBankAccount) => a.opening_balance - b.opening_balance,
      },
      initialSort: { key: 'bank', dir: 'asc' as const },
    }),
    [],
  );

  const list = useTableList(accounts, config);

  const openCreate = () => {
    setFormError('');
    setForm(emptyForm(activeCompanies[0]?.id ?? ''));
  };

  const openEdit = (account: AdminBankAccount) => {
    setFormError('');
    setForm({
      id: account.id,
      company_id: account.company_id,
      bank_name: account.bank_name,
      branch: account.branch ?? '',
      account_number: account.account_number ?? '',
      opening_balance: String(account.opening_balance),
      is_active: account.is_active,
    });
  };

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '—';
  const companyColor = (id: string) => companies.find((c) => c.id === id)?.color ?? '#3b82f6';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    if (!form.company_id) {
      setFormError('Selecione a empresa.');
      return;
    }
    setFormError('');
    const payload = {
      bank_name: form.bank_name.trim(),
      branch: form.branch.trim() || null,
      account_number: form.account_number.trim() || null,
      opening_balance: parseNumber(form.opening_balance),
      is_active: form.is_active,
    };

    startTransition(async () => {
      try {
        if (form.id) {
          await updateBankAccount(form.id, payload);
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === form.id
                ? { ...a, ...payload, company_name: companyName(a.company_id), company_color: companyColor(a.company_id) }
                : a,
            ),
          );
          toast.success('Conta atualizada.');
        } else {
          const { id } = await createBankAccount({ ...payload, company_id: form.company_id });
          setAccounts((prev) => [
            {
              id,
              company_id: form.company_id,
              company_name: companyName(form.company_id),
              company_color: companyColor(form.company_id),
              ...payload,
              entry_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
          toast.success('Conta cadastrada.');
        }
        setForm(null);
        router.refresh();
      } catch (error: any) {
        setFormError(error?.message || 'Erro ao salvar a conta.');
      }
    });
  };

  const toggleActive = async (account: AdminBankAccount) => {
    const next = !account.is_active;
    if (!next) {
      const ok = await confirm(
        `Desativar a conta "${account.bank_name}"? Ela some das opções de vínculo de novos lançamentos, mas o saldo de abertura e os lançamentos já vinculados são mantidos.`,
        { title: 'Desativar conta?', confirmLabel: 'Desativar', tone: 'danger' },
      );
      if (!ok) return;
    }
    startTransition(async () => {
      try {
        await setBankAccountActive(account.id, next);
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, is_active: next } : a)));
        toast.success(next ? 'Conta reativada.' : 'Conta desativada.');
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || 'Erro ao alterar o status da conta.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <DataToolbar
        searchValue={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Buscar por banco, agência, conta ou empresa..."
        filters={[
          {
            key: 'company',
            label: 'Empresa',
            value: list.filterValues.company ?? 'ALL',
            options: [
              { value: 'ALL', label: 'Todas as empresas' },
              ...companies.map((c) => ({ value: c.id, label: c.name })),
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
        actionLabel="Nova conta"
        onAction={openCreate}
      />

      <div className="overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1527]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">
                  <button type="button" onClick={() => list.toggleSort('bank')} className="flex items-center gap-1 hover:text-white">
                    Banco <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3">Agência</th>
                <th className="px-5 py-3">Conta</th>
                <th className="px-5 py-3 text-right">
                  <button type="button" onClick={() => list.toggleSort('balance')} className="ml-auto flex items-center gap-1 hover:text-white">
                    Saldo de abertura <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-5 py-3 text-right">Lançamentos</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/50">
              {list.paged.length > 0 ? (
                list.paged.map((account) => (
                  <tr key={account.id} className="hover:bg-white/5">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: account.company_color }} />
                        <span className="text-gray-300">{account.company_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-white">{account.bank_name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{account.branch || '—'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{account.account_number || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{formatCurrency(account.opening_balance)}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{account.entry_count}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          account.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {account.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-950/40 hover:text-amber-300"
                          title="Editar conta"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(account)}
                          disabled={isPending}
                          className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                            account.is_active
                              ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300'
                              : 'text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300'
                          }`}
                          title={account.is_active ? 'Desativar' : 'Reativar'}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8">
                    <EmptyState
                      icon={Landmark}
                      title="Nenhuma conta bancária"
                      description="Cadastre uma conta para registrar o saldo de abertura e vincular lançamentos."
                      actionLabel="Nova conta"
                      onAction={openCreate}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={list.page} pageSize={list.pageSize} totalItems={list.filteredCount} onPageChange={list.setPage} />
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#1e293b] bg-[#0d1527] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1e293b] bg-slate-950/20 px-6 py-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                {form.id ? <Pencil className="h-4 w-4 text-amber-400" /> : <Plus className="h-4 w-4 text-blue-400" />}
                {form.id ? 'Editar conta bancária' : 'Nova conta bancária'}
              </h3>
              <button type="button" onClick={() => setForm(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4 p-6 text-xs">
              {formError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-rose-300">{formError}</div>
              )}
              <div>
                <label className="mb-1 block font-semibold text-slate-300">Empresa *</label>
                <select
                  value={form.company_id}
                  disabled={Boolean(form.id)}
                  onChange={(event) => setForm({ ...form, company_id: event.target.value })}
                  className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {activeCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-300">Banco *</label>
                <input
                  type="text"
                  required
                  value={form.bank_name}
                  onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
                  className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Agência</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(event) => setForm({ ...form, branch: event.target.value })}
                    className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">Conta</label>
                  <input
                    type="text"
                    value={form.account_number}
                    onChange={(event) => setForm({ ...form, account_number: event.target.value })}
                    className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 font-mono text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="mb-1 block font-semibold text-slate-300">Saldo de abertura (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 12.500,00"
                    value={form.opening_balance}
                    onChange={(event) => setForm({ ...form, opening_balance: event.target.value })}
                    className="w-full rounded-xl border border-[#1e293b] bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <label className="flex items-center gap-2 py-2 font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                    className="h-4 w-4 rounded border border-[#1e293b] bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  Ativa
                </label>
              </div>
              <div className="flex justify-end gap-3 border-t border-[#1e293b] pt-4">
                <button type="button" onClick={() => setForm(null)} className="px-4 py-2 font-semibold text-gray-400 hover:text-white">
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
