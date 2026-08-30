'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileUp, Link2, RefreshCw, Unlink, WalletCards } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/ToastProvider';
import { getReconciliationData, importBankStatement, matchBankTransaction, unmatchBankTransaction } from './actions';

type Data = Awaited<ReturnType<typeof getReconciliationData>>;
type Company = { id: string; name: string; code: string };
type Status = 'ALL' | 'MATCHED' | 'UNMATCHED';
type ParsedRow = { row_number: number; transaction_date: string; description: string; document_number?: string; amount: number };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export default function ReconciliationClient({ companies, initialData }: { companies: Company[]; initialData: Data }) {
  const toast = useToast();
  const [data, setData] = useState(initialData);
  const [companyId, setCompanyId] = useState('ALL');
  const [accountId, setAccountId] = useState('ALL');
  const [status, setStatus] = useState<Status>('ALL');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [isPending, startTransition] = useTransition();

  const load = (nextCompany = companyId, nextAccount = accountId, nextStatus = status, page = 1) => startTransition(async () => {
    try { setData(await getReconciliationData({ company_id: nextCompany, bank_account_id: nextAccount, status: nextStatus, page, page_size: 50 })); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao carregar a conciliação.'); }
  });
  const chooseCompany = (value: string) => { setCompanyId(value); setAccountId('ALL'); load(value, 'ALL', status); };

  const inspectCsv = async (selected: File) => {
    setFile(selected); setParseError('');
    try { const parsed = parseCsv(await selected.text()); setRows(parsed); if (!parsed.length) throw new Error('Nenhuma linha válida foi encontrada.'); }
    catch (error) { setRows([]); setParseError(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.'); }
  };
  const submitImport = (event: FormEvent) => { event.preventDefault(); if (!file || companyId === 'ALL' || accountId === 'ALL') return; startTransition(async () => {
    try { const result = await importBankStatement({ company_id: companyId, bank_account_id: accountId, file_name: file.name, rows }); toast.success(`${result.imported_rows} movimentações importadas.`); setFile(null); setRows([]); setShowImport(false); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Falha na importação.'); }
  }); };
  const match = (transactionId: string, entryId: string) => startTransition(async () => { try { await matchBankTransaction({ transaction_id: transactionId, financial_entry_id: entryId }); toast.success('Movimentação conciliada.'); load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao conciliar.'); } });
  const unmatch = (transactionId: string) => startTransition(async () => { try { await unmatchBankTransaction(transactionId); toast.success('Conciliação desfeita.'); load(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao desfazer conciliação.'); } });
  const filteredAccounts = data.bankAccounts.filter((account) => companyId === 'ALL' || account.company_id === companyId);

  return <div className="space-y-6 animate-fade-in">
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 p-6 shadow-2xl"><Link href="/finance" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Financeiro</Link><div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">Controle bancário</p><h1 className="mt-2 text-3xl font-black text-white">Conciliação Bancária</h1><p className="mt-1 text-sm text-slate-400">Compare o extrato com os lançamentos e resolva diferenças.</p></div><div className="flex flex-wrap gap-2"><select value={companyId} onChange={(event) => chooseCompany(event.target.value)} className={inputClass}><option value="ALL">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><select value={accountId} onChange={(event) => { setAccountId(event.target.value); load(companyId, event.target.value, status); }} className={inputClass}><option value="ALL">Todas as contas</option>{filteredAccounts.map((account) => <option key={account.id} value={account.id}>{account.bank_name} — {account.account_number || 'sem número'}</option>)}</select><select value={status} onChange={(event) => { const value = event.target.value as Status; setStatus(value); load(companyId, accountId, value); }} className={inputClass}><option value="ALL">Todos os status</option><option value="UNMATCHED">Pendentes</option><option value="MATCHED">Conciliados</option></select><button onClick={() => load()} className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-indigo-300"><RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} /></button></div></div></section>

    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Movimentações filtradas" value={String(data.total)} icon={<WalletCards className="h-5 w-5 text-blue-400" />} /><Metric label="Conciliadas" value={String(data.matched)} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} /><Metric label="Pendentes" value={String(data.unmatched)} icon={<Link2 className="h-5 w-5 text-amber-400" />} /></div>

    {companyId !== 'ALL' && filteredAccounts.length === 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">Esta empresa ainda não possui conta bancária ativa. <Link href="/admin" className="font-bold underline">Cadastre uma conta em Administração</Link> para importar o extrato.</div>}

    <div className="flex justify-end"><Button disabled={companyId === 'ALL' || accountId === 'ALL'} leftIcon={<FileUp className="h-4 w-4" />} onClick={() => setShowImport((value) => !value)}>{companyId === 'ALL' ? 'Selecione uma empresa' : accountId === 'ALL' ? 'Selecione uma conta' : showImport ? 'Fechar importação' : 'Importar extrato CSV'}</Button></div>

    {showImport && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="font-bold text-white">Importar extrato</h2><p className="mt-1 text-xs text-slate-400">CSV com colunas: data, descrição, valor e documento opcional. Valores positivos são entradas; negativos são saídas.</p><form onSubmit={submitImport}><label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-8"><FileUp className="h-7 w-7 text-indigo-400" /><span className="mt-2 text-xs font-bold">Escolher arquivo CSV</span><input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && inspectCsv(event.target.files[0])} /></label>{file && <p className="mt-3 text-xs text-slate-300">{file.name} · {rows.length} linhas válidas</p>}{parseError && <p className="mt-3 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{parseError}</p>}<Button type="submit" className="mt-4" disabled={!rows.length} isLoading={isPending}>Importar e conciliar automaticamente</Button></form></section>}

    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70"><div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr>{['Data','Empresa / Conta','Descrição','Documento','Valor','Status','Correspondência','Ação'].map((title) => <th key={title} className="p-4">{title}</th>)}</tr></thead><tbody>{data.transactions.map((transaction) => <tr key={transaction.id} className="border-t border-slate-800"><td className="p-4 text-white">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</td><td className="p-4"><p className="font-bold text-white">{transaction.company.name}</p><p className="text-slate-500">{transaction.bank_account.bank_name}</p></td><td className="max-w-64 p-4 text-slate-300">{transaction.description}</td><td className="p-4 text-slate-400">{transaction.document_number || '—'}</td><td className={`p-4 font-bold ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money.format(transaction.amount)}</td><td className="p-4"><Badge variant={transaction.match_status === 'MATCHED' ? 'active' : 'review'}>{transaction.match_status === 'MATCHED' ? 'Conciliada' : 'Pendente'}</Badge></td><td className="p-4">{transaction.financial_entry ? <div><p className="font-bold text-white">{transaction.financial_entry.account_name}</p><p className="text-slate-500">{transaction.financial_entry.document_number || transaction.financial_entry.description || 'Lançamento financeiro'}</p></div> : (data.candidates[transaction.id]?.length ? <select className={inputClass} defaultValue="" onChange={(event) => event.target.value && match(transaction.id, event.target.value)}><option value="">Selecionar sugestão</option>{data.candidates[transaction.id].map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.account_name} · {candidate.due_date ? new Date(candidate.due_date).toLocaleDateString('pt-BR') : 'sem vencimento'}</option>)}</select> : <span className="text-slate-500">Nenhuma correspondência exata</span>)}</td><td className="p-4">{transaction.match_status === 'MATCHED' && <button disabled={isPending} onClick={() => unmatch(transaction.id)} className="inline-flex items-center gap-1 font-bold text-rose-400"><Unlink className="h-3.5 w-3.5" /> Desfazer</button>}</td></tr>)}</tbody></table></div>{!data.transactions.length && <div className="p-12 text-center text-sm text-slate-500">Nenhuma movimentação bancária importada para os filtros selecionados.</div>}<Pagination page={data.page} pageSize={data.pageSize} totalItems={data.total} onPageChange={(page) => load(companyId, accountId, status, page)} /></section>

    {!!data.imports.length && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="font-bold text-white">Últimas importações</h2><div className="mt-3 divide-y divide-slate-800">{data.imports.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-xs"><span className="font-bold text-white">{item.file_name}</span><span className="text-slate-400">{item.bank_account.bank_name} · {item.imported_rows} importadas · {item.ignored_rows} ignoradas</span></div>)}</div></section>}
  </div>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex justify-between"><p className="text-xs text-slate-400">{label}</p>{icon}</div><p className="mt-2 text-2xl font-black text-white">{value}</p></div>; }

function parseCsv(content: string): ParsedRow[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O arquivo precisa conter cabeçalho e ao menos uma linha.');
  const delimiter = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ';' : ',';
  const cells = (line: string) => line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''));
  const headers = cells(lines[0]).map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
  const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const dateIndex = find('data', 'date', 'data movimento', 'data movimentacao');
  const descriptionIndex = find('descricao', 'historico', 'description');
  const amountIndex = find('valor', 'amount');
  const documentIndex = find('documento', 'doc', 'numero documento');
  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) throw new Error('Use as colunas data, descrição e valor.');
  return lines.slice(1).map((line, index) => {
    const values = cells(line); const rawDate = values[dateIndex] || ''; const parts = rawDate.split(/[\/-]/);
    const transaction_date = parts[0]?.length === 4 ? `${parts[0]}-${parts[1]?.padStart(2, '0')}-${parts[2]?.padStart(2, '0')}` : `${parts[2]}-${parts[1]?.padStart(2, '0')}-${parts[0]?.padStart(2, '0')}`;
    const rawAmount = (values[amountIndex] || '').replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
    return { row_number: index + 2, transaction_date, description: values[descriptionIndex] || '', document_number: documentIndex >= 0 ? values[documentIndex] : undefined, amount: Number(rawAmount) };
  }).filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date) && row.description && Number.isFinite(row.amount) && row.amount !== 0);
}
