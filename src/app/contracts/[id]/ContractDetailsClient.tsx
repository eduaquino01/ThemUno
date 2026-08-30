'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  createMilestone, 
  updateMilestoneAcceptance, 
  createChangeRequest, 
  createContractRisk, 
  createInvoice,
  updateContract,
  deleteContract,
  createContractCredential,
  deleteContractCredential,
  getCredentialSecret
} from '@/app/actions';
import { formatCurrency, parseNumber, formatDate } from '@/lib/formatters';
import PasswordInputWithGenerator from '@/components/PasswordInputWithGenerator';
import { useToast } from '@/components/ui/ToastProvider';
import { useConfirm } from '@/components/ui/ConfirmProvider';
export type ContractType = 'MSA' | 'SOW' | 'SLA' | 'NDA' | 'SAAS' | 'HARDWARE' | 'PARTNERSHIP' | 'AMENDMENT';
export type ContractStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type AcceptanceStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type ChangeRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type RiskCategory = 'LGPD' | 'FINANCIAL' | 'OPERATIONAL' | 'IP' | 'COMPLIANCE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InvoiceStatus = 'PENDING_ACCEPTANCE' | 'ISSUED' | 'PAID' | 'DISPUTED';

const RiskCategory = {
  LGPD: 'LGPD',
  FINANCIAL: 'FINANCIAL',
  OPERATIONAL: 'OPERATIONAL',
  IP: 'IP',
  COMPLIANCE: 'COMPLIANCE',
};

const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  CreditCard, 
  ShieldAlert, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileCheck,
  Percent,
  Download,
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Loader2,
  Key,
  Lock,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ContractDetailsClientProps {
  contract: any;
}

export default function ContractDetailsClient({ contract }: ContractDetailsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'changes' | 'risks' | 'invoices' | 'credentials'>('overview');

  // Modal display toggles
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [showDeleteContractModal, setShowDeleteContractModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showCredentialModal, setShowCredentialModal] = useState(false);

  // Credential state & visibility
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Segredos revelados sob demanda (nunca chegam do carregamento inicial da página)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [credentialForm, setCredentialForm] = useState({
    type: 'PORTAL_LOGIN' as 'PORTAL_LOGIN' | 'API_KEY' | 'SOFTWARE_LICENSE' | 'SERVICE_ACCOUNT' | 'OTHER',
    title: '',
    username: '',
    secret_value: '',
    login_url: '',
    notes: '',
  });

  // Edit Contract Form State
  const [editContractForm, setEditContractForm] = useState({
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

  // Errors & Forms
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Milestone Form State
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    scope_description: '',
    due_date: '',
    acceptance_criteria: '',
    billing_value: '' as string | number,
  });

  // 2. Change Request Form State
  const [changeForm, setChangeForm] = useState({
    title: '',
    requested_by: '',
    scope_impact: '',
    financial_impact: '' as string | number,
    time_impact_days: 0,
  });

  // 3. Risk Form State
  const [riskForm, setRiskForm] = useState({
    category: 'LGPD' as RiskCategory,
    risk_level: 'MEDIUM' as RiskLevel,
    description: '',
    mitigation_plan: '',
  });

  // 4. Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    milestone_id: '',
    invoice_number: '',
    issue_date: '',
    due_date: '',
    amount: '' as string | number,
  });

  // Submits
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    startTransition(async () => {
      try {
        await createMilestone({
          contract_id: contract.id,
          ...milestoneForm,
          billing_value: parseNumber(milestoneForm.billing_value),
        });
        setShowMilestoneModal(false);
        setMilestoneForm({ title: '', scope_description: '', due_date: '', acceptance_criteria: '', billing_value: '' });
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao criar marco.');
      }
    });
  };

  const handleToggleAcceptance = async (milestoneId: string, status: AcceptanceStatus) => {
    startTransition(async () => {
      try {
        await updateMilestoneAcceptance(milestoneId, status);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao alterar aceite.');
      }
    });
  };

  const handleAddChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    startTransition(async () => {
      try {
        await createChangeRequest({
          contract_id: contract.id,
          ...changeForm,
          financial_impact: parseNumber(changeForm.financial_impact),
          time_impact_days: Number(changeForm.time_impact_days),
          status: 'DRAFT',
        });
        setShowChangeModal(false);
        setChangeForm({ title: '', requested_by: '', scope_impact: '', financial_impact: '', time_impact_days: 0 });
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao criar solicitação.');
      }
    });
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    startTransition(async () => {
      try {
        await createContractRisk({
          contract_id: contract.id,
          ...riskForm,
          status: 'IDENTIFIED',
        });
        setShowRiskModal(false);
        setRiskForm({ category: 'LGPD', risk_level: 'MEDIUM', description: '', mitigation_plan: '' });
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao registrar risco.');
      }
    });
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Check validation rule before sending to server (Double lock)
    if (invoiceForm.milestone_id) {
      const selectedM = contract.milestones.find((m: any) => m.id === invoiceForm.milestone_id);
      if (selectedM && selectedM.acceptance_status !== 'ACCEPTED') {
        setErrorMsg('BLOQUEIO OPERACIONAL: O faturamento só é permitido para marcos com status "ACCEPTED".');
        return;
      }
    }

    startTransition(async () => {
      try {
        await createInvoice({
          contract_id: contract.id,
          milestone_id: invoiceForm.milestone_id || null,
          invoice_number: invoiceForm.invoice_number,
          issue_date: invoiceForm.issue_date,
          due_date: invoiceForm.due_date,
          amount: parseNumber(invoiceForm.amount),
          status: 'PENDING_ACCEPTANCE',
        });
        setShowInvoiceModal(false);
        setInvoiceForm({ milestone_id: '', invoice_number: '', issue_date: '', due_date: '', amount: '' });
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao registrar fatura.');
      }
    });
  };

  // Helper check for selected milestone billing eligibility
  const selectedMilestoneForInvoice = contract.milestones?.find((m: any) => m.id === invoiceForm.milestone_id);
  const isInvoiceBlocked = selectedMilestoneForInvoice && selectedMilestoneForInvoice.acceptance_status !== 'ACCEPTED';

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
      // Security auto-hide after 30 seconds
      setTimeout(() => {
        setVisibleSecrets((prev) => ({ ...prev, [id]: false }));
        setRevealedSecrets((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 30000);
    }
  };

  const handleCopyCredentialSecret = async (id: string) => {
    const secret = await revealCredential(id);
    if (secret !== null) {
      handleCopySecret(id, secret);
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialForm.title || !credentialForm.secret_value) return;

    startTransition(async () => {
      try {
        const created = await createContractCredential({
          contract_id: contract.id,
          type: credentialForm.type,
          title: credentialForm.title,
          username: credentialForm.username || null,
          secret_value: credentialForm.secret_value,
          login_url: credentialForm.login_url || null,
          notes: credentialForm.notes || null,
        });
        // O usuário acabou de digitar esse segredo neste formulário — não há
        // problema em já deixá-lo disponível localmente para "revelar" sem
        // precisar buscar de novo no servidor.
        if (created) {
          setRevealedSecrets(prev => ({ ...prev, [created.id]: credentialForm.secret_value }));
        }
        setShowCredentialModal(false);
        setCredentialForm({
          type: 'PORTAL_LOGIN',
          title: '',
          username: '',
          secret_value: '',
          login_url: '',
          notes: '',
        });
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao guardar credencial.');
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BACK BUTTON & HEADER INFO */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/contracts"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Repositório
        </Link>

        {/* HERO CARD DE CONTRATO */}
        <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden space-y-6">
          {/* Ambient Lighting Background */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-30 ${
            contract.nature === 'REVENUE' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{contract.title}</h1>
                <span className={`text-[10px] px-3 py-1 rounded-lg font-extrabold uppercase tracking-wider border ${
                  contract.nature === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm'
                }`}>
                  {contract.nature === 'REVENUE' ? 'Receita' : 'Despesa'}
                </span>
                <span className={`text-[10px] px-3 py-1 rounded-lg font-extrabold uppercase tracking-wider border ${
                  contract.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {contract.status}
                </span>
              </div>
              <p className="text-gray-300 text-xs font-medium">
                Contraparte: <span className="text-white font-bold">{contract.counterpart}</span> | Tipo de Contrato: <span className="text-blue-400 font-bold">{contract.type}</span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">Valor Total Contratado</p>
                <p className="text-3xl font-black text-blue-400 tracking-tight mt-0.5">{formatCurrency(contract.total_value)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditContractModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar Contrato
                </button>
                <button
                  onClick={() => { setDeleteConfirmText(''); setShowDeleteContractModal(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          </div>

          {/* QUICK STAT SUMMARY PILLS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 relative z-10">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Vigência</span>
              <span className="text-xs text-slate-200 font-semibold mt-0.5 block truncate">
                {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cofre de Senhas</span>
              <span className="text-xs text-blue-400 font-bold mt-0.5 block">
                {contract.credentials?.length || 0} credenciais ativas
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Marcos Aceitos</span>
              <span className="text-xs text-emerald-400 font-bold mt-0.5 block">
                {contract.milestones?.filter((m: any) => m.acceptance_status === 'ACCEPTED').length || 0} de {contract.milestones?.length || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faturamento Liquidado</span>
              <span className="text-xs text-purple-400 font-bold mt-0.5 block">
                {formatCurrency(contract.invoices?.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + (i.amount || 0), 0) || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-[#1e293b] gap-2 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview & Minuta', icon: FileText },
          { id: 'milestones', label: `Marcos (${contract.milestones?.length || 0})`, icon: Calendar },
          { id: 'changes', label: `Aditivos & CRs (${contract.change_requests?.length || 0})`, icon: Clock },
          { id: 'risks', label: `Matriz de Riscos (${contract.risks?.length || 0})`, icon: ShieldAlert },
          { id: 'invoices', label: `Faturamento (${contract.invoices?.length || 0})`, icon: CreditCard },
          { id: 'credentials', label: `Cofre de Senhas (${contract.credentials?.length || 0})`, icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="min-h-[300px]">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 rounded-xl space-y-6">
              <h3 className="font-bold text-base text-white border-b border-[#1e293b] pb-2">Especificações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Vigência Inicial</span>
                  <p className="text-sm font-medium mt-1 text-white">{formatDate(contract.start_date)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Término Previsto</span>
                  <p className="text-sm font-medium mt-1 text-white">{formatDate(contract.end_date)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Prazo de Aviso (Renovação)</span>
                  <p className="text-sm font-medium mt-1 text-white">{contract.notice_period_days} Dias</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Renovação Automática</span>
                  <p className="text-sm font-medium mt-1 text-white">{contract.auto_renewal ? 'Habilitada' : 'Desabilitada'}</p>
                </div>
              </div>

              {contract.raw_text_or_url && (
                <div className="pt-4 border-t border-[#1e293b] space-y-2">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Link do Documento / Minuta</span>
                  <div className="flex items-center gap-2">
                    <a 
                      href={contract.raw_text_or_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Abrir Documento Digital
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-xl space-y-4">
              <h3 className="font-bold text-base text-white border-b border-[#1e293b] pb-2">Resumo Operacional</h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1e293b]/50">
                  <span className="text-gray-400">Total Marcos</span>
                  <span className="font-semibold text-white">{contract.milestones?.length || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e293b]/50">
                  <span className="text-gray-400">Faturamento Validado</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(contract.invoices?.filter((i: any) => i.status === 'PAID' || i.status === 'ISSUED').reduce((s: number, i: any) => s + i.amount, 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e293b]/50">
                  <span className="text-gray-400">Mudanças Aprovadas</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(contract.change_requests?.filter((cr: any) => cr.status === 'APPROVED').reduce((s: number, cr: any) => s + cr.financial_impact, 0) || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Status dos Riscos</span>
                  <span className="font-semibold text-amber-500">
                    {contract.risks?.filter((r: any) => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH').length || 0} Alertas
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MILESTONES TAB */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Cronograma de Marcos (Milestones)</h3>
                <p className="text-gray-400 text-xs mt-0.5">Marcos vinculados ao SOW para liberação de parcelas.</p>
              </div>
              <button 
                onClick={() => setShowMilestoneModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo Marco
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {contract.milestones && contract.milestones.length > 0 ? (
                contract.milestones.map((m: any) => (
                  <div key={m.id} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row justify-between gap-6 border-l-4 border-l-blue-500">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-base text-white">{m.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${
                          m.acceptance_status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          m.acceptance_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {m.acceptance_status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">{m.scope_description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 text-gray-400">
                        <div>
                          <span className="font-semibold text-gray-300">Critério de Aceite:</span> {m.acceptance_criteria}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-300">Data Limite:</span> {formatDate(m.due_date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end gap-4 shrink-0 text-right">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">Valor do Marco</span>
                        <p className="text-lg font-bold text-white">{formatCurrency(m.billing_value)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {m.acceptance_status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => handleToggleAcceptance(m.id, 'REJECTED')}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-500/30 bg-red-950/15 hover:bg-red-950/30 text-red-400 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Rejeitar
                            </button>
                            <button 
                              onClick={() => handleToggleAcceptance(m.id, 'ACCEPTED')}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar Marco
                            </button>
                          </>
                        )}
                        {m.acceptance_status === 'ACCEPTED' && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <FileCheck className="w-4 h-4" /> Aceite Formal Registrado
                          </span>
                        )}
                        {m.acceptance_status === 'REJECTED' && (
                          <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Entrega Glosada/Rejeitada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 text-gray-500 border border-dashed border-[#1e293b] rounded-xl">
                  Nenhum marco de faturamento cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. CHANGE REQUESTS TAB */}
        {activeTab === 'changes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Requisições de Mudança (Scope Control)</h3>
                <p className="text-gray-400 text-xs mt-0.5">Prevenção de scope creep e repactuação de metas.</p>
              </div>
              <button 
                onClick={() => setShowChangeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Solicitar Alteração
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {contract.change_requests && contract.change_requests.length > 0 ? (
                contract.change_requests.map((cr: any) => (
                  <div key={cr.id} className="glass-panel p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-sm text-white">{cr.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                          cr.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          cr.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {cr.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs">{cr.scope_impact}</p>
                      <div className="text-[11px] text-gray-400">
                        Solicitado por: <span className="text-gray-200">{cr.requested_by}</span> | Prazo Adicional: <span className="text-gray-200">+{cr.time_impact_days} dias</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Impacto Orçamentário</span>
                      <p className="text-base font-bold text-white">{formatCurrency(cr.financial_impact)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 text-gray-500 border border-dashed border-[#1e293b] rounded-xl">
                  Nenhuma solicitação de alteração vinculada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. RISKS TAB */}
        {activeTab === 'risks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Controle de Riscos Contratuais</h3>
                <p className="text-gray-400 text-xs mt-0.5">Categorias de riscos e logs de conformidade.</p>
              </div>
              <button 
                onClick={() => setShowRiskModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Registrar Risco
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Risks List */}
              <div className="space-y-4">
                {contract.risks && contract.risks.length > 0 ? (
                  contract.risks.map((r: any) => (
                    <div key={r.id} className="glass-panel p-5 rounded-xl border-l-4 border-l-red-500 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-red-400 uppercase tracking-wider">{r.category}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold border ${
                          r.risk_level === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          r.risk_level === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {r.risk_level}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{r.description}</p>
                      <p className="text-xs text-gray-300 bg-black/10 p-2 rounded">
                        <span className="font-semibold text-gray-400 block mb-1">Ação de Mitigação:</span>
                        {r.mitigation_plan}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-12 text-gray-500 border border-dashed border-[#1e293b] rounded-xl">
                    Nenhum risco mapeado para este contrato.
                  </div>
                )}
              </div>

              {/* 2D RISK MATRIX MAPPING */}
              <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center">
                <h4 className="font-bold text-sm text-white mb-4 text-center">Matriz de Severidade Operacional</h4>
                <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
                  {/* Row Critical */}
                  <div className="bg-red-950/30 border border-red-500/30 text-red-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    CRÍTICO
                  </div>
                  <div className="bg-amber-950/20 border border-amber-500/20 text-amber-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    ALTO
                  </div>
                  <div className="bg-blue-950/20 border border-blue-500/20 text-blue-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    MÉDIO
                  </div>
                  {/* Row High */}
                  <div className="bg-amber-950/20 border border-amber-500/20 text-amber-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    ALTO
                  </div>
                  <div className="bg-blue-950/20 border border-blue-500/20 text-blue-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    MÉDIO
                  </div>
                  <div className="bg-slate-900 border border-[#1e293b] text-gray-400 h-16 rounded flex items-center justify-center text-xs font-bold">
                    BAIXO
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 mt-4 text-center">
                  Mapeamento integrado de conformidade operacional.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Histórico de Faturamento & NFs</h3>
                <p className="text-gray-400 text-xs mt-0.5">Conciliação financeira de parcelas liquidadas.</p>
              </div>
              <button 
                onClick={() => setShowInvoiceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
              >
                <Plus className="w-4 h-4" /> Emitir Medição/NF
              </button>
            </div>

            <div className="bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold text-gray-400 uppercase">
                    <th className="px-6 py-4">Fatura Nº</th>
                    <th className="px-6 py-4">Data Emissão</th>
                    <th className="px-6 py-4">Vencimento</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/50">
                  {contract.invoices && contract.invoices.length > 0 ? (
                    contract.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{inv.invoice_number}</td>
                        <td className="px-6 py-4 text-gray-300">{formatDate(inv.issue_date)}</td>
                        <td className="px-6 py-4 text-gray-300">{formatDate(inv.due_date)}</td>
                        <td className="px-6 py-4 font-bold text-white">{formatCurrency(inv.amount)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                            inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            inv.status === 'ISSUED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            inv.status === 'DISPUTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.payment_proof_url ? (
                            <a 
                              href={inv.payment_proof_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline font-semibold"
                            >
                              Ver Comprovante
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500 italic">Pendente</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma nota fiscal ou medição registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: COFRE DE SENHAS & CREDENCIAIS */}
        {/* ======================================================== */}
        {activeTab === 'credentials' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-5 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Cofre de Acessos, Senhas & Segredos do Contrato
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Guarde com segurança credenciais de portais, chaves de API, seriais de licença e contas de serviço vinculadas a este contrato.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCredentialModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg transition-all shrink-0"
              >
                <Plus className="w-4 h-4" /> Adicionar Credencial
              </button>
            </div>

            {contract.credentials && contract.credentials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contract.credentials.map((cred: any) => {
                  const isSecretVisible = visibleSecrets[cred.id];
                  const isCopied = copiedId === cred.id;

                  const typeLabels: Record<string, { label: string; color: string }> = {
                    PORTAL_LOGIN: { label: 'Portal Web', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                    API_KEY: { label: 'Chave API', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                    SOFTWARE_LICENSE: { label: 'Licença Software', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                    SERVICE_ACCOUNT: { label: 'Conta de Serviço', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                    OTHER: { label: 'Outro', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
                  };

                  const typeInfo = typeLabels[cred.type] || typeLabels.OTHER;

                  return (
                    <div 
                      key={cred.id} 
                      className="bg-[#0d1527] border border-[#1e293b] rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-sm relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-base leading-snug">{cred.title}</h4>
                        </div>
                        <button
                          onClick={async () => {
                            if (await confirmDialog('Tem certeza que deseja excluir esta credencial do cofre?', { tone: 'danger', confirmLabel: 'Excluir' })) {
                              startTransition(async () => {
                                await deleteContractCredential(cred.id);
                                router.refresh();
                              });
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Excluir Credencial"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Details & Secret box */}
                      <div className="space-y-2.5 pt-2 border-t border-[#1e293b]/60">
                        {cred.username && (
                          <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-[#1e293b]">
                            <span className="text-gray-400 font-medium">Usuário / ID:</span>
                            <div className="flex items-center gap-2 font-mono text-gray-200">
                              <span>{cred.username}</span>
                              <button
                                onClick={() => handleCopySecret(`user-${cred.id}`, cred.username)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Copiar Usuário"
                              >
                                {copiedId === `user-${cred.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Password / Secret Value */}
                        <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-blue-500/20">
                          <span className="text-gray-400 font-medium flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" /> Senha / Segredo:
                          </span>
                          <div className="flex items-center gap-2 font-mono font-bold text-white">
                            <span className="tracking-widest">
                              {isSecretVisible ? revealedSecrets[cred.id] : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleSecretVisibility(cred.id)}
                              disabled={revealingId === cred.id}
                              className="p-1 text-gray-400 hover:text-white transition-colors ml-1 disabled:opacity-50"
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
                              className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                              title="Copiar Segredo"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {cred.login_url && (
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-gray-400">Portal de Acesso:</span>
                            <a 
                              href={cred.login_url.startsWith('http') ? cred.login_url : `https://${cred.login_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1 font-medium truncate max-w-[200px]"
                            >
                              {cred.login_url} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}

                        {cred.notes && (
                          <p className="text-xs text-gray-400 italic bg-slate-950/30 p-2 rounded border border-[#1e293b] mt-2">
                            "{cred.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-950/20 border border-[#1e293b] rounded-xl space-y-3">
                <Lock className="w-10 h-10 text-gray-600 mx-auto" />
                <h4 className="font-bold text-gray-300">Cofre Vazio</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Nenhuma credencial ou licença cadastrada para este contrato. Clique no botão acima para adicionar senhas ou chaves de API com segurança.
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MILESTONE CREATION MODAL */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Adicionar Marco ao Contrato</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-gray-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddMilestone} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título do Marco *</label>
                <input 
                  type="text" required placeholder="Ex: Blueprint Aprovado"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição do Escopo *</label>
                <textarea 
                  required placeholder="Ex: Detalhamento dos entregáveis..."
                  value={milestoneForm.scope_description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, scope_description: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Limite *</label>
                  <input 
                    type="date" required
                    value={milestoneForm.due_date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor do Marco (R$) *</label>
                  <input 
                    type="text" required inputMode="decimal" placeholder="Ex: 4.087,69 ou 4087.69"
                    value={milestoneForm.billing_value}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, billing_value: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Critério de Aceitação *</label>
                <input 
                  type="text" required placeholder="Ex: Assinatura do termo de aceite pelo Diretor de TI"
                  value={milestoneForm.acceptance_criteria}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, acceptance_criteria: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg">Salvar Marco</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE REQUEST CREATION MODAL */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Solicitar Alteração de Escopo</h3>
              <button onClick={() => setShowChangeModal(false)} className="text-gray-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddChangeRequest} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título da Mudança *</label>
                <input 
                  type="text" required placeholder="Ex: Criação de conector legando adicional"
                  value={changeForm.title}
                  onChange={(e) => setChangeForm({ ...changeForm, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitado por (PM/Líder) *</label>
                <input 
                  type="text" required placeholder="Ex: PM Carlos Barbosa"
                  value={changeForm.requested_by}
                  onChange={(e) => setChangeForm({ ...changeForm, requested_by: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Impacto no Escopo *</label>
                <textarea 
                  required placeholder="Ex: Descrição técnica do que muda..."
                  value={changeForm.scope_impact}
                  onChange={(e) => setChangeForm({ ...changeForm, scope_impact: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Impacto Financeiro (R$) *</label>
                  <input 
                    type="text" required inputMode="decimal" placeholder="Ex: 4.087,69 ou 4087.69"
                    value={changeForm.financial_impact}
                    onChange={(e) => setChangeForm({ ...changeForm, financial_impact: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acréscimo de Prazo (Dias) *</label>
                  <input 
                    type="number" required
                    value={changeForm.time_impact_days}
                    onChange={(e) => setChangeForm({ ...changeForm, time_impact_days: Number(e.target.value) })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowChangeModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg">Solicitar Mudança</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RISK CREATION MODAL */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Mapeamento de Vulnerabilidade / Risco</h3>
              <button onClick={() => setShowRiskModal(false)} className="text-gray-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddRisk} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoria *</label>
                  <select 
                    value={riskForm.category}
                    onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value as RiskCategory })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    {Object.keys(RiskCategory).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nível de Criticidade *</label>
                  <select 
                    value={riskForm.risk_level}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_level: e.target.value as RiskLevel })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    {Object.keys(RiskLevel).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição Detalhada do Risco *</label>
                <textarea 
                  required placeholder="Ex: Identificação de vazamento potencial de log..."
                  value={riskForm.description}
                  onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 h-20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano de Ação de Mitigação *</label>
                <textarea 
                  required placeholder="Ex: Criação de rotinas adicionais de mascaramento..."
                  value={riskForm.mitigation_plan}
                  onChange={(e) => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 h-20"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowRiskModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg">Salvar Risco</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE BILLING CREATION MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Emitir Medição de Fatura</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddInvoice} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-bold flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Link to Milestone (Constraint Verification) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vincular a Marco de SOW (Opcional)</label>
                <select 
                  value={invoiceForm.milestone_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const m = contract.milestones.find((x: any) => x.id === id);
                    setInvoiceForm({ 
                      ...invoiceForm, 
                      milestone_id: id,
                      amount: m ? m.billing_value : invoiceForm.amount 
                    });
                    setErrorMsg('');
                  }}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                >
                  <option value="">Faturamento Direto (Sem Marco Vinculado)</option>
                  {contract.milestones && contract.milestones.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title} (Val: {formatCurrency(m.billing_value)}) [{m.acceptance_status}]
                    </option>
                  ))}
                </select>

                {/* Acceptance Warning check */}
                {isInvoiceBlocked && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-medium flex gap-2 items-start mt-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">BLOQUEADO PARA FATURAMENTO:</span> O marco selecionado possui status <span className="font-bold">"{selectedMilestoneForInvoice.acceptance_status}"</span>. É necessário registrar o aceite formal do marco antes de emitir a medição.
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Número da NF/Fatura *</label>
                <input 
                  type="text" required placeholder="Ex: NF-2026-9024"
                  value={invoiceForm.invoice_number}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Emissão *</label>
                  <input 
                    type="date" required
                    value={invoiceForm.issue_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Vencimento *</label>
                  <input 
                    type="date" required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor Faturado (R$) *</label>
                <input 
                  type="text" required inputMode="decimal" placeholder="Ex: 4.087,69 ou 4087.69"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isPending || isInvoiceBlocked} 
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                >
                  Confirmar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {showEditContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Editar Detalhes do Contrato</h3>
              <button onClick={() => setShowEditContractModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  await updateContract(contract.id, {
                    title: editContractForm.title,
                    type: editContractForm.type,
                    nature: editContractForm.nature,
                    counterpart: editContractForm.counterpart,
                    status: editContractForm.status,
                    start_date: editContractForm.start_date,
                    end_date: editContractForm.end_date,
                    auto_renewal: editContractForm.auto_renewal,
                    notice_period_days: Number(editContractForm.notice_period_days),
                    total_value: parseNumber(editContractForm.total_value),
                    raw_text_or_url: editContractForm.raw_text_or_url || null,
                  });
                  setShowEditContractModal(false);
                  router.refresh();
                } catch (err: any) {
                  toast.error(err.message || 'Erro ao atualizar contrato.');
                }
              });
            }} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título do Contrato *</label>
                <input 
                  type="text" required
                  value={editContractForm.title}
                  onChange={(e) => setEditContractForm({ ...editContractForm, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraparte *</label>
                  <input 
                    type="text" required
                    value={editContractForm.counterpart}
                    onChange={(e) => setEditContractForm({ ...editContractForm, counterpart: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo *</label>
                  <select 
                    value={editContractForm.type}
                    onChange={(e) => setEditContractForm({ ...editContractForm, type: e.target.value as any })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    <option value="SOW">SOW</option>
                    <option value="MSA">MSA</option>
                    <option value="SLA">SLA</option>
                    <option value="SAAS">SaaS</option>
                    <option value="NDA">NDA</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Início *</label>
                  <input 
                    type="date" required
                    value={editContractForm.start_date}
                    onChange={(e) => setEditContractForm({ ...editContractForm, start_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Término *</label>
                  <input 
                    type="date" required
                    value={editContractForm.end_date}
                    onChange={(e) => setEditContractForm({ ...editContractForm, end_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aviso Rescisão (Dias)</label>
                  <input 
                    type="number" min={0}
                    value={editContractForm.notice_period_days}
                    onChange={(e) => setEditContractForm({ ...editContractForm, notice_period_days: Number(e.target.value) })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor Contratado (R$) *</label>
                  <input 
                    type="text" inputMode="decimal" required
                    value={editContractForm.total_value}
                    onChange={(e) => setEditContractForm({ ...editContractForm, total_value: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowEditContractModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONTRACT CONFIRMATION MODAL */}
      {showDeleteContractModal && (() => {
        const relatedCounts = [
          { label: 'marco(s)', count: contract.milestones?.length || 0 },
          { label: 'aditivo(s) / mudança(s) de escopo', count: contract.change_requests?.length || 0 },
          { label: 'risco(s) registrado(s)', count: contract.risks?.length || 0 },
          { label: 'fatura(s)', count: contract.invoices?.length || 0 },
          { label: 'credencial(is) no cofre', count: contract.credentials?.length || 0 },
        ].filter((item) => item.count > 0);
        const isConfirmed = deleteConfirmText.trim() === contract.title;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#0d1527] border border-rose-500/30 rounded-xl shadow-2xl p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-bold text-lg text-white">Excluir Contrato?</h3>
              </div>
              <p className="text-xs text-gray-300">
                Tem certeza que deseja excluir o contrato <strong className="text-white">{contract.title}</strong>? Esta ação não pode ser desfeita.
              </p>
              {relatedCounts.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                    Isto também vai apagar permanentemente:
                  </p>
                  <ul className="text-xs text-gray-300 space-y-0.5 list-disc list-inside">
                    {relatedCounts.map((item) => (
                      <li key={item.label}>{item.count} {item.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">
                  Para confirmar, digite o nome do contrato: <strong className="text-white">{contract.title}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-rose-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500"
                  placeholder={contract.title}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowDeleteContractModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isConfirmed) return;
                    startTransition(async () => {
                      try {
                        await deleteContract(contract.id);
                        router.push('/contracts');
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao excluir contrato.');
                      }
                    });
                  }}
                  disabled={isPending || !isConfirmed}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-600 rounded-lg"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Excluir Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* CREDENTIAL CREATION MODAL */}
      {showCredentialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" /> Adicionar Credencial ao Cofre
              </h3>
              <button onClick={() => setShowCredentialModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCredential} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo de Credencial *</label>
                  <select 
                    value={credentialForm.type}
                    onChange={(e) => setCredentialForm({ ...credentialForm, type: e.target.value as any })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-semibold"
                  >
                    <option value="PORTAL_LOGIN">Portal Web / Painel</option>
                    <option value="API_KEY">Chave de API / Token</option>
                    <option value="SOFTWARE_LICENSE">Licença de Software</option>
                    <option value="SERVICE_ACCOUNT">Conta de Serviço</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título / Nome *</label>
                  <input 
                    type="text" required placeholder="Ex: Login Admin Portal AWS"
                    value={credentialForm.title}
                    onChange={(e) => setCredentialForm({ ...credentialForm, title: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuário / Email / ID</label>
                  <input 
                    type="text" placeholder="Ex: admin@empresa.com"
                    value={credentialForm.username}
                    onChange={(e) => setCredentialForm({ ...credentialForm, username: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Senha / Segredo *</label>
                  <PasswordInputWithGenerator
                    value={credentialForm.secret_value}
                    onChange={(val) => setCredentialForm({ ...credentialForm, secret_value: val })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">URL do Portal de Login</label>
                <input 
                  type="text" placeholder="Ex: https://console.aws.amazon.com"
                  value={credentialForm.login_url}
                  onChange={(e) => setCredentialForm({ ...credentialForm, login_url: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Observações / Notas Internas</label>
                <textarea 
                  placeholder="Ex: Renovação anual exigida, MFA ativo no telefone do gestor."
                  value={credentialForm.notes}
                  onChange={(e) => setCredentialForm({ ...credentialForm, notes: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 h-20"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b]">
                <button type="button" onClick={() => setShowCredentialModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar no Cofre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
