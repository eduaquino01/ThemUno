'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, CircleDollarSign, Plus, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/ToastProvider';
import { createFinancialObligation, getFinanceOperations, reviewFinancialObligation, settleFinancialObligation } from './actions';

type OperationsData = Awaited<ReturnType<typeof getFinanceOperations>>;
type Company = { id: string; name: string; code: string; color: string };
type Nature = 'REVENUE' | 'EXPENSE';
type Status = 'ALL' | 'OPEN' | 'SETTLED' | 'DISPUTED';
type Approval = 'ALL' | 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelClass = 'mb-1.5 block text-[11px] font-bold text-slate-300';

export default function ObligationsClient({ nature, companies, initialData, canApprove, currentUserId }: { nature: Nature; companies: Company[]; initialData: OperationsData; canApprove: boolean; currentUserId: string }) {
  const toast = useToast();
  const isPayable = nature === 'EXPENSE';
  const [data, setData] = useState(initialData);
  const [companyId, setCompanyId] = useState<string>('ALL');
  const [status, setStatus] = useState<Status>('ALL');
  const [approval, setApproval] = useState<Approval>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = (nextCompany = companyId, nextStatus = status, page = 1, nextApproval = approval) => startTransition(async () => {
    try {
      setData(await getFinanceOperations({ nature, company_id: nextCompany, status: nextStatus, approval: nextApproval, page, page_size: 50 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar lançamentos.');
    }
  });

  const chooseCompany = (value: string) => { setCompanyId(value); setShowCreate(false); setSettlingId(null); load(value, status); };
  const chooseStatus = (value: Status) => { setStatus(value); load(companyId, value); };
  const chooseApproval = (value: Approval) => { setApproval(value); load(companyId, status, 1, value); };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await createFinancialObligation({
          company_id: companyId, nature, category_id: form.get('category_id'), partner_id: form.get('partner_id'),
          cost_center_id: form.get('cost_center_id') || null, document_number: form.get('document_number'),
          description: form.get('description'), due_date: form.get('due_date'), amount: Number(form.get('amount')),
        });
        toast.success(isPayable ? 'Conta a pagar cadastrada.' : 'Conta a receber cadastrada.');
        setShowCreate(false);
        load(companyId, status);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha ao cadastrar lançamento.');
      }
    });
  };

  const submitSettlement = (event: FormEvent<HTMLFormElement>, entryId: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await settleFinancialObligation({ entry_id: entryId, settlement_date: form.get('settlement_date'), bank_account_id: form.get('bank_account_id') || null });
        toast.success(isPayable ? 'Pagamento registrado.' : 'Recebimento registrado.');
        setSettlingId(null);
        load(companyId, status);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha ao registrar a baixa.');
      }
    });
  };

  const review = (entryId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => startTransition(async () => {
    try {
      await reviewFinancialObligation({ entry_id: entryId, decision, reason });
      toast.success(decision === 'APPROVED' ? 'Lançamento aprovado.' : 'Lançamento rejeitado.');
      setRejectingId(null);
      load(companyId, status);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao revisar lançamento.');
    }
  });

  const setup = data.setup;
  return <div className="space-y-6 animate-fade-in">
    <section className={`rounded-3xl border border-slate-800 p-6 shadow-2xl ${isPayable ? 'bg-gradient-to-br from-slate-950 via-rose-950/30 to-slate-950' : 'bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950'}`}>
      <Link href="/finance" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Financeiro</Link>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className={`text-xs font-bold uppercase tracking-[0.25em] ${isPayable ? 'text-rose-400' : 'text-emerald-400'}`}>Operação financeira</p><h1 className="mt-2 text-3xl font-black text-white">{isPayable ? 'Contas a Pagar' : 'Contas a Receber'}</h1><p className="mt-1 text-sm text-slate-400">Cadastro, aprovação, vencimento e baixa com parceiro e centro de custo.</p></div><div className="flex flex-wrap gap-2"><select value={companyId} onChange={(event) => chooseCompany(event.target.value)} className={inputClass}><option value="ALL">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><select value={approval} onChange={(event) => chooseApproval(event.target.value as Approval)} className={inputClass}><option value="ALL">Todas as aprovações</option><option value="PENDING">Aguardando aprovação</option><option value="APPROVED">Aprovados</option><option value="REJECTED">Rejeitados</option><option value="NOT_REQUIRED">Dispensados</option></select><select value={status} onChange={(event) => chooseStatus(event.target.value as Status)} className={inputClass}><option value="ALL">Todos os status</option><option value="OPEN">Em aberto</option><option value="SETTLED">Baixados</option><option value="DISPUTED">Em disputa</option></select><button onClick={() => load()} className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-blue-300"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button></div></div>
    </section>

    <div className="grid gap-4 sm:grid-cols-3"><Kpi title="Em aberto" value={data.totals.open} tone="text-amber-400" /><Kpi title={isPayable ? 'Pagos' : 'Recebidos'} value={data.totals.settled} tone="text-emerald-400" /><div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs text-slate-400">Registros filtrados</p><p className="mt-2 text-2xl font-black text-white">{data.total}</p></div></div>

    <div className="flex justify-end"><Button disabled={companyId === 'ALL'} leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate((value) => !value)}>{companyId === 'ALL' ? 'Selecione uma empresa' : showCreate ? 'Fechar formulário' : isPayable ? 'Nova conta a pagar' : 'Nova conta a receber'}</Button></div>

    {showCreate && setup && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="mb-5 font-extrabold text-white">{isPayable ? 'Cadastrar obrigação de pagamento' : 'Cadastrar direito a receber'}</h2>{(!setup.categories.length || !setup.partners.length) && <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Cadastre ao menos uma categoria e um {isPayable ? 'fornecedor' : 'cliente'} em Administração antes de continuar.</p>}<form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <label><span className={labelClass}>Categoria</span><select name="category_id" required className={inputClass}><option value="">Selecione</option>{setup.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className={labelClass}>{isPayable ? 'Fornecedor' : 'Cliente'}</span><select name="partner_id" required className={inputClass}><option value="">Selecione</option>{setup.partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span className={labelClass}>Centro de custo</span><select name="cost_center_id" className={inputClass}><option value="">Não informado</option>{setup.costCenters.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
      <label><span className={labelClass}>Documento</span><input name="document_number" className={inputClass} /></label>
      <label><span className={labelClass}>Vencimento</span><input name="due_date" type="date" required className={inputClass} /></label>
      <label><span className={labelClass}>Valor</span><input name="amount" type="number" min="0.01" step="0.01" required className={inputClass} /></label>
      <label className="md:col-span-2 lg:col-span-3"><span className={labelClass}>Descrição</span><input name="description" required className={inputClass} /></label>
      <div className="md:col-span-2 lg:col-span-3"><Button type="submit" isLoading={isPending}>Salvar lançamento</Button></div>
    </form></section>}

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr>{['Vencimento','Empresa','Parceiro','Categoria','Centro de custo','Documento','Valor','Aprovação','Status','Ação'].map((title) => <th key={title} className="p-4">{title}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{data.entries.map((entry) => <tr key={entry.id}><td className="p-4 text-white">{entry.due_date ? new Date(entry.due_date).toLocaleDateString('pt-BR') : '—'}</td><td className="p-4 text-slate-400">{entry.company.name}</td><td className="p-4 font-bold text-white">{entry.partner?.name || entry.account_name}</td><td className="p-4 text-slate-300">{entry.category.name}</td><td className="p-4 text-slate-400">{entry.cost_center ? `${entry.cost_center.code} — ${entry.cost_center.name}` : '—'}</td><td className="p-4 text-slate-400">{entry.document_number || '—'}</td><td className={`p-4 font-bold ${isPayable ? 'text-rose-400' : 'text-emerald-400'}`}>{money.format(entry.amount)}</td><td className="p-4"><ApprovalBadge status={entry.approval_status} /></td><td className="p-4"><StatusBadge status={entry.settlement_status} /></td><td className="p-4"><div className="flex flex-wrap gap-2">{entry.approval_status === 'PENDING' && canApprove && entry.created_by_id !== currentUserId && <><button disabled={isPending} onClick={() => review(entry.id, 'APPROVED')} className="font-bold text-emerald-400 hover:text-emerald-300">Aprovar</button><button disabled={isPending} onClick={() => setRejectingId(rejectingId === entry.id ? null : entry.id)} className="font-bold text-rose-400 hover:text-rose-300">Rejeitar</button></>}{entry.settlement_status !== 'SETTLED' && entry.approval_status !== 'PENDING' && entry.approval_status !== 'REJECTED' && <button onClick={() => setSettlingId(settlingId === entry.id ? null : entry.id)} className="font-bold text-blue-400 hover:text-blue-300">Dar baixa</button>}</div></td></tr>)}{data.entries.map((entry) => settlingId === entry.id && <tr key={`${entry.id}-settle`} className="bg-blue-950/20"><td colSpan={10} className="p-4"><form onSubmit={(event) => submitSettlement(event, entry.id)} className="flex flex-wrap items-end gap-3"><label><span className={labelClass}>{isPayable ? 'Data do pagamento' : 'Data do recebimento'}</span><input name="settlement_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} /></label><label><span className={labelClass}>Conta bancária</span><select name="bank_account_id" className={inputClass}><option value="">Não informada</option>{setup?.bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bank_name} — {account.account_number || 'sem número'}</option>)}</select></label><Button type="submit" isLoading={isPending} leftIcon={<CalendarCheck className="h-4 w-4" />}>Confirmar baixa</Button></form></td></tr>)}{data.entries.map((entry) => rejectingId === entry.id && <tr key={`${entry.id}-reject`} className="bg-rose-950/20"><td colSpan={10} className="p-4"><form onSubmit={(event) => { event.preventDefault(); review(entry.id, 'REJECTED', String(new FormData(event.currentTarget).get('reason') || '')); }} className="flex items-end gap-3"><label className="min-w-80 flex-1"><span className={labelClass}>Motivo da rejeição</span><input name="reason" minLength={3} maxLength={500} required className={inputClass} /></label><Button type="submit" variant="danger" isLoading={isPending}>Confirmar rejeição</Button></form></td></tr>)}</tbody></table></div>{data.entries.length === 0 && <div className="p-12 text-center text-sm text-slate-500">Nenhum lançamento encontrado para o filtro selecionado.</div>}<Pagination page={data.page} pageSize={data.pageSize} totalItems={data.total} onPageChange={(page) => load(companyId, status, page)} /></section>
  </div>;
}

function Kpi({ title, value, tone }: { title: string; value: number; tone: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><p className="text-xs text-slate-400">{title}</p><CircleDollarSign className={`h-5 w-5 ${tone}`} /></div><p className={`mt-2 text-2xl font-black ${tone}`}>{money.format(value)}</p></div>; }
function StatusBadge({ status }: { status: string }) { const config = status === 'SETTLED' ? ['active', 'Baixado'] as const : status === 'DISPUTED' ? ['critical', 'Em disputa'] as const : ['review', 'Em aberto'] as const; return <Badge variant={config[0]}>{config[1]}</Badge>; }
function ApprovalBadge({ status }: { status: string }) { const config = status === 'APPROVED' ? ['active', 'Aprovado'] as const : status === 'PENDING' ? ['review', 'Pendente'] as const : status === 'REJECTED' ? ['critical', 'Rejeitado'] as const : ['ghost', 'Dispensado'] as const; return <Badge variant={config[0]}>{config[1]}</Badge>; }
