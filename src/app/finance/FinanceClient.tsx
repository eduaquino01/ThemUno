'use client';

import { useMemo, useState, useTransition } from 'react';
import { Building2, Upload, RefreshCw, TrendingUp, TrendingDown, Wallet, Scale, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getFinanceDashboard, importFinancialPlan } from './actions';
import { setEntryBankAccount } from '@/app/admin/actions';
import { inferCompanyCode, normalizeWorkbook, hashImportRows, type ImportFormat } from './importers';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/ToastProvider';

const ENTRIES_PAGE_SIZE = 100;

type DashboardData = Awaited<ReturnType<typeof getFinanceDashboard>>;
type Company = { id: string; name: string; code: string; color: string };
type View = 'dashboard' | 'monthly' | 'categories' | 'entries' | 'import';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CURRENT_YEAR = new Date().getFullYear();
const SELECTABLE_YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function KpiCard({ title, value, icon: Icon, tone }: { title: string; value: number; icon: typeof Wallet; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <span className={`rounded-xl p-2 ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-white">{money.format(value)}</p>
    </div>
  );
}

function loadSheetJs() {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).XLSX) return resolve((window as any).XLSX);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('Não foi possível carregar o leitor de Excel. Verifique sua internet.'));
    document.head.appendChild(script);
  });
}

export default function FinanceClient({ companies, initialCompanyId, initialData }: {
  companies: Company[];
  initialCompanyId: string;
  initialData: DashboardData;
}) {
  const [data, setData] = useState(initialData);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [view, setView] = useState<View>('dashboard');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(0);
  const [entriesPage, setEntriesPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [importState, setImportState] = useState<{ file?: File; rows: any[]; format?: ImportFormat; warnings?: string[]; error?: string; success?: string }>({ rows: [] });
  const toast = useToast();

  const reload = (nextCompanyId = companyId, nextYear = year) => startTransition(async () => {
    setData(await getFinanceDashboard(nextCompanyId, nextYear));
  });

  // Vincula (ou desvincula) um lançamento a uma conta bancária da mesma
  // empresa. Atualiza a linha localmente e recarrega para manter os totais.
  const linkAccount = (entryId: string, bankAccountId: string | null) => startTransition(async () => {
    try {
      await setEntryBankAccount(entryId, bankAccountId);
      setData((prev) => ({
        ...prev,
        entries: prev.entries.map((entry) => (entry.id === entryId ? { ...entry, bank_account_id: bankAccountId } : entry)),
      }));
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao vincular a conta.');
    }
  });
  const chooseCompany = (value: string) => {
    setCompanyId(value);
    setEntriesPage(1);
    reload(value, year);
  };
  const chooseYear = (value: number) => {
    setYear(value);
    setEntriesPage(1);
    reload(companyId, value);
  };

  const filteredEntries = useMemo(() => data.entries.filter((entry) => {
    const matchesMonth = !monthFilter || new Date(entry.period_start).getUTCMonth() + 1 === monthFilter;
    const term = query.toLocaleLowerCase('pt-BR');
    const matchesQuery = !term || `${entry.company} ${entry.category} ${entry.account}`.toLocaleLowerCase('pt-BR').includes(term);
    return matchesMonth && matchesQuery;
  }), [data.entries, monthFilter, query]);

  const pagedEntries = useMemo(() => {
    const start = (entriesPage - 1) * ENTRIES_PAGE_SIZE;
    return filteredEntries.slice(start, start + ENTRIES_PAGE_SIZE);
  }, [filteredEntries, entriesPage]);

  const maxMonth = Math.max(1, ...data.monthly.flatMap((month) => [month.plannedRevenue, month.actualRevenue, month.plannedExpense, month.actualExpense]));
  const nav: { id: View; label: string }[] = [
    { id: 'dashboard', label: 'Visão executiva' },
    { id: 'monthly', label: 'Plano mensal' },
    { id: 'categories', label: 'Categorias' },
    { id: 'entries', label: 'Movimentações' },
    { id: 'import', label: 'Importar Excel' },
  ];

  async function inspectFile(file: File) {
    setImportState({ file, rows: [] });
    try {
      const XLSX = await loadSheetJs();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const normalized = normalizeWorkbook(XLSX, workbook);
      const suggestedCode = inferCompanyCode(file.name);
      const suggestedCompany = companies.find((company) => company.code === suggestedCode);
      if (suggestedCompany && suggestedCompany.id !== companyId) chooseCompany(suggestedCompany.id);
      setImportState({ file, ...normalized });
    } catch (error: any) {
      setImportState({ file, rows: [], error: error.message || 'Falha ao analisar o arquivo.' });
    }
  }

  function confirmImport() {
    if (!importState.file || !importState.rows.length || companyId === 'ALL') return;
    startTransition(async () => {
      try {
        // Baseado no conteúdo das linhas (não no nome/data do arquivo), para que
        // reabrir e salvar a mesma planilha não seja tratado como versão nova.
        const sourceKey = `${companyId}:${year}:${hashImportRows(importState.rows)}`;
        const result = await importFinancialPlan({
          company_id: companyId,
          file_name: importState.file!.name,
          source_key: sourceKey,
          rows: importState.rows,
          replace_existing: false,
        });
        const ignored = result.ignored_rows ? ` ${result.ignored_rows} duplicados foram ignorados.` : '';
        setImportState((state) => ({ ...state, success: `${result.imported_rows} registros importados com sucesso.${ignored}`, error: undefined }));
        reload();
      } catch (error: any) {
        setImportState((state) => ({ ...state, error: error.message || 'Falha na importação.', success: undefined }));
      }
    });
  }

  return (
    <div className="space-y-6 text-slate-100">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0d1830] to-blue-950/60 p-6 shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">ThemUno Financial Intelligence</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Plano Financeiro Multiempresa</h1>
            <p className="mt-1 text-sm text-slate-400">Previsto × realizado, categorias, semanas e conciliação em uma única visão.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={companyId} onChange={(event) => chooseCompany(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
              <option value="ALL">Todas as empresas</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
            <select value={year} onChange={(event) => chooseYear(Number(event.target.value))} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
              {SELECTABLE_YEARS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <button onClick={() => reload()} className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-blue-300 hover:bg-slate-800" title="Atualizar"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
        {nav.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${view === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{item.label}</button>)}
      </nav>

      {view === 'dashboard' && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Receitas realizadas" value={data.totals.actualRevenue} icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-400" />
          <KpiCard title="Despesas realizadas" value={data.totals.actualExpense} icon={TrendingDown} tone="bg-rose-500/15 text-rose-400" />
          <KpiCard title="Resultado realizado" value={data.totals.actualResult} icon={Scale} tone={data.totals.actualResult >= 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'} />
          <KpiCard title="Saldo calculado" value={data.totals.currentBalance} icon={Wallet} tone="bg-violet-500/15 text-violet-400" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-bold text-white">Evolução mensal — Previsto × Realizado</h2>
            <div className="mt-6 grid h-72 grid-cols-12 items-end gap-2 border-b border-slate-700 pb-8">
              {data.monthly.map((month) => <div key={month.month} className="group relative flex h-full items-end justify-center gap-0.5">
                <div className="w-2 rounded-t bg-blue-500/50" style={{ height: `${Math.max(2, month.plannedRevenue / maxMonth * 100)}%` }} title={`Receita prevista: ${money.format(month.plannedRevenue)}`} />
                <div className="w-2 rounded-t bg-emerald-400" style={{ height: `${Math.max(2, month.actualRevenue / maxMonth * 100)}%` }} title={`Receita realizada: ${money.format(month.actualRevenue)}`} />
                <div className="w-2 rounded-t bg-rose-400" style={{ height: `${Math.max(2, month.actualExpense / maxMonth * 100)}%` }} title={`Despesa realizada: ${money.format(month.actualExpense)}`} />
                <span className="absolute -bottom-6 text-[10px] text-slate-500">{month.label}</span>
              </div>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-slate-400"><span>■ <b className="text-blue-400">Receita prevista</b></span><span>■ <b className="text-emerald-400">Receita realizada</b></span><span>■ <b className="text-rose-400">Despesa realizada</b></span></div>
          </section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="font-bold text-white">Maiores despesas realizadas</h2>
            <div className="mt-4 space-y-4">{data.categories.filter((item) => item.nature === 'EXPENSE').slice(0, 6).map((item) => {
              const max = Math.max(...data.categories.map((category) => category.actual), 1);
              return <div key={item.name}><div className="flex justify-between gap-2 text-xs"><span className="truncate text-slate-300">{item.name}</span><b>{money.format(item.actual)}</b></div><div className="mt-1.5 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400" style={{ width: `${item.actual / max * 100}%` }} /></div></div>;
            })}</div>
          </section>
        </div>
      </>}

      {view === 'monthly' && <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 p-5"><h2 className="font-bold">Plano mensal de {year}</h2><p className="text-xs text-slate-400">Transferências internas são neutralizadas nos indicadores.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-950/60 text-slate-400"><tr>{['Mês','Receita Prev.','Receita Real','Despesa Prev.','Despesa Real','Resultado Prev.','Resultado Real'].map((title) => <th key={title} className="px-4 py-3 text-right first:text-left">{title}</th>)}</tr></thead><tbody>{data.monthly.map((month) => <tr key={month.month} className="border-t border-slate-800/70 hover:bg-slate-800/30"><td className="px-4 py-3 font-bold text-white">{monthNames[month.month - 1]}</td><td className="px-4 py-3 text-right">{money.format(month.plannedRevenue)}</td><td className="px-4 py-3 text-right text-emerald-400">{money.format(month.actualRevenue)}</td><td className="px-4 py-3 text-right">{money.format(month.plannedExpense)}</td><td className="px-4 py-3 text-right text-rose-400">{money.format(month.actualExpense)}</td><td className="px-4 py-3 text-right">{money.format(month.plannedRevenue - month.plannedExpense)}</td><td className={`px-4 py-3 text-right font-bold ${month.actualRevenue - month.actualExpense >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money.format(month.actualRevenue - month.actualExpense)}</td></tr>)}</tbody></table></div>
      </section>}

      {view === 'categories' && <section className="grid gap-5 lg:grid-cols-2">{(['REVENUE','EXPENSE'] as const).map((nature) => <div key={nature} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className={`font-bold ${nature === 'REVENUE' ? 'text-emerald-400' : 'text-rose-400'}`}>{nature === 'REVENUE' ? 'Receitas por categoria' : 'Despesas por categoria'}</h2><div className="mt-4 divide-y divide-slate-800">{data.categories.filter((item) => item.nature === nature).map((item) => <div key={item.name} className="grid grid-cols-[1fr_auto_auto] gap-4 py-3 text-xs"><span className="font-semibold text-white">{item.name}</span><span className="text-slate-400">Prev. {money.format(item.planned)}</span><span className="font-bold">Real {money.format(item.actual)}</span></div>)}</div></div>)}</section>}

      {view === 'entries' && <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => { setQuery(event.target.value); setEntriesPage(1); }} placeholder="Buscar parceiro, categoria ou empresa" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs outline-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500" /></div><select value={monthFilter} onChange={(event) => { setMonthFilter(Number(event.target.value)); setEntriesPage(1); }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"><option value={0}>Todos os meses</option>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></div>
        <div className="max-h-[620px] overflow-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="sticky top-0 bg-slate-950 text-slate-400"><tr>{['Período','Empresa','Categoria','Parceiro / Conta','Cenário','Natureza','Valor','Conta bancária','Conciliação'].map((title) => <th key={title} className="px-3 py-3 text-left last:text-center">{title}</th>)}</tr></thead><tbody>{pagedEntries.map((entry) => { const accountOptions = data.bankAccounts.filter((account) => account.company_id === entry.company_id); return <tr key={entry.id} className="border-t border-slate-800/70"><td className="whitespace-nowrap px-3 py-2">{new Date(entry.period_start).toLocaleDateString('pt-BR')}–{new Date(entry.period_end).toLocaleDateString('pt-BR')}</td><td className="px-3 py-2">{entry.company}</td><td className="px-3 py-2">{entry.category}</td><td className="px-3 py-2 font-semibold text-white">{entry.account}</td><td className="px-3 py-2">{entry.scenario === 'ACTUAL' ? 'Real' : 'Previsto'}</td><td className={entry.nature === 'REVENUE' ? 'px-3 py-2 text-emerald-400' : 'px-3 py-2 text-rose-400'}>{entry.nature === 'REVENUE' ? 'Receita' : 'Despesa'}</td><td className="px-3 py-2 text-right font-bold">{money.format(entry.amount)}</td><td className="px-3 py-2"><select value={entry.bank_account_id ?? ''} disabled={isPending || accountOptions.length === 0} onChange={(event) => linkAccount(entry.id, event.target.value || null)} className="w-full max-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-40"><option value="">{accountOptions.length ? '—' : 'Sem contas'}</option>{accountOptions.map((account) => <option key={account.id} value={account.id}>{account.bank_name}{account.account_number ? ` · ${account.account_number}` : ''}</option>)}</select></td><td className="px-3 py-2 text-center">{entry.is_reconciled ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" /> : '—'}</td></tr>; })}</tbody></table></div>
        <Pagination page={entriesPage} pageSize={ENTRIES_PAGE_SIZE} totalItems={filteredEntries.length} onPageChange={setEntriesPage} />
      </section>}

      {view === 'import' && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-500/15 p-3 text-blue-400"><Upload className="h-6 w-6" /></span><div><h2 className="font-bold text-white">Importar dados financeiros</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Envie o Plano Financeiro mensal ou o relatório “Movimentação Financeira” exportado do Sankhya. No Sankhya, títulos baixados entram como realizado e títulos em aberto como previsto.</p></div></div>
        {companyId === 'ALL' && <div className="mt-5 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />Selecione uma empresa específica antes de importar.</div>}
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-10 text-center hover:border-blue-500"><Upload className="h-8 w-8 text-blue-400" /><span className="mt-3 text-sm font-bold">Escolher arquivo Excel</span><span className="mt-1 text-xs text-slate-500">.xlsx ou .xls</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => event.target.files?.[0] && inspectFile(event.target.files[0])} /></label>
        {importState.file && <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs"><b>{importState.file.name}</b><p className="mt-1 text-slate-400">{importState.rows.length ? `${importState.rows.length} registros reconhecidos • ${importState.format === 'SANKHYA' ? 'Movimentação Financeira Sankhya' : 'Plano Financeiro mensal'}. Confirme a empresa selecionada antes de importar.` : 'Analisando ou aguardando correção...'}</p></div>}
        {!!importState.warnings?.length && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <p className="font-bold">Atenção antes de confirmar:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              {importState.warnings!.map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          </div>
        )}
        {importState.error && <p className="mt-3 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{importState.error}</p>}
        {importState.success && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-300">{importState.success}</p>}
        <button disabled={!importState.rows.length || companyId === 'ALL' || isPending} onClick={confirmImport} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isPending ? 'Importando...' : 'Confirmar importação'}</button>
        <div className="mt-8"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Últimas importações</h3><div className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-800">{data.imports.map((item) => <div key={item.id} className="flex flex-col justify-between gap-2 p-3 text-xs sm:flex-row"><span className="font-semibold text-white">{item.file_name}</span><span className="text-slate-400">{item.imported_rows} registros • {new Date(item.created_at).toLocaleString('pt-BR')}</span></div>)}</div></div>
      </section>}
    </div>
  );
}
