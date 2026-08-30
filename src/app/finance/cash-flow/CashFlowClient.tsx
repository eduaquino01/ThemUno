'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Landmark, RefreshCw, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { getCashFlowProjection } from './actions';
import { useToast } from '@/components/ui/ToastProvider';

type CashFlowData = Awaited<ReturnType<typeof getCashFlowProjection>>;
type Company = { id: string; name: string; code: string };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
const selectClass = 'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export default function CashFlowClient({ companies, initialCompanyId, initialYear, initialData }: { companies: Company[]; initialCompanyId: string; initialYear: number; initialData: CashFlowData }) {
  const toast = useToast();
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [year, setYear] = useState(initialYear);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const load = (nextCompany = companyId, nextYear = year) => startTransition(async () => {
    try { setData(await getCashFlowProjection({ company_id: nextCompany, year: nextYear })); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao carregar o fluxo de caixa.'); }
  });
  const maxMovement = Math.max(1, ...data.months.flatMap((month) => [month.actualIn + month.projectedIn, month.actualOut + month.projectedOut]));

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 p-6 shadow-2xl">
      <Link href="/finance" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Financeiro</Link>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Planejamento e liquidez</p><h1 className="mt-2 text-3xl font-black text-white">Fluxo de Caixa Projetado</h1><p className="mt-1 text-sm text-slate-400">Entradas, saídas e saldo acumulado com base nos vencimentos e baixas.</p></div><div className="flex flex-wrap gap-2"><select value={companyId} onChange={(event) => { setCompanyId(event.target.value); load(event.target.value, year); }} className={selectClass}><option value="ALL">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><select value={year} onChange={(event) => { const value = Number(event.target.value); setYear(value); load(companyId, value); }} className={selectClass}>{years.map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => load()} className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-cyan-300"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button></div></div>
    </section>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi title="Saldo inicial" value={data.totals.openingBalance} icon={Wallet} tone="text-blue-400" /><Kpi title="Entradas totais" value={data.totals.actualIn + data.totals.projectedIn} icon={TrendingUp} tone="text-emerald-400" /><Kpi title="Saídas totais" value={data.totals.actualOut + data.totals.projectedOut} icon={TrendingDown} tone="text-rose-400" /><Kpi title="Saldo projetado" value={data.totals.projectedClosingBalance} icon={Scale} tone={data.totals.projectedClosingBalance >= 0 ? 'text-cyan-400' : 'text-rose-400'} /></div>

    {(data.totals.overdueIn > 0 || data.totals.overdueOut > 0 || data.totals.pendingApproval > 0) && <section className="grid gap-3 md:grid-cols-3"><Alert label="Recebimentos vencidos" value={data.totals.overdueIn} /><Alert label="Pagamentos vencidos" value={data.totals.overdueOut} /><Alert label="Aguardando aprovação" value={data.totals.pendingApproval} /></section>}

    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold text-white">Movimentação mensal</h2><div className="mt-6 grid h-72 grid-cols-12 items-end gap-2 border-b border-slate-700 pb-8">{data.months.map((month) => { const incoming = month.actualIn + month.projectedIn; const outgoing = month.actualOut + month.projectedOut; return <div key={month.month} className="relative flex h-full items-end justify-center gap-1"><div className="w-3 rounded-t bg-emerald-400" style={{ height: `${Math.max(2, incoming / maxMovement * 100)}%` }} title={`Entradas: ${money.format(incoming)}`} /><div className="w-3 rounded-t bg-rose-400" style={{ height: `${Math.max(2, outgoing / maxMovement * 100)}%` }} title={`Saídas: ${money.format(outgoing)}`} /><span className="absolute -bottom-6 text-[10px] text-slate-500">{month.label}</span></div>; })}</div><div className="mt-5 flex gap-5 text-[11px]"><span className="text-emerald-400">■ Entradas</span><span className="text-rose-400">■ Saídas</span></div></section>

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs"><thead className="bg-slate-950 text-slate-400"><tr>{['Mês','Saldo inicial','Entradas realizadas','Entradas previstas','Saídas realizadas','Saídas previstas','Saldo final'].map((title) => <th key={title} className="p-4 text-right first:text-left">{title}</th>)}</tr></thead><tbody>{data.months.map((month) => <tr key={month.month} className="border-t border-slate-800"><td className="p-4 font-bold text-white">{month.label}</td>{[month.openingBalance, month.actualIn, month.projectedIn, month.actualOut, month.projectedOut].map((value, index) => <td key={index} className="p-4 text-right text-slate-300">{money.format(value)}</td>)}<td className={`p-4 text-right font-black ${month.closingBalance >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{money.format(month.closingBalance)}</td></tr>)}</tbody></table></div></section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-blue-400" /><h2 className="font-bold text-white">Contas consideradas no saldo inicial</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.accounts.map((account) => <div key={account.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs font-bold text-white">{account.bank_name}</p><p className="mt-1 text-[11px] text-slate-500">{account.company.name} · {account.account_number || 'sem número'}</p><p className="mt-3 font-mono text-sm font-bold text-blue-400">{money.format(account.opening_balance)}</p></div>)}</div>{data.accounts.length === 0 && <p className="mt-4 text-xs text-slate-500">Nenhuma conta bancária ativa cadastrada.</p>}</section>
  </div>;
}

function Kpi({ title, value, icon: Icon, tone }: { title: string; value: number; icon: typeof Wallet; tone: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><p className="text-xs text-slate-400">{title}</p><Icon className={`h-5 w-5 ${tone}`} /></div><p className={`mt-2 text-2xl font-black ${tone}`}>{money.format(value)}</p></div>; }
function Alert({ label, value }: { label: string; value: number }) { return <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" /><div><p className="text-[11px] text-amber-200">{label}</p><p className="font-bold text-white">{money.format(value)}</p></div></div>; }
