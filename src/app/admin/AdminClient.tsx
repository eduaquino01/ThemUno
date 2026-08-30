'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Landmark, Plus, Settings, Tags, Target, UserRoundSearch, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import {
  createAdminCompany, createAdminUser, createBankAccount, createCostCenter,
  createFinancialCategory, createPartner, getAdminOverview, setUserActive, updateFinancialApprovalThreshold, updateFinancialCategoryDreGroup,
} from './actions';

type AdminData = Awaited<ReturnType<typeof getAdminOverview>>;
type Tab = 'companies' | 'users' | 'accounts' | 'categories' | 'cost-centers' | 'partners';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';
const labelClass = 'block text-[11px] font-bold text-slate-300 mb-1.5';

export default function AdminClient({ initialData }: { initialData: AdminData }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('companies');
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const run = (operation: () => Promise<unknown>, successMessage: string) => {
    startTransition(async () => {
      try {
        await operation();
        toast.success(successMessage);
        setShowForm(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
      }
    });
  };

  const submitCompany = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createAdminCompany({
      name: form.get('name'), code: form.get('code'), tax_id: form.get('tax_id'),
      color: form.get('color'), is_holding: form.get('is_holding') === 'on',
    }), 'Empresa cadastrada com sucesso.');
  };

  const submitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createAdminUser({
      name: form.get('name'), email: form.get('email'), password: form.get('password'), role: form.get('role'),
      company_ids: form.getAll('company_ids'),
    }), 'Usuário cadastrado com sucesso.');
  };

  const submitAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createBankAccount({
      company_id: form.get('company_id'), bank_name: form.get('bank_name'), branch: form.get('branch'),
      account_number: form.get('account_number'), opening_balance: Number(form.get('opening_balance')),
    }), 'Conta bancária cadastrada com sucesso.');
  };

  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createFinancialCategory({ company_id: form.get('company_id'), name: form.get('name'), nature: form.get('nature') }), 'Categoria financeira cadastrada.');
  };

  const submitCostCenter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createCostCenter({ company_id: form.get('company_id'), code: form.get('code'), name: form.get('name'), description: form.get('description') }), 'Centro de custo cadastrado.');
  };

  const submitPartner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() => createPartner({
      company_id: form.get('company_id'), type: form.get('type'), name: form.get('name'),
      tax_id: form.get('tax_id'), email: form.get('email'), phone: form.get('phone'),
    }), 'Parceiro cadastrado.');
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'users', label: 'Usuários e acessos', icon: Users },
    { id: 'accounts', label: 'Contas bancárias', icon: Landmark },
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'cost-centers', label: 'Centros de custo', icon: Target },
    { id: 'partners', label: 'Parceiros', icon: UserRoundSearch },
  ];

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-blue-400 text-xs font-extrabold uppercase tracking-widest"><Settings className="w-4 h-4" /> Administração</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">Configuração da operação</h1>
        <p className="mt-1 text-sm text-slate-400">Gerencie empresas, acessos e contas usadas pelo módulo financeiro.</p>
      </div>
      <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm((value) => !value)}>{showForm ? 'Fechar formulário' : 'Novo cadastro'}</Button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card ambientColor="blue"><p className="text-xs text-slate-400">Empresas</p><p className="mt-2 text-3xl font-black text-white">{initialData.companies.length}</p></Card>
      <Card ambientColor="purple"><p className="text-xs text-slate-400">Usuários ativos</p><p className="mt-2 text-3xl font-black text-white">{initialData.users.filter((user) => user.is_active).length}</p></Card>
      <Card ambientColor="emerald"><p className="text-xs text-slate-400">Contas bancárias ativas</p><p className="mt-2 text-3xl font-black text-white">{initialData.bankAccounts.filter((account) => account.is_active).length}</p></Card>
    </div>

    <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-3">
      {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setShowForm(false); }} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${tab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}><Icon className="w-4 h-4" />{item.label}</button>; })}
    </div>

    {showForm && tab === 'companies' && <Card ambientColor="blue"><h2 className="mb-4 font-extrabold text-white">Nova empresa</h2><form onSubmit={submitCompany} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Razão social</span><input name="name" required minLength={2} className={inputClass} /></label>
      <label><span className={labelClass}>Código</span><input name="code" required pattern="[A-Za-z0-9-]+" className={inputClass} placeholder="EMPRESA-CE" /></label>
      <label><span className={labelClass}>CNPJ</span><input name="tax_id" className={inputClass} /></label>
      <label><span className={labelClass}>Cor de identificação</span><input name="color" type="color" defaultValue="#3b82f6" className={`${inputClass} h-10`} /></label>
      <label className="flex items-center gap-2 text-xs text-slate-300"><input name="is_holding" type="checkbox" /> Empresa holding</label>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar empresa</Button></div>
    </form></Card>}

    {showForm && tab === 'users' && <Card ambientColor="purple"><h2 className="mb-4 font-extrabold text-white">Novo usuário</h2><form onSubmit={submitUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Nome</span><input name="name" required className={inputClass} /></label>
      <label><span className={labelClass}>E-mail</span><input name="email" type="email" required className={inputClass} /></label>
      <label><span className={labelClass}>Senha inicial</span><input name="password" type="password" minLength={12} required className={inputClass} /></label>
      <label><span className={labelClass}>Perfil</span><select name="role" className={inputClass} defaultValue="CONSULTA"><option value="ADMIN">Administrador</option><option value="DIRETORIA">Diretoria</option><option value="FINANCEIRO">Financeiro</option><option value="CONTRATOS">Contratos</option><option value="CONSULTA">Consulta</option></select></label>
      <fieldset className="md:col-span-2"><legend className={labelClass}>Empresas permitidas</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{initialData.companies.map((company) => <label key={company.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300"><input name="company_ids" type="checkbox" value={company.id} />{company.name}</label>)}</div></fieldset>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar usuário</Button></div>
    </form></Card>}

    {showForm && tab === 'accounts' && <Card ambientColor="emerald"><h2 className="mb-4 font-extrabold text-white">Nova conta bancária</h2><form onSubmit={submitAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Empresa</span><select name="company_id" required className={inputClass}><option value="">Selecione</option>{initialData.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      <label><span className={labelClass}>Banco</span><input name="bank_name" required className={inputClass} /></label>
      <label><span className={labelClass}>Agência</span><input name="branch" className={inputClass} /></label>
      <label><span className={labelClass}>Conta</span><input name="account_number" className={inputClass} /></label>
      <label><span className={labelClass}>Saldo inicial</span><input name="opening_balance" type="number" step="0.01" defaultValue="0" required className={inputClass} /></label>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar conta</Button></div>
    </form></Card>}

    {showForm && tab === 'categories' && <Card ambientColor="blue"><h2 className="mb-4 font-extrabold text-white">Nova categoria financeira</h2><form onSubmit={submitCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Empresa</span><CompanySelect companies={initialData.companies} /></label>
      <label><span className={labelClass}>Natureza</span><select name="nature" className={inputClass}><option value="EXPENSE">Despesa</option><option value="REVENUE">Receita</option></select></label>
      <label className="md:col-span-2"><span className={labelClass}>Nome da categoria</span><input name="name" required className={inputClass} placeholder="Ex.: Serviços de terceiros" /></label>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar categoria</Button></div>
    </form></Card>}

    {showForm && tab === 'cost-centers' && <Card ambientColor="amber"><h2 className="mb-4 font-extrabold text-white">Novo centro de custo</h2><form onSubmit={submitCostCenter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Empresa</span><CompanySelect companies={initialData.companies} /></label>
      <label><span className={labelClass}>Código</span><input name="code" required pattern="[A-Za-z0-9-]+" className={inputClass} placeholder="ADM-001" /></label>
      <label><span className={labelClass}>Nome</span><input name="name" required className={inputClass} placeholder="Administrativo" /></label>
      <label><span className={labelClass}>Descrição</span><input name="description" className={inputClass} /></label>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar centro de custo</Button></div>
    </form></Card>}

    {showForm && tab === 'partners' && <Card ambientColor="purple"><h2 className="mb-4 font-extrabold text-white">Novo parceiro ou fornecedor</h2><form onSubmit={submitPartner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label><span className={labelClass}>Empresa</span><CompanySelect companies={initialData.companies} /></label>
      <label><span className={labelClass}>Tipo</span><select name="type" className={inputClass}><option value="SUPPLIER">Fornecedor</option><option value="CUSTOMER">Cliente</option><option value="BOTH">Cliente e fornecedor</option></select></label>
      <label><span className={labelClass}>Nome ou razão social</span><input name="name" required className={inputClass} /></label>
      <label><span className={labelClass}>CPF/CNPJ</span><input name="tax_id" className={inputClass} /></label>
      <label><span className={labelClass}>E-mail</span><input name="email" type="email" className={inputClass} /></label>
      <label><span className={labelClass}>Telefone</span><input name="phone" className={inputClass} /></label>
      <div className="md:col-span-2"><Button type="submit" isLoading={isPending}>Cadastrar parceiro</Button></div>
    </form></Card>}

    {tab === 'companies' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{initialData.companies.map((company) => <Card key={company.id} hoverGlow><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="mt-1 h-10 w-2 rounded-full" style={{ backgroundColor: company.color }} /><div><h3 className="font-extrabold text-white">{company.name}</h3><p className="mt-1 text-xs text-slate-400">{company.code} · {company.tax_id || 'CNPJ não informado'}</p></div></div>{company.is_holding && <Badge variant="info">Holding</Badge>}</div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><Metric value={company._count.contracts} label="Contratos" /><Metric value={company._count.user_companies} label="Usuários" /><Metric value={company._count.bank_accounts} label="Contas" /></div><form className="mt-4 flex items-end gap-2 border-t border-slate-800 pt-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); run(() => updateFinancialApprovalThreshold({ company_id: company.id, threshold: Number(form.get('threshold')) }), 'Limite de aprovação atualizado.'); }}><label className="flex-1"><span className={labelClass}>Exigir aprovação a partir de</span><input name="threshold" type="number" min="0" step="0.01" required defaultValue={company.financial_approval_threshold} className={inputClass} /></label><Button type="submit" size="sm" isLoading={isPending}>Atualizar</Button></form></Card>)}</div>}

    {tab === 'users' && <div className="overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Usuário</th><th className="p-4">Perfil</th><th className="p-4">Empresas</th><th className="p-4">Último acesso</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-slate-800 bg-slate-900/60">{initialData.users.map((user) => <tr key={user.id}><td className="p-4"><p className="font-bold text-white">{user.name}</p><p className="text-slate-500">{user.email}</p></td><td className="p-4"><Badge variant="info">{user.role}</Badge></td><td className="p-4 text-slate-300">{user.companies.length || 'Acesso global'}</td><td className="p-4 text-slate-400">{user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'Nunca'}</td><td className="p-4"><button disabled={isPending} onClick={() => run(() => setUserActive(user.id, !user.is_active), user.is_active ? 'Usuário desativado.' : 'Usuário ativado.')}><Badge variant={user.is_active ? 'active' : 'ghost'}>{user.is_active ? 'Ativo' : 'Inativo'}</Badge></button></td></tr>)}</tbody></table></div>}

    {tab === 'accounts' && <div className="overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Empresa</th><th className="p-4">Banco</th><th className="p-4">Agência/conta</th><th className="p-4 text-right">Saldo inicial</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-slate-800 bg-slate-900/60">{initialData.bankAccounts.map((account) => <tr key={account.id}><td className="p-4 text-slate-300">{account.company.name}</td><td className="p-4 font-bold text-white">{account.bank_name}</td><td className="p-4 text-slate-400">{account.branch || '—'} / {account.account_number || '—'}</td><td className="p-4 text-right font-mono text-emerald-400">{account.opening_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-4"><Badge variant={account.is_active ? 'active' : 'ghost'}>{account.is_active ? 'Ativa' : 'Inativa'}</Badge></td></tr>)}</tbody></table>{initialData.bankAccounts.length === 0 && <div className="p-10 text-center text-sm text-slate-500">Nenhuma conta bancária cadastrada.</div>}</div>}

    {tab === 'categories' && <CatalogTable headers={['Empresa', 'Categoria', 'Natureza', 'Grupo DRE', 'Status']} empty="Nenhuma categoria financeira cadastrada.">{initialData.financialCategories.map((category) => <tr key={category.id} className="border-t border-slate-800"><td className="p-4 text-slate-400">{category.company.name}</td><td className="p-4 font-bold text-white">{category.name}</td><td className="p-4"><Badge variant={category.nature === 'REVENUE' ? 'revenue' : 'expense'}>{category.nature === 'REVENUE' ? 'Receita' : 'Despesa'}</Badge></td><td className="p-4"><select defaultValue={category.dre_group} onChange={(event) => run(() => updateFinancialCategoryDreGroup(category.id, event.target.value), 'Grupo da DRE atualizado.')} className={inputClass}><option value="GROSS_REVENUE">Receita bruta</option><option value="REVENUE_DEDUCTION">Dedução da receita</option><option value="DIRECT_COST">Custo direto</option><option value="OPERATING_EXPENSE">Despesa operacional</option><option value="FINANCIAL_RESULT">Resultado financeiro</option><option value="TAX">Tributos</option></select></td><td className="p-4"><Badge variant={category.is_active ? 'active' : 'ghost'}>{category.is_active ? 'Ativa' : 'Inativa'}</Badge></td></tr>)}</CatalogTable>}

    {tab === 'cost-centers' && <CatalogTable headers={['Empresa', 'Código', 'Centro de custo', 'Status']} empty="Nenhum centro de custo cadastrado.">{initialData.costCenters.map((center) => <tr key={center.id} className="border-t border-slate-800"><td className="p-4 text-slate-400">{center.company.name}</td><td className="p-4 font-mono text-amber-400">{center.code}</td><td className="p-4"><p className="font-bold text-white">{center.name}</p><p className="text-slate-500">{center.description || 'Sem descrição'}</p></td><td className="p-4"><Badge variant={center.is_active ? 'active' : 'ghost'}>{center.is_active ? 'Ativo' : 'Inativo'}</Badge></td></tr>)}</CatalogTable>}

    {tab === 'partners' && <CatalogTable headers={['Empresa', 'Parceiro', 'Tipo', 'Contato', 'Status']} empty="Nenhum parceiro cadastrado.">{initialData.partners.map((partner) => <tr key={partner.id} className="border-t border-slate-800"><td className="p-4 text-slate-400">{partner.company.name}</td><td className="p-4"><p className="font-bold text-white">{partner.name}</p><p className="text-slate-500">{partner.tax_id || 'Documento não informado'}</p></td><td className="p-4"><Badge variant="info">{partner.type === 'CUSTOMER' ? 'Cliente' : partner.type === 'SUPPLIER' ? 'Fornecedor' : 'Ambos'}</Badge></td><td className="p-4 text-slate-400">{partner.email || partner.phone || '—'}</td><td className="p-4"><Badge variant={partner.is_active ? 'active' : 'ghost'}>{partner.is_active ? 'Ativo' : 'Inativo'}</Badge></td></tr>)}</CatalogTable>}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl bg-slate-950 p-3"><p className="text-lg font-black text-white">{value}</p><p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p></div>;
}

function CompanySelect({ companies }: { companies: AdminData['companies'] }) {
  return <select name="company_id" required className={inputClass}><option value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>;
}

function CatalogTable({ headers, empty, children }: { headers: string[]; empty: string; children: React.ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr>{headers.map((header) => <th key={header} className="p-4">{header}</th>)}</tr></thead><tbody className="bg-slate-900/60">{children}</tbody></table>{!hasItems && <div className="p-10 text-center text-sm text-slate-500">{empty}</div>}</div>;
}
