'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  FilePlus2,
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  Download,
  Building2,
  Sparkles,
  Sun,
  Moon,
  Eye,
  X,
  TrendingUp,
  Inbox,
  ArrowUpRight,
  Layers,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  Key,
  Lock,
  Copy,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

import { createContract, updateContract, deleteContract, createContractCredential, deleteContractCredential, getCredentialSecret } from '@/app/actions';
import { formatCurrency, formatDate, parseNumber } from '@/lib/formatters';
import { ETP_STANDARD_SECTIONS, TR_STANDARD_SECTIONS } from './lib/etpTrTemplates';
import PasswordInputWithGenerator from '@/components/PasswordInputWithGenerator';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

type TabType = 'overview' | 'contracts' | 'milestones' | 'changes' | 'risks' | 'invoices' | 'etp_tr' | 'vault';

interface DashboardClientProps {
  initialData: {
    contracts: any[];
    milestones: any[];
    changeRequests: any[];
    risks: any[];
    invoices: any[];
    standaloneCredentials?: any[];
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');

  useEffect(() => {
    const handleCompanyChange = (e: any) => {
      setSelectedCompanyId(e.detail || 'ALL');
    };
    window.addEventListener('themuno_company_changed', handleCompanyChange);

    const saved = localStorage.getItem('themuno_selected_company_id');
    if (saved && saved !== 'ALL') {
      const allContracts = initialData.contracts || [];
      const hasCompanyInContracts = allContracts.some((c: any) => c.company_id === saved || c.company?.id === saved);
      if (hasCompanyInContracts) {
        setSelectedCompanyId(saved);
      } else {
        setSelectedCompanyId('ALL');
        localStorage.setItem('themuno_selected_company_id', 'ALL');
      }
    }
    return () => window.removeEventListener('themuno_company_changed', handleCompanyChange);
  }, [initialData]);

  // Dynamic state for data
  const [contracts, setContracts] = useState<any[]>(initialData.contracts || []);
  const [milestones, setMilestones] = useState<any[]>(initialData.milestones || []);
  const [changeRequests, setChangeRequests] = useState<any[]>(initialData.changeRequests || []);
  const [risks, setRisks] = useState<any[]>(initialData.risks || []);
  const [invoices, setInvoices] = useState<any[]>(initialData.invoices || []);
  const [standaloneCredentials, setStandaloneCredentials] = useState<any[]>(initialData.standaloneCredentials || []);

  useEffect(() => {
    setContracts(initialData.contracts || []);
    setMilestones(initialData.milestones || []);
    setChangeRequests(initialData.changeRequests || []);
    setRisks(initialData.risks || []);
    setInvoices(initialData.invoices || []);
    setStandaloneCredentials(initialData.standaloneCredentials || []);
  }, [initialData]);

  // Filter states
  const [contractFilter, setContractFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected item state for detail modals
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showAddContractModal, setShowAddContractModal] = useState<boolean>(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [deletingContract, setDeletingContract] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Edit form state
  const [editContractForm, setEditContractForm] = useState({
    title: '',
    type: 'SOW',
    nature: 'EXPENSE',
    counterpart: '',
    status: 'DRAFT',
    start_date: '',
    end_date: '',
    auto_renewal: false,
    notice_period_days: 30,
    total_value: '' as string | number,
    raw_text_or_url: '',
  });

  // Form state for adding contract
  const [newContractTitle, setNewContractTitle] = useState('');
  const [newContractType, setNewContractType] = useState<string>('SOW');
  const [newContractNature, setNewContractNature] = useState<string>('EXPENSE');
  const [newContractCounterpart, setNewContractCounterpart] = useState('');
  const [newContractValue, setNewContractValue] = useState('');
  const [newContractStart, setNewContractStart] = useState('');
  const [newContractEnd, setNewContractEnd] = useState('');
  const [newContractAutoRenewal, setNewContractAutoRenewal] = useState(false);
  const [newContractNoticePeriod, setNewContractNoticePeriod] = useState(30);

  // ETP / TR Interactive state
  const [etpMode, setEtpMode] = useState<'ETP' | 'TR'>('ETP');
  const [etpTitle, setEtpTitle] = useState<string>('');
  const [etpSections, setEtpSections] = useState(ETP_STANDARD_SECTIONS);
  const [trSections, setTrSections] = useState(TR_STANDARD_SECTIONS);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);

  // Financial calculations & Credentials
  const filteredContracts = contracts.filter(c => selectedCompanyId === 'ALL' || c.company_id === selectedCompanyId);

  const totalContractValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalRevenueValue = filteredContracts.filter(c => c.nature === 'REVENUE').reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalExpenseValue = filteredContracts.filter(c => c.nature === 'EXPENSE').reduce((sum, c) => sum + (c.total_value || 0), 0);

  const displayedMilestones = filteredContracts.flatMap(c => c.milestones || []);
  const displayedChangeRequests = filteredContracts.flatMap(c => c.change_requests || []);
  const displayedRisks = filteredContracts.flatMap(c => c.risks || []);
  const displayedInvoices = filteredContracts.flatMap(c => c.invoices || []);
  const totalInvoiced = displayedInvoices.reduce((sum, i) => sum + (i.status === 'PAID' ? (i.amount || 0) : 0), 0);

  const contractCredentials = contracts.flatMap(c => 
    (c.credentials || []).map((cred: any) => ({ ...cred, contractId: c.id, contractTitle: c.title }))
  );
  const personalCredentials = standaloneCredentials.map((cred: any) => ({ ...cred, contractId: null, contractTitle: 'Senha Pessoal / Geral' }));

  const allCredentials = [...personalCredentials, ...contractCredentials];

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vaultFilterType, setVaultFilterType] = useState<string>('ALL');
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const VAULT_PAGE_SIZE = 60;
  const [vaultPage, setVaultPage] = useState(1);
  useEffect(() => {
    setVaultPage(1);
  }, [vaultFilterType, vaultSearch]);
  // Segredos revelados sob demanda (nunca chegam do carregamento inicial da página)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const handleCopySecret = (id: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Busca o segredo no servidor na primeira vez que é revelado/copiado e
  // mantém em cache local só para esta sessão da página.
  const revealCredential = async (id: string): Promise<string | null> => {
    if (revealedSecrets[id]) return revealedSecrets[id];
    setRevealingId(id);
    try {
      const secret = await getCredentialSecret(id);
      setRevealedSecrets((prev) => ({ ...prev, [id]: secret }));
      return secret;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao revelar credencial.');
      return null;
    } finally {
      setRevealingId(null);
    }
  };

  const toggleSecretVisibility = async (id: string) => {
    if (visibleSecrets[id]) {
      setVisibleSecrets((prev) => ({ ...prev, [id]: false }));
      return;
    }
    const secret = await revealCredential(id);
    if (secret !== null) {
      setVisibleSecrets((prev) => ({ ...prev, [id]: true }));
    }
  };

  const handleCopyCredentialSecret = async (id: string) => {
    const secret = await revealCredential(id);
    if (secret !== null) {
      handleCopySecret(id, secret);
    }
  };

  const [showGlobalCredentialModal, setShowGlobalCredentialModal] = useState(false);
  const [globalCredentialForm, setGlobalCredentialForm] = useState({
    contract_id: 'PERSONAL',
    type: 'PERSONAL_ACCOUNT' as 'PORTAL_LOGIN' | 'API_KEY' | 'SOFTWARE_LICENSE' | 'SERVICE_ACCOUNT' | 'PERSONAL_ACCOUNT' | 'OTHER',
    title: '',
    username: '',
    secret_value: '',
    login_url: '',
    notes: '',
  });

  const handleAddGlobalCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalCredentialForm.title || !globalCredentialForm.secret_value) return;

    try {
      const targetContractId = (!globalCredentialForm.contract_id || globalCredentialForm.contract_id === 'PERSONAL') ? null : globalCredentialForm.contract_id;

      const created = await createContractCredential({
        contract_id: targetContractId,
        type: globalCredentialForm.type,
        title: globalCredentialForm.title,
        username: globalCredentialForm.username || null,
        secret_value: globalCredentialForm.secret_value,
        login_url: globalCredentialForm.login_url || null,
        notes: globalCredentialForm.notes || null,
      });

      if (created) {
        // O usuário acabou de digitar esse segredo neste formulário — não há
        // problema em já deixá-lo disponível localmente para "revelar" sem
        // precisar buscar de novo no servidor.
        setRevealedSecrets(prev => ({ ...prev, [created.id]: globalCredentialForm.secret_value }));
        if (targetContractId) {
          setContracts(prev => prev.map(c => {
            if (c.id === targetContractId) {
              return { ...c, credentials: [created, ...(c.credentials || [])] };
            }
            return c;
          }));
        } else {
          setStandaloneCredentials(prev => [created, ...prev]);
        }
      }

      setShowGlobalCredentialModal(false);
      setGlobalCredentialForm({
        contract_id: 'PERSONAL',
        type: 'PERSONAL_ACCOUNT',
        title: '',
        username: '',
        secret_value: '',
        login_url: '',
        notes: '',
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar credencial.');
    }
  };
  const pendingInvoiced = invoices.reduce((sum, i) => sum + (i.status === 'ISSUED' || i.status === 'PENDING_ACCEPTANCE' ? (i.amount || 0) : 0), 0);
  const disputedInvoiced = invoices.reduce((sum, i) => sum + (i.status === 'DISPUTED' ? (i.amount || 0) : 0), 0);

  const acceptedMilestonesCount = milestones.filter(m => m.acceptance_status === 'ACCEPTED').length;
  const criticalRisksCount = risks.filter(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH').length;

  const searchedContracts = filteredContracts.filter(c => {
    const matchesFilter = contractFilter === 'ALL' || c.type === contractFilter;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.counterpart.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractTitle || !newContractCounterpart) return;

    try {
      const created = await createContract({
        title: newContractTitle,
        type: newContractType as any,
        nature: newContractNature as any,
        counterpart: newContractCounterpart,
        status: 'ACTIVE',
        start_date: newContractStart || new Date().toISOString().split('T')[0],
        end_date: newContractEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auto_renewal: false,
        notice_period_days: 30,
        total_value: parseNumber(newContractValue),
        raw_text_or_url: null,
      });

      if (created) {
        setContracts((prev) => [created, ...prev]);
      }

      setShowAddContractModal(false);
      setNewContractTitle('');
      setNewContractCounterpart('');
      setNewContractValue('');
      setNewContractStart('');
      setNewContractEnd('');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar contrato.');
    }
  };

  const generateCompiledDocument = () => {
    if (!etpTitle) {
      toast.error('Por favor, informe o título do objeto antes de compilar.');
      return;
    }
    let text = `# ${etpMode === 'ETP' ? 'ESTUDO TÉCNICO PRELIMINAR (ETP)' : 'TERMO DE REFERÊNCIA (TR)'}\n`;
    text += `**Objeto**: ${etpTitle}\n`;
    text += `**Data de Emissão**: ${formatDate(new Date())}\n\n`;
    text += `---\n\n`;

    const sections = etpMode === 'ETP' ? etpSections : trSections;
    sections.forEach(s => {
      if (s.content.trim().length > 0) {
        text += `### ${s.title}\n${s.content}\n\n`;
      }
    });

    setGeneratedDoc(text);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Navigation Tabs */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sticky top-0 z-30 shadow-xl">
        <div className="flex space-x-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Layers },
            { id: 'contracts', label: 'Contratos', icon: FileText, count: contracts.length },
            { id: 'milestones', label: 'Marcos & Entregáveis', icon: CheckCircle2, count: milestones.length },
            { id: 'changes', label: 'Solicitações de Aditivo', icon: FilePlus2, count: changeRequests.length },
            { id: 'risks', label: 'Matriz de Riscos', icon: ShieldAlert, count: risks.length, badgeColor: 'bg-rose-500/20 text-rose-500 font-bold' },
            { id: 'invoices', label: 'Faturamento', icon: DollarSign, count: invoices.length },
            { id: 'vault', label: 'Cofre de Senhas', icon: Key, count: allCredentials.length, badgeColor: 'bg-blue-500/20 text-blue-500 font-bold' },
            { id: 'etp_tr', label: 'Planejamento (ETP/TR)', icon: BookOpen, highlight: true },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#003355] text-[#a3c9ee] border border-blue-400/40 shadow-lg shadow-blue-950/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                } ${tab.highlight ? 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-300' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.highlight ? 'text-indigo-400' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-full ${tab.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: VISÃO GERAL / OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Executive KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Valor Total Contratado */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-blue-500/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Contratos Ativos</span>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCurrency(totalContractValue)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    {contracts.length} sob vigência
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    100% Ativos
                  </span>
                </div>
              </div>

              {/* Card 2: Marcos Aceitos */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Marcos Aceitos</span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {acceptedMilestonesCount} <span className="text-lg text-slate-500 font-semibold">/ {milestones.length}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {milestones.length > 0 ? `${Math.round((acceptedMilestonesCount / milestones.length) * 100)}% homologados` : 'Sem entregáveis'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Homologado
                  </span>
                </div>
              </div>

              {/* Card 3: Faturamento Pago */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-purple-500/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Faturamento Liquidado</span>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCurrency(totalInvoiced)}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium truncate">
                    {formatCurrency(pendingInvoiced)} pendentes
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                    Auditado
                  </span>
                </div>
              </div>

              {/* Card 4: Matriz de Riscos */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-rose-500/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-rose-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas de Risco</span>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-inner">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-rose-400 tracking-tight">
                  {criticalRisksCount} Críticos
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {risks.length} riscos catalogados
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Governança
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contracts List Widget */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contratos em Destaque</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Acompanhamento de vigência e contrapartes</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAddContractModal(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Novo Contrato
                    </button>
                    <button
                      onClick={() => setActiveTab('contracts')}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      Ver Todos <ChevronRight className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>

                {contracts.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title="Nenhum contrato cadastrado"
                    description="Cadastre o primeiro contrato para começar a acompanhar vigência, faturamento e riscos."
                    actionLabel="Cadastrar Primeiro Contrato"
                    onAction={() => setShowAddContractModal(true)}
                  />
                ) : (
                  <div className="space-y-3">
                    {contracts.slice(0, 4).map(contract => (
                      <div
                        key={contract.id}
                        onClick={() => setSelectedContract(contract)}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {contract.type}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                              {contract.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="flex items-center"><Building2 className="w-3 h-3 mr-1" />{contract.counterpart}</span>
                              <span>•</span>
                              <span>Vencimento: {formatDate(contract.end_date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {formatCurrency(contract.total_value)}
                          </span>
                          <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {contract.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Widget */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg relative overflow-hidden">
                  <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                    Módulo de Planejamento
                  </span>
                  <h3 className="text-lg font-bold mt-2">Elaboração de ETP & TR</h3>
                  <p className="text-xs text-indigo-100 mt-1">
                    Crie Estudos Técnicos Preliminares e Termos de Referência em tom técnico e administrativo.
                  </p>
                  <button
                    onClick={() => setActiveTab('etp_tr')}
                    className="mt-4 px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center"
                  >
                    Iniciar Novo Documento <Sparkles className="w-3.5 h-3.5 ml-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CONTRATOS */}
        {/* ======================================================== */}
        {activeTab === 'contracts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Contratos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualização de instrumentos contratuais, prazos de renovação e rescisão.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddContractModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Contrato
                </button>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar contrato..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                  />
                </div>

                <select
                  value={contractFilter}
                  onChange={e => setContractFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Todos os Tipos</option>
                  <option value="MSA">MSA</option>
                  <option value="SOW">SOW</option>
                  <option value="SLA">SLA</option>
                  <option value="SAAS">SaaS</option>
                  <option value="NDA">NDA</option>
                </select>
              </div>
            </div>

            {searchedContracts.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nenhum contrato encontrado"
                description="Nenhum contrato corresponde aos filtros atuais. Ajuste a busca ou cadastre um novo contrato."
                actionLabel="Adicionar Contrato"
                onAction={() => setShowAddContractModal(true)}
              />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-6">Título do Contrato</th>
                        <th className="py-3.5 px-4">Tipo</th>
                        <th className="py-3.5 px-4">Contraparte</th>
                        <th className="py-3.5 px-4">Vigência</th>
                        <th className="py-3.5 px-4">Valor Total</th>
                        <th className="py-3.5 px-6 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {searchedContracts.map(contract => (
                        <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                            {contract.title}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[10px]">
                              {contract.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                            {contract.counterpart}
                          </td>
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatDate(contract.start_date)} à {formatDate(contract.end_date)}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(contract.total_value)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => setSelectedContract(contract)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                                title="Visualizar detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingContract(contract);
                                  setEditContractForm({
                                    title: contract.title || '',
                                    type: contract.type || 'SOW',
                                    nature: contract.nature || 'EXPENSE',
                                    counterpart: contract.counterpart || '',
                                    status: contract.status || 'DRAFT',
                                    start_date: contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : '',
                                    end_date: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : '',
                                    auto_renewal: contract.auto_renewal || false,
                                    notice_period_days: contract.notice_period_days || 30,
                                    total_value: contract.total_value || '',
                                    raw_text_or_url: contract.raw_text_or_url || '',
                                  });
                                }}
                                className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                                title="Editar Contrato"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setDeleteConfirmText(''); setDeletingContract(contract); }}
                                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                title="Excluir Contrato"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MARCOS E ENTREGÁVEIS */}
        {/* ======================================================== */}
        {activeTab === 'milestones' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Marcos & Entregáveis (Milestones)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento dos critérios de aceite técnico para liberação de medição e faturamento.
              </p>
            </div>

            {milestones.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhum marco cadastrado" description="Nenhum entregável ou marco foi registrado ainda para os contratos existentes." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {milestones.map(milestone => (
                  <div key={milestone.id} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{milestone.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{milestone.scope_description}</p>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                      <span>Prazo: {formatDate(milestone.due_date)}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(milestone.billing_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SOLICITAÇÕES DE ADITIVO */}
        {/* ======================================================== */}
        {activeTab === 'changes' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Solicitações de Aditivo (Change Requests)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro de repactuação de escopo, prazo e valor contratual.
              </p>
            </div>

            {changeRequests.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhuma solicitação de mudança" description="Nenhuma solicitação de aditivo ou mudança de escopo foi cadastrada ainda." />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {changeRequests.map(cr => (
                  <div key={cr.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{cr.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{cr.scope_impact}</p>
                      <p className="text-[11px] text-slate-400 mt-2">Solicitado por: {cr.requested_by}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Custo Adicional</span>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(cr.financial_impact)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: MATRIZ DE RISCOS */}
        {/* ======================================================== */}
        {activeTab === 'risks' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Matriz de Riscos Operacionais</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monitoramento contínuo de riscos de privacidade, financeiros e operacionais.
              </p>
            </div>

            {risks.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhum risco cadastrado" description="Nenhum risco foi registrado ainda na matriz de riscos dos contratos." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {risks.map(r => (
                  <div key={r.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 border-l-4 border-l-rose-500">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-rose-500 uppercase">{r.category}</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">{r.risk_level}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{r.description}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-semibold">Mitigação:</span> {r.mitigation_plan}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: FATURAMENTO */}
        {/* ======================================================== */}
        {activeTab === 'invoices' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Faturamento & Conciliação</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento de emissão de notas fiscais, evidências de aceite e tratamento de disputas.
              </p>
            </div>

            {invoices.length === 0 ? (
              <EmptyState icon={Inbox} title="Nenhuma fatura registrada" description="Nenhuma nota fiscal ou faturamento foi registrado ainda." />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 uppercase text-[11px] font-semibold text-slate-500">
                      <th className="py-3.5 px-6">NF Nº</th>
                      <th className="py-3.5 px-4">Emissão / Vcto</th>
                      <th className="py-3.5 px-4">Valor</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{formatDate(inv.issue_date)} / {formatDate(inv.due_date)}</td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">{formatCurrency(inv.amount)}</td>
                        <td className="py-4 px-4 font-bold text-emerald-600">{inv.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: PLANEJAMENTO (ETP & TR) */}
        {/* ======================================================== */}
        {activeTab === 'etp_tr' && (
          <div className="space-y-8 animate-fade-in">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl">
              <div className="flex items-center space-x-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Módulo Técnico de Planejamento de Contratações</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Gerador de ETP e TR (Estudo Técnico Preliminar e Termo de Referência)
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-3xl leading-relaxed">
                Elaboração de artefatos de planejamento técnico e operacional. A redação adota tom puramente administrativo e assertivo, sem citações normativas.
              </p>
            </div>

            {/* Selector and Document Parameters */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setEtpMode('ETP')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      etpMode === 'ETP'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Estudo Técnico Preliminar (ETP - 14 Tópicos)
                  </button>
                  <button
                    onClick={() => setEtpMode('TR')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      etpMode === 'TR'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Termo de Referência (TR - 10 Tópicos)
                  </button>
                </div>

                <button
                  onClick={generateCompiledDocument}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center"
                >
                  Compilar Documento <Download className="w-4 h-4 ml-2" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                  Título do Objeto da Contratação
                </label>
                <input
                  type="text"
                  placeholder="Digite o objeto da contratação (ex: Contratação de serviços de tecnologia...)"
                  value={etpTitle}
                  onChange={e => setEtpTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Editable Tópicos */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                  <FileText className="w-4 h-4 text-blue-500 mr-2" />
                  Estrutura Técnica dos Tópicos Padronizados
                </h3>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(etpMode === 'ETP' ? etpSections : trSections).map((sec, idx) => (
                    <div key={sec.key} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300">
                        {sec.title}
                      </label>
                      <textarea
                        rows={3}
                        placeholder={`Digite a redação do tópico ${sec.title}...`}
                        value={sec.content}
                        onChange={e => {
                          const newContent = e.target.value;
                          if (etpMode === 'ETP') {
                            setEtpSections(prev => prev.map((s, i) => i === idx ? { ...s, content: newContent } : s));
                          } else {
                            setTrSections(prev => prev.map((s, i) => i === idx ? { ...s, content: newContent } : s));
                          }
                        }}
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Document Modal / Output */}
            {generatedDoc && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Documento Compilado com Sucesso!</span>
                  </div>
                  <button
                    onClick={() => setGeneratedDoc(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <pre className="p-6 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-slate-800 max-h-96">
                  {generatedDoc}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: COFRE DE SENHAS GERAL */}
        {/* ======================================================== */}
        {activeTab === 'vault' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    Cofre Geral de Senhas e Credenciais
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Repositório unificado de acessos a portais, chaves de API, licenças SaaS e contas de serviços vinculadas aos seus contratos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Total no Cofre</span>
                  <span className="text-2xl font-extrabold text-blue-400">{allCredentials.length} segredos</span>
                </div>
                <button
                  onClick={() => {
                    setGlobalCredentialForm(prev => ({
                      ...prev,
                      contract_id: 'PERSONAL'
                    }));
                    setShowGlobalCredentialModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" /> Adicionar Credencial
                </button>
              </div>
            </div>

            {/* VAULT SEARCH & CATEGORY FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar credencial, usuário ou contrato..."
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: 'Todas' },
                  { id: 'PERSONAL', label: '🔐 Pessoais' },
                  { id: 'PORTAL_LOGIN', label: '🌐 Portais Web' },
                  { id: 'API_KEY', label: '🔑 Chaves API' },
                  { id: 'SOFTWARE_LICENSE', label: '📜 Licenças' },
                  { id: 'SERVICE_ACCOUNT', label: '🖥️ Contas Serviço' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setVaultFilterType(filter.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                      vaultFilterType === filter.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const filteredVault = allCredentials.filter((cred) => {
                const matchesType = 
                  vaultFilterType === 'ALL' ||
                  (vaultFilterType === 'PERSONAL' && !cred.contractId) ||
                  cred.type === vaultFilterType;
                
                const matchesSearch = 
                  cred.title.toLowerCase().includes(vaultSearch.toLowerCase()) ||
                  (cred.username && cred.username.toLowerCase().includes(vaultSearch.toLowerCase())) ||
                  (cred.contractTitle && cred.contractTitle.toLowerCase().includes(vaultSearch.toLowerCase()));

                return matchesType && matchesSearch;
              });

              const vaultTotalPages = Math.max(1, Math.ceil(filteredVault.length / VAULT_PAGE_SIZE));
              const vaultSafePage = Math.min(vaultPage, vaultTotalPages);
              const pagedVault = filteredVault.slice(
                (vaultSafePage - 1) * VAULT_PAGE_SIZE,
                vaultSafePage * VAULT_PAGE_SIZE
              );

              return filteredVault.length > 0 ? (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pagedVault.map((cred: any) => {
                  const isSecretVisible = visibleSecrets[cred.id];
                  const isCopied = copiedId === cred.id;

                  const typeLabels: Record<string, { label: string; color: string }> = {
                    PORTAL_LOGIN: { label: 'Portal Web', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                    API_KEY: { label: 'Chave API', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                    SOFTWARE_LICENSE: { label: 'Licença Software', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                    SERVICE_ACCOUNT: { label: 'Conta de Serviço', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                    PERSONAL_ACCOUNT: { label: 'Email / Pessoal', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                    OTHER: { label: 'Outro', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
                  };

                  const typeInfo = typeLabels[cred.type] || typeLabels.OTHER;

                  return (
                    <div key={cred.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {cred.contractId ? (
                              <button
                                onClick={() => router.push(`/contracts/${cred.contractId}`)}
                                className="text-xs text-blue-500 hover:underline font-semibold flex items-center gap-1"
                              >
                                Ver Contrato <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                Senha Pessoal
                              </span>
                            )}
                            <button
                              onClick={async () => {
                                if (await confirmDialog('Tem certeza que deseja excluir esta credencial do cofre?', { tone: 'danger', confirmLabel: 'Excluir' })) {
                                  try {
                                    await deleteContractCredential(cred.id);
                                    setStandaloneCredentials(prev => prev.filter(c => c.id !== cred.id));
                                    setContracts(prev => prev.map(c => ({
                                      ...c,
                                      credentials: (c.credentials || []).filter((cr: any) => cr.id !== cred.id)
                                    })));
                                    router.refresh();
                                  } catch (err: any) {
                                    toast.error(err.message || 'Erro ao excluir credencial.');
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-950/20 rounded transition-colors"
                              title="Excluir Credencial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{cred.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Origem: <span className="font-semibold text-slate-700 dark:text-slate-300">{cred.contractTitle}</span>
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {cred.username && (
                          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Usuário:</span>
                            <div className="flex items-center gap-2 font-mono text-slate-800 dark:text-slate-200">
                              <span className="truncate max-w-[140px]">{cred.username}</span>
                              <button
                                onClick={() => handleCopySecret(`user-${cred.id}`, cred.username)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                title="Copiar Usuário"
                              >
                                {copiedId === `user-${cred.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-blue-500/20 text-white">
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" /> Senha / Segredo:
                          </span>
                          <div className="flex items-center gap-2 font-mono font-bold">
                            <span className="tracking-widest">
                              {isSecretVisible ? revealedSecrets[cred.id] : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleSecretVisibility(cred.id)}
                              disabled={revealingId === cred.id}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
                              title={isSecretVisible ? 'Ocultar' : 'Revelar'}
                            >
                              {revealingId === cred.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              ) : isSecretVisible ? (
                                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyCredentialSecret(cred.id)}
                              disabled={revealingId === cred.id}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
                              title="Copiar Segredo"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {cred.login_url && (
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-500 dark:text-slate-400">Portal:</span>
                            <a
                              href={cred.login_url.startsWith('http') ? cred.login_url : `https://${cred.login_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline flex items-center gap-1 font-medium truncate max-w-[180px]"
                            >
                              {cred.login_url} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
                <Pagination
                  page={vaultSafePage}
                  pageSize={VAULT_PAGE_SIZE}
                  totalItems={filteredVault.length}
                  onPageChange={setVaultPage}
                />
                </>
            ) : (
              <EmptyState
                icon={Lock}
                title="Nenhuma credencial encontrada"
                description={
                  vaultSearch || vaultFilterType !== 'ALL'
                    ? 'Nenhum resultado encontrado para os filtros selecionados. Tente alterar a busca.'
                    : 'Ainda não há credenciais cadastradas nos seus contratos. Clique no botão acima para registrar logins e chaves de API.'
                }
              />
            );
          })()}
          </div>
        )}
      </div>

      {/* Add Contract Modal */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cadastrar Novo Contrato</h3>
              <button onClick={() => setShowAddContractModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddContract} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Título do Contrato *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contrato de Prestação de Serviços de TI"
                  value={newContractTitle}
                  onChange={e => setNewContractTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Natureza *</label>
                  <select
                    value={newContractNature}
                    onChange={e => setNewContractNature(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="EXPENSE">Despesa (Fornecedor)</option>
                    <option value="REVENUE">Receita (Cliente)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
                  <select
                    value={newContractType}
                    onChange={e => setNewContractType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SOW">SOW</option>
                    <option value="MSA">MSA</option>
                    <option value="SLA">SLA</option>
                    <option value="SAAS">SaaS</option>
                    <option value="NDA">NDA</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraparte / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nome do Fornecedor Ltda"
                  value={newContractCounterpart}
                  onChange={e => setNewContractCounterpart(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Início *</label>
                  <input
                    type="date"
                    required
                    value={newContractStart}
                    onChange={e => setNewContractStart(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fim (Vencimento) *</label>
                  <input
                    type="date"
                    required
                    value={newContractEnd}
                    onChange={e => setNewContractEnd(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
                >
                  Salvar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold text-xs">
                  {selectedContract.type}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                  {selectedContract.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block mb-1">Contraparte</span>
                <strong className="text-slate-900 dark:text-white text-sm">{selectedContract.counterpart}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block mb-1">Valor Global</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {formatCurrency(selectedContract.total_value)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block mb-1">Início da Vigência</span>
                <strong className="text-slate-900 dark:text-white">{formatDate(selectedContract.start_date)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block mb-1">Fim da Vigência</span>
                <strong className="text-slate-900 dark:text-white">{formatDate(selectedContract.end_date)}</strong>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => router.push(`/contracts/${selectedContract.id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-500 transition-colors flex items-center gap-1.5"
              >
                Abrir Painel Completo <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setEditingContract(c);
                    setEditContractForm({
                      title: c.title || '',
                      type: c.type || 'SOW',
                      nature: c.nature || 'EXPENSE',
                      counterpart: c.counterpart || '',
                      status: c.status || 'DRAFT',
                      start_date: c.start_date ? new Date(c.start_date).toISOString().split('T')[0] : '',
                      end_date: c.end_date ? new Date(c.end_date).toISOString().split('T')[0] : '',
                      auto_renewal: c.auto_renewal || false,
                      notice_period_days: c.notice_period_days || 30,
                      total_value: c.total_value || '',
                      raw_text_or_url: c.raw_text_or_url || '',
                    });
                  }}
                  className="px-3 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-xl font-bold text-xs hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => {
                    const c = selectedContract;
                    setSelectedContract(null);
                    setDeleteConfirmText('');
                    setDeletingContract(c);
                  }}
                  className="px-3 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-xl font-bold text-xs hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Editar Contrato</h3>
              <button onClick={() => setEditingContract(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const updated = await updateContract(editingContract.id, {
                  title: editContractForm.title,
                  type: editContractForm.type as any,
                  nature: editContractForm.nature as any,
                  counterpart: editContractForm.counterpart,
                  status: editContractForm.status as any,
                  start_date: editContractForm.start_date,
                  end_date: editContractForm.end_date,
                  auto_renewal: editContractForm.auto_renewal,
                  notice_period_days: Number(editContractForm.notice_period_days),
                  total_value: parseNumber(editContractForm.total_value),
                  raw_text_or_url: editContractForm.raw_text_or_url || null,
                });
                if (updated) {
                  setContracts((prev) => prev.map(c => c.id === updated.id ? updated : c));
                }
                setEditingContract(null);
                router.refresh();
              } catch (err: any) {
                toast.error(err.message || 'Erro ao atualizar contrato.');
              }
            }} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Título do Contrato *</label>
                <input
                  type="text" required
                  value={editContractForm.title}
                  onChange={e => setEditContractForm({ ...editContractForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
                  <select
                    value={editContractForm.type}
                    onChange={e => setEditContractForm({ ...editContractForm, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SOW">SOW</option>
                    <option value="MSA">MSA</option>
                    <option value="SLA">SLA</option>
                    <option value="SAAS">SaaS</option>
                    <option value="NDA">NDA</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$) *</label>
                  <input
                    type="text" inputMode="decimal" required
                    value={editContractForm.total_value}
                    onChange={e => setEditContractForm({ ...editContractForm, total_value: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraparte *</label>
                <input
                  type="text" required
                  value={editContractForm.counterpart}
                  onChange={e => setEditContractForm({ ...editContractForm, counterpart: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Início *</label>
                  <input
                    type="date" required
                    value={editContractForm.start_date}
                    onChange={e => setEditContractForm({ ...editContractForm, start_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fim (Vencimento) *</label>
                  <input
                    type="date" required
                    value={editContractForm.end_date}
                    onChange={e => setEditContractForm({ ...editContractForm, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingContract(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-500 transition-colors"
                >
                  Atualizar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contract Confirmation Modal */}
      {deletingContract && (() => {
        const relatedCounts = [
          { label: 'marco(s)', count: deletingContract.milestones?.length || 0 },
          { label: 'aditivo(s) / mudança(s) de escopo', count: deletingContract.change_requests?.length || 0 },
          { label: 'risco(s) registrado(s)', count: deletingContract.risks?.length || 0 },
          { label: 'fatura(s)', count: deletingContract.invoices?.length || 0 },
          { label: 'credencial(is) no cofre', count: deletingContract.credentials?.length || 0 },
        ].filter((item) => item.count > 0);
        const isConfirmed = deleteConfirmText.trim() === deletingContract.title;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3 text-rose-500">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Excluir Contrato?</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza que deseja excluir o contrato <strong className="text-slate-900 dark:text-white">{deletingContract.title}</strong>? Esta ação removerá o contrato do banco de dados.
              </p>
              {relatedCounts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                    Isto também vai apagar permanentemente:
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-gray-300 space-y-0.5 list-disc list-inside">
                    {relatedCounts.map((item) => (
                      <li key={item.label}>{item.count} {item.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 dark:text-gray-400">
                  Para confirmar, digite o nome do contrato: <strong className="text-slate-900 dark:text-white">{deletingContract.title}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-500/30 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
                  placeholder={deletingContract.title}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingContract(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!isConfirmed) return;
                    try {
                      await deleteContract(deletingContract.id);
                      setContracts((prev) => prev.filter(c => c.id !== deletingContract.id));
                      setDeletingContract(null);
                      router.refresh();
                    } catch (err: any) {
                      toast.error(err.message || 'Erro ao excluir contrato.');
                    }
                  }}
                  disabled={!isConfirmed}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-600 transition-colors"
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Global Credential Creation Modal */}
      {showGlobalCredentialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-500" /> Adicionar Credencial ao Cofre
              </h3>
              <button onClick={() => setShowGlobalCredentialModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddGlobalCredential} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Origem da Credencial / Contrato *</label>
                <select
                  value={globalCredentialForm.contract_id}
                  onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, contract_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="PERSONAL">🔐 Senha Pessoal / Credencial Geral (Email, Login Pessoal, etc.)</option>
                  {contracts.length > 0 && (
                    <optgroup label="Vincular a um Contrato">
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.counterpart})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Credencial *</label>
                  <select
                    value={globalCredentialForm.type}
                    onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="PERSONAL_ACCOUNT">Email / Conta Pessoal</option>
                    <option value="PORTAL_LOGIN">Portal Web / Painel</option>
                    <option value="API_KEY">Chave de API / Token</option>
                    <option value="SOFTWARE_LICENSE">Licença de Software</option>
                    <option value="SERVICE_ACCOUNT">Conta de Serviço</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Título / Nome *</label>
                  <input
                    type="text" required placeholder="Ex: Login Admin Portal AWS"
                    value={globalCredentialForm.title}
                    onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuário / ID</label>
                  <input
                    type="text" placeholder="Ex: admin@empresa.com"
                    value={globalCredentialForm.username}
                    onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, username: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Senha / Segredo *</label>
                  <PasswordInputWithGenerator
                    value={globalCredentialForm.secret_value}
                    onChange={(val) => setGlobalCredentialForm({ ...globalCredentialForm, secret_value: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">URL do Portal de Login</label>
                <input
                  type="text" placeholder="Ex: https://console.aws.amazon.com"
                  value={globalCredentialForm.login_url}
                  onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, login_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações / Notas</label>
                <textarea
                  placeholder="Ex: Credencial do gestor principal."
                  value={globalCredentialForm.notes}
                  onChange={e => setGlobalCredentialForm({ ...globalCredentialForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGlobalCredentialModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
                >
                  Guardar no Cofre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
