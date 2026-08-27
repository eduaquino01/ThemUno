'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  createChangeRequest, 
  updateChangeRequestStatus, 
  updateMilestoneAcceptance 
} from '@/app/actions';
import { formatCurrency, parseNumber, formatDate } from '@/lib/formatters';
export type ChangeRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type AcceptanceStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  ShieldAlert,
  Loader2,
  Calendar,
  X,
  FileCheck
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

interface GovernanceClientProps {
  initialContracts: any[];
  initialChangeRequests: any[];
}

export default function GovernanceClient({ 
  initialContracts, 
  initialChangeRequests 
}: GovernanceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected sub-section within page
  const [currentSection, setCurrentSection] = useState<'deliverables' | 'changes'>('deliverables');

  // Form display
  const [showCrModal, setShowCrModal] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    contract_id: '',
    title: '',
    requested_by: '',
    scope_impact: '',
    financial_impact: '' as string | number,
    time_impact_days: 0,
  });

  // Calculate percentage impact dynamically for selected contract
  const selectedContract = initialContracts.find(c => c.id === formData.contract_id);
  const parsedImpact = parseNumber(formData.financial_impact);
  const percentCostImpact = selectedContract && selectedContract.total_value > 0
    ? ((parsedImpact / selectedContract.total_value) * 100).toFixed(1)
    : '0.0';

  const handleCreateCR = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.contract_id || !formData.title || !formData.requested_by || !formData.scope_impact) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    startTransition(async () => {
      try {
        await createChangeRequest({
          contract_id: formData.contract_id,
          title: formData.title,
          requested_by: formData.requested_by,
          scope_impact: formData.scope_impact,
          financial_impact: parseNumber(formData.financial_impact),
          time_impact_days: Number(formData.time_impact_days),
          status: 'SUBMITTED', // Set directly to SUBMITTED for governance review
        });

        setShowCrModal(false);
        setFormData({ contract_id: '', title: '', requested_by: '', scope_impact: '', financial_impact: '', time_impact_days: 0 });
        router.refresh();
      } catch (err: any) {
        setFormError(err.message || 'Erro ao registrar solicitação de mudança.');
      }
    });
  };

  const handleApproveCR = async (crId: string) => {
    startTransition(async () => {
      try {
        await updateChangeRequestStatus(crId, 'APPROVED');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao aprovar mudança.');
      }
    });
  };

  const handleRejectCR = async (crId: string) => {
    startTransition(async () => {
      try {
        await updateChangeRequestStatus(crId, 'REJECTED');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao rejeitar mudança.');
      }
    });
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    startTransition(async () => {
      try {
        await updateMilestoneAcceptance(milestoneId, 'ACCEPTED');
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao homologar marco.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* SECTION SELECTOR */}
      <div className="flex border-b border-[#1e293b] gap-2">
        <button
          onClick={() => setCurrentSection('deliverables')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            currentSection === 'deliverables'
              ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Critérios de Aceite SOW/SLA
        </button>
        <button
          onClick={() => setCurrentSection('changes')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            currentSection === 'changes'
              ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Requisições de Mudança (CRs)
        </button>
      </div>

      {/* ==========================================
          SECTION 1: DELIVERABLES ACCEPTANCE LINKAGE
          ========================================== */}
      {currentSection === 'deliverables' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-lg font-bold text-white">Painel de Critérios de Homologação</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Valide as entregas físicas e operacionais contra os critérios de aceitação formal descritos nos contratos.
            </p>
          </div>

          <div className="space-y-6">
            {initialContracts.filter(c => c.milestones?.length > 0).map((c) => (
              <div key={c.id} className="bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[#1e293b]/50 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-white">{c.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Contraparte: {c.counterpart} | Tipo: {c.type}</p>
                  </div>
                  <Link 
                    href={`/contracts/${c.id}`}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Ver Contrato <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {c.milestones.map((m: any) => (
                    <div 
                      key={m.id} 
                      className={`p-4 rounded-lg border text-xs space-y-3 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center ${
                        m.acceptance_status === 'ACCEPTED' 
                          ? 'bg-emerald-950/5 border-emerald-500/10' 
                          : m.acceptance_status === 'REJECTED'
                          ? 'bg-red-950/5 border-red-500/10'
                          : 'bg-slate-900/50 border-[#1e293b]'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{m.title}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold border ${
                            m.acceptance_status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            m.acceptance_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {m.acceptance_status}
                          </span>
                        </div>
                        <p className="text-gray-300">{m.scope_description}</p>
                        <div className="text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-300">Critério Aceite:</span> {m.acceptance_criteria}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0 text-right w-full md:w-auto">
                        <div className="text-xs text-gray-400">
                          Valor: <span className="font-bold text-white">{formatCurrency(m.billing_value)}</span> | Prazo: <span className="text-white font-medium">{formatDate(m.due_date)}</span>
                        </div>

                        {/* Direct Approval */}
                        {m.acceptance_status === 'PENDING' ? (
                          <button
                            onClick={() => handleApproveMilestone(m.id)}
                            className="flex items-center gap-1 px-3 py-1.5 font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Aceite
                          </button>
                        ) : m.acceptance_status === 'ACCEPTED' ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10">
                            <FileCheck className="w-4 h-4" /> Aceito & Homologado
                          </span>
                        ) : (
                          <span className="text-red-400 font-semibold flex items-center gap-1.5 text-xs bg-red-500/5 px-2.5 py-1 rounded border border-red-500/10">
                            <XCircle className="w-4 h-4" /> Glosado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          SECTION 2: CHANGE REQUESTS & ADITIVOS
          ========================================== */}
      {currentSection === 'changes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Gestão de Aditivos & Prevenção de Scope Creep</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Revise requisições de mudança e controle os custos e prazos adicionais de projetos.
              </p>
            </div>
            <button 
              onClick={() => setShowCrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Solicitação (CR)
            </button>
          </div>

          {/* CR LIST */}
          <div className="grid grid-cols-1 gap-6">
            {initialChangeRequests.length > 0 ? (
              initialChangeRequests.map((cr) => (
                <div key={cr.id} className="bg-[#0d1527] rounded-xl border border-[#1e293b] p-6 flex flex-col md:flex-row justify-between gap-6 relative">
                  
                  {/* Info panel */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-0.5 rounded bg-slate-900 border border-[#1e293b] text-gray-300 font-bold">
                        {cr.contract?.title || 'Contrato'}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                        cr.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        cr.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {cr.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">{cr.title}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Solicitante: {cr.requested_by} | Data: {formatDate(cr.created_at)}</p>
                    </div>

                    <div className="p-3 bg-black/10 rounded-lg text-xs text-gray-300">
                      <span className="font-semibold text-gray-400 block mb-1">Impacto no Escopo:</span>
                      {cr.scope_impact}
                    </div>

                    {/* Linked Amendment Note */}
                    {cr.status === 'APPROVED' && cr.amendment_contract && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold">ADITIVO CONTRATUAL ATIVO GERADO:</span> {cr.amendment_contract.title}
                        </div>
                        <Link 
                          href={`/contracts/${cr.amendment_contract.id}`}
                          className="text-[10px] font-extrabold hover:underline uppercase text-blue-400 ml-2"
                        >
                          Ir para Aditivo
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Financial & Time Impact Panel */}
                  <div className="flex flex-col justify-between items-end gap-4 shrink-0 text-right w-full md:w-auto">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Custo Adicional</span>
                      <p className="text-xl font-bold text-white">{formatCurrency(cr.financial_impact)}</p>
                      
                      {cr.contract && cr.contract.total_value > 0 && (
                        <p className="text-[10px] text-amber-400 font-semibold mt-0.5">
                          (+{((cr.financial_impact / cr.contract.total_value) * 100).toFixed(1)}% do valor original)
                        </p>
                      )}
                      
                      <div className="text-xs text-gray-400 mt-2">
                        Prorrogação: <span className="font-bold text-white">+{cr.time_impact_days} dias</span>
                      </div>
                    </div>

                    {/* Decisions */}
                    {cr.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRejectCR(cr.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-500/30 bg-red-950/15 hover:bg-red-950/30 text-red-400 transition-colors"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => handleApproveCR(cr.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/10"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Converter em Aditivo
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))
            ) : (
              <div className="text-center p-12 text-gray-500 border border-dashed border-[#1e293b] rounded-xl">
                Nenhuma requisição de alteração de escopo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE CR MODAL */}
      {showCrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Registrar Requisição de Mudança (CR)</h3>
              <button onClick={() => setShowCrModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateCR} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Select Contract */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contrato de Origem *</label>
                <select 
                  required
                  value={formData.contract_id}
                  onChange={(e) => setFormData({ ...formData, contract_id: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione um contrato...</option>
                  {initialContracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} (Val: {formatCurrency(c.total_value)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title & Requested By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título da Alteração *</label>
                  <input 
                    type="text" required placeholder="Ex: Integração extra de banco legados"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitado por (PM/Líder) *</label>
                  <input 
                    type="text" required placeholder="Ex: PM Jane Smith"
                    value={formData.requested_by}
                    onChange={(e) => setFormData({ ...formData, requested_by: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Scope Impact */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição do Impacto no Escopo *</label>
                <textarea 
                  required placeholder="Ex: Detalhamento técnico dos desvios de escopo e novas entregas..."
                  value={formData.scope_impact}
                  onChange={(e) => setFormData({ ...formData, scope_impact: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500 h-20"
                />
              </div>

              {/* Financial & Time Impact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Impacto Financeiro Adicional (R$) *</label>
                  <input 
                    type="text" required inputMode="decimal" placeholder="Ex: 4.087,69 ou 4087.69"
                    value={formData.financial_impact}
                    onChange={(e) => setFormData({ ...formData, financial_impact: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />

                  {/* Automatic percentage calculation display */}
                  {formData.contract_id && (
                    <span className="text-[10px] text-amber-400 font-semibold mt-1">
                      Calculado: +{percentCostImpact}% em relação ao valor original do contrato.
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acréscimo de Prazo (Dias)</label>
                  <input 
                    type="number" min={0}
                    value={formData.time_impact_days}
                    onChange={(e) => setFormData({ ...formData, time_impact_days: Number(e.target.value) })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b] mt-6">
                <button type="button" onClick={() => setShowCrModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={isPending} 
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-lg shadow-blue-500/10"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Registrar Alteração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
