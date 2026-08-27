'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice, updateInvoiceStatus } from '@/app/actions';
import { formatCurrency, formatDate } from '@/lib/formatters';
export type InvoiceStatus = 'PENDING_ACCEPTANCE' | 'ISSUED' | 'PAID' | 'DISPUTED';
import { 
  FileCheck, 
  AlertTriangle, 
  CreditCard, 
  HelpCircle, 
  Plus, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  FileText
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface BillingClientProps {
  initialContracts: any[];
  initialInvoices: any[];
}

export default function BillingClient({ 
  initialContracts, 
  initialInvoices 
}: BillingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'validation' | 'invoices'>('validation');

  // Invoice creation modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [formError, setFormError] = useState('');

  // Invoice Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    issue_date: '',
    due_date: '',
    amount: 0,
  });

  // Dispute Log Modal State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // 1. Gather all milestones from all contracts
  const allMilestones = initialContracts.flatMap(c => 
    (c.milestones || []).map((m: any) => ({
      ...m,
      contractTitle: c.title,
      contractId: c.id
    }))
  );

  const handleOpenBilling = (m: any) => {
    setSelectedMilestone(m);
    setFormData({
      invoice_number: `NF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: m.billing_value,
    });
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedMilestone) return;

    // RULE: Enforce acceptance block before sending
    if (selectedMilestone.acceptance_status !== 'ACCEPTED') {
      setFormError('Bloqueio Operacional: O marco deve estar com status "ACCEPTED" antes de faturar.');
      return;
    }

    startTransition(async () => {
      try {
        await createInvoice({
          contract_id: selectedMilestone.contractId,
          milestone_id: selectedMilestone.id,
          invoice_number: formData.invoice_number,
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          amount: Number(formData.amount),
          status: 'ISSUED',
        });

        setShowInvoiceModal(false);
        router.refresh();
      } catch (err: any) {
        setFormError(err.message || 'Erro ao emitir fatura.');
      }
    });
  };

  const handleRegisterPayment = (invId: string) => {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invId, 'PAID', 'https://storage.googleapis.com/clms-invoices/proofs/recibo-gerado.pdf');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao registrar pagamento.');
      }
    });
  };

  const handleOpenDispute = (inv: any) => {
    setSelectedInvoice(inv);
    setDisputeReason('');
    setShowDisputeModal(true);
  };

  const handleConfirmDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    startTransition(async () => {
      try {
        await updateInvoiceStatus(selectedInvoice.id, 'DISPUTED', `https://storage.googleapis.com/clms-invoices/disputes/glosa-log-${selectedInvoice.id}.pdf`);
        setShowDisputeModal(false);
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao registrar glosa.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* TABS */}
      <div className="flex border-b border-[#1e293b] gap-2">
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'validation'
              ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Validador de Marcos SOW
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Log de Faturas & Glosas
        </button>
      </div>

      {/* ==========================================
          TAB 1: VALIDATION MATRIX
          ========================================== */}
      {activeTab === 'validation' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white">Validador de Aptidão de Faturamento</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Somente marcos com aceite formal registrado e assinado podem ter faturas emitidas.
            </p>
          </div>

          <div className="bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Contrato / SOW</th>
                    <th className="px-6 py-4">Marco</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Aceite Operacional</th>
                    <th className="px-6 py-4">Aptidão de Faturamento</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/50">
                  {allMilestones.length > 0 ? (
                    allMilestones.map((m) => {
                      const isAccepted = m.acceptance_status === 'ACCEPTED';
                      return (
                        <tr key={m.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white max-w-xs truncate">
                            {m.contractTitle}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            <div className="font-semibold text-white">{m.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">Prazo: {formatDate(m.due_date)}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-white">
                            {formatCurrency(m.billing_value)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase border ${
                              m.acceptance_status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              m.acceptance_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {m.acceptance_status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {isAccepted ? (
                              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                                <FileCheck className="w-4 h-4 shrink-0" /> APTO PARA NOTA FISCAL
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-950/20 border border-red-500/20 px-2 py-1 rounded w-fit">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> BLOQUEADO
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isAccepted ? (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleOpenBilling(m)}
                              >
                                Emitir Fatura
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled
                                title="Aceite pendente"
                              >
                                Bloqueado
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nenhum marco de faturamento cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: INVOICES & GLOSAS LOG
          ========================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white">Log de Conciliação e Glosas Financeiras</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Histórico de NFs registradas e indicação de divergências de valores ou glosas ativas.
            </p>
          </div>

          <div className="bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">NF Nº</th>
                  <th className="px-6 py-4">Contrato</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Emissão/Vcto</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50">
                {initialInvoices.length > 0 ? (
                  initialInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {inv.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300 max-w-xs truncate">
                        {inv.contract?.title || 'Contrato Associado'}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {formatDate(inv.issue_date)} / {formatDate(inv.due_date)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                          inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          inv.status === 'ISSUED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          inv.status === 'DISPUTED' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' :
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {inv.status === 'ISSUED' && (
                          <>
                            <button
                              onClick={() => handleOpenDispute(inv)}
                              className="px-2.5 py-1 text-xs font-semibold rounded border border-red-500/30 bg-red-950/15 hover:bg-red-950/30 text-red-400 transition-colors"
                            >
                              Glosar/Disputa
                            </button>
                            <button
                              onClick={() => handleRegisterPayment(inv.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            >
                              Registrar Pago
                            </button>
                          </>
                        )}
                        {inv.status === 'DISPUTED' && (
                          <span className="text-red-400 text-xs font-medium bg-red-500/5 px-2 py-1 rounded border border-red-500/10">
                            Glosa Operacional Ativa
                          </span>
                        )}
                        {inv.status === 'PAID' && (
                          <span className="text-emerald-400 text-xs font-medium bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                            NF Liquidada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma fatura registrada no log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTRAR FATURA MODAL */}
      {showInvoiceModal && selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Medição de Faturamento: {selectedMilestone.title}</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Read Only Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor do Marco Autorizado (R$)</label>
                <div className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-emerald-400 font-bold">
                  {formatCurrency(selectedMilestone.billing_value)}
                </div>
              </div>

              {/* Invoice Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Número da Nota Fiscal (NF) *</label>
                <input 
                  type="text" required
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Emissão *</label>
                  <input 
                    type="date" required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Vencimento *</label>
                  <input 
                    type="date" required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b] mt-6">
                <button type="button" onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isPending} 
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-lg shadow-blue-500/10"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirmar Faturamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTAR / GLOSAR MODAL */}
      {showDisputeModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Registrar Glosa / Contestar Faturamento</h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleConfirmDispute} className="p-6 space-y-4">
              <div className="text-xs text-gray-300 mb-2">
                Fatura: <span className="font-bold text-white">{selectedInvoice.invoice_number}</span> | Valor: <span className="font-bold text-white">{formatCurrency(selectedInvoice.amount)}</span>
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Motivo Técnico/Financeiro da Glosa *</label>
                <textarea 
                  required 
                  placeholder="Ex: Desvio de SLA contratual ou divergência material no cálculo de entregas..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500 h-24"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b] mt-6">
                <button type="button" onClick={() => setShowDisputeModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isPending} 
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg shadow-lg shadow-red-500/10"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirmar Glosa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
