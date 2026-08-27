'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContract, updateContract, deleteContract, getCompanies } from '@/app/actions';
import { formatCurrency, parseNumber, formatDate } from '@/lib/formatters';
export type ContractType = 'MSA' | 'SOW' | 'SLA' | 'NDA' | 'SAAS' | 'HARDWARE' | 'PARTNERSHIP' | 'AMENDMENT';
export type ContractStatus = 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type ContractNature = 'REVENUE' | 'EXPENSE';

const ContractType = {
  MSA: 'MSA',
  SOW: 'SOW',
  SLA: 'SLA',
  NDA: 'NDA',
  SAAS: 'SAAS',
  HARDWARE: 'HARDWARE',
  PARTNERSHIP: 'PARTNERSHIP',
  AMENDMENT: 'AMENDMENT',
};

const ContractStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED',
};
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  ArrowUpRight, 
  Calendar,
  X,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface ContractsClientProps {
  initialContracts: any[];
}

export default function ContractsClient({ initialContracts }: ContractsClientProps) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedNature, setSelectedNature] = useState<string>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  useEffect(() => {
    async function loadCompanies() {
      const comps = await getCompanies();
      setCompaniesList(comps || []);
    }
    loadCompanies();

    const handleCompanyChange = (e: any) => {
      setSelectedCompanyId(e.detail || 'ALL');
    };
    window.addEventListener('themuno_company_changed', handleCompanyChange);
    const saved = localStorage.getItem('themuno_selected_company_id');
    if (saved) setSelectedCompanyId(saved);
    return () => window.removeEventListener('themuno_company_changed', handleCompanyChange);
  }, []);

  const handleStatusChange = async (id: string, status: ContractStatus) => {
    try {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      await updateContract(id, { status });
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status do contrato.');
    }
  };

  // Modal form state for CREATE
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_id: '',
    title: '',
    type: 'SOW' as ContractType,
    nature: 'EXPENSE' as ContractNature,
    counterpart: '',
    status: 'DRAFT' as ContractStatus,
    start_date: '',
    end_date: '',
    auto_renewal: false,
    notice_period_days: 30,
    total_value: '' as string | number,
    raw_text_or_url: '',
  });

  // EDIT state
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    type: 'SOW' as ContractType,
    nature: 'EXPENSE' as ContractNature,
    counterpart: '',
    status: 'DRAFT' as ContractStatus,
    start_date: '',
    end_date: '',
    auto_renewal: false,
    notice_period_days: 30,
    total_value: '' as string | number,
    raw_text_or_url: '',
  });

  // DELETE state
  const [deletingContract, setDeletingContract] = useState<any | null>(null);

  useEffect(() => {
    setContracts(initialContracts);
  }, [initialContracts]);

  // Filter logic
  const filteredContracts = contracts.filter((c) => {
    const matchesCompany = selectedCompanyId === 'ALL' || c.company_id === selectedCompanyId;
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.counterpart.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' || c.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
    const matchesNature = selectedNature === 'ALL' || c.nature === selectedNature;

    return matchesCompany && matchesSearch && matchesType && matchesStatus && matchesNature;
  });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.counterpart || !formData.start_date || !formData.end_date) {
      setFormError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    startTransition(async () => {
      try {
        const newContract = await createContract({
          company_id: formData.company_id || null,
          title: formData.title,
          type: formData.type,
          nature: formData.nature,
          counterpart: formData.counterpart,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date,
          auto_renewal: formData.auto_renewal,
          notice_period_days: Number(formData.notice_period_days),
          total_value: parseNumber(formData.total_value),
          raw_text_or_url: formData.raw_text_or_url || null,
        });

        if (newContract) {
          setContracts((prev) => [newContract, ...prev]);
        }

        setShowModal(false);
        setFormData({
          company_id: '',
          title: '',
          type: 'SOW',
          nature: 'EXPENSE',
          counterpart: '',
          status: 'DRAFT',
          start_date: '',
          end_date: '',
          auto_renewal: false,
          notice_period_days: 30,
          total_value: '',
          raw_text_or_url: '',
        });
        
        router.refresh();
      } catch (err: any) {
        setFormError(err.message || 'Erro ao registrar o contrato.');
      }
    });
  };

  const openEditModal = (c: any) => {
    setEditingContract(c);
    setEditFormData({
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
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;

    startTransition(async () => {
      try {
        const updated = await updateContract(editingContract.id, {
          title: editFormData.title,
          type: editFormData.type,
          nature: editFormData.nature,
          counterpart: editFormData.counterpart,
          status: editFormData.status,
          start_date: editFormData.start_date,
          end_date: editFormData.end_date,
          auto_renewal: editFormData.auto_renewal,
          notice_period_days: Number(editFormData.notice_period_days),
          total_value: parseNumber(editFormData.total_value),
          raw_text_or_url: editFormData.raw_text_or_url || null,
        });

        if (updated) {
          setContracts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }

        setEditingContract(null);
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao atualizar contrato.');
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingContract) return;

    startTransition(async () => {
      try {
        await deleteContract(deletingContract.id);
        setContracts((prev) => prev.filter((item) => item.id !== deletingContract.id));
        setDeletingContract(null);
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir contrato.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTERS & SEARCH ROW */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0d1527] p-4 rounded-xl border border-[#1e293b]">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por título ou contraparte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Type & Status Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            Filtrar:
          </div>

          {/* Type Filter */}
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-[#1e293b] rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos os Tipos</option>
            {Object.keys(ContractType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-950 border border-[#1e293b] rounded-lg text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            {Object.keys(ContractStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-[#1e293b]">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabela
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Quadro Kanban
            </button>
          </div>

          {/* Add Contract Button */}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/10 transition-colors ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" /> Novo Contrato
          </button>
        </div>
      </div>      {/* CONTRACTS VIEW: TABLE OR KANBAN BOARD */}
      {viewMode === 'table' ? (
        <div className="bg-[#0d1527] rounded-xl border border-[#1e293b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1e293b] bg-slate-950/20 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Título</th>
                  <th className="px-6 py-4">Natureza</th>
                  <th className="px-6 py-4">Contraparte</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Vigência</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4">Execução</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50 text-sm">
                {filteredContracts.length > 0 ? (
                  filteredContracts.map((c) => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <div className="font-semibold text-white leading-snug truncate max-w-xs">
                            {c.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] px-2.5 py-1 rounded font-extrabold uppercase border ${
                          c.nature === 'REVENUE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {c.nature === 'REVENUE' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-medium">
                        {c.counterpart}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded bg-[#1e293b] text-gray-300 font-semibold border border-[#334155]">
                          {c.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>
                            {formatDate(c.start_date)} - {formatDate(c.end_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {formatCurrency(c.total_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const invoicedSum = (c.invoices || []).reduce((sum: number, i: any) => sum + (i.status === 'PAID' ? Number(i.amount) : 0), 0);
                          const pct = c.total_value > 0 ? Math.min(100, Math.round((invoicedSum / Number(c.total_value)) * 100)) : 0;
                          return (
                            <div className="w-28 space-y-1">
                              <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                                <span>Faturado</span>
                                <span className="text-blue-400 font-bold">{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-[#1e293b]">
                                <div 
                                  className={`h-full transition-all rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase border ${
                          c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.status === 'IN_REVIEW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          c.status === 'DRAFT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            href={`/contracts/${c.id}`}
                            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="Ver Detalhes"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Editar Contrato"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingContract(c)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir Contrato"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      Nenhum contrato cadastrado ou correspondente aos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {[
            { id: 'DRAFT', label: '📝 Rascunho / Elaboração', color: 'border-blue-500/30 bg-blue-950/10 text-blue-400' },
            { id: 'IN_REVIEW', label: '🔍 Em Revisão Jurídica', color: 'border-amber-500/30 bg-amber-950/10 text-amber-400' },
            { id: 'ACTIVE', label: '🟢 Ativo / Em Execução', color: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400' },
            { id: 'EXPIRED', label: '⏰ Encerrado / Expirado', color: 'border-rose-500/30 bg-rose-950/10 text-rose-400' },
          ].map(column => {
            const columnContracts = filteredContracts.filter(c => {
              if (column.id === 'EXPIRED') {
                return c.status === 'EXPIRED' || c.status === 'TERMINATED';
              }
              return c.status === column.id;
            });

            return (
              <div key={column.id} className={`p-4 rounded-2xl border ${column.color} space-y-4 shadow-xl min-h-[500px]`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-extrabold text-sm">{column.label}</h4>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-900 border border-slate-800 text-white">
                    {columnContracts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnContracts.length > 0 ? (
                    columnContracts.map(c => {
                      const invoicedSum = (c.invoices || []).reduce((sum: number, i: any) => sum + (i.status === 'PAID' ? Number(i.amount) : 0), 0);
                      const pct = c.total_value > 0 ? Math.min(100, Math.round((invoicedSum / Number(c.total_value)) * 100)) : 0;

                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 shadow-md space-y-3 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold uppercase border ${
                              c.nature === 'REVENUE'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {c.nature === 'REVENUE' ? 'Receita' : 'Despesa'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-gray-300 font-bold border border-slate-700">
                              {c.type}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-bold text-white text-sm leading-snug group-hover:text-blue-400 transition-colors">
                              {c.title}
                            </h5>
                            <p className="text-xs text-gray-400 mt-1">
                              {c.counterpart}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                            <span className="text-gray-400">Valor Total:</span>
                            <span className="font-extrabold text-white">{formatCurrency(c.total_value)}</span>
                          </div>

                          {/* Progress execution bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-gray-400">
                              <span>Execução</span>
                              <span className="text-blue-400 font-bold">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-[#1e293b]">
                              <div
                                className={`h-full transition-all rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* MOVE STATUS SELECTOR & ACTIONS */}
                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                            <select
                              value={c.status}
                              onChange={(e) => handleStatusChange(c.id, e.target.value as ContractStatus)}
                              className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg text-gray-300 font-semibold px-2 py-1 focus:outline-none focus:border-blue-500"
                            >
                              <option value="DRAFT">📝 Rascunho</option>
                              <option value="IN_REVIEW">🔍 Em Revisão</option>
                              <option value="ACTIVE">🟢 Ativo</option>
                              <option value="EXPIRED">⏰ Expirado</option>
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1 text-amber-400 hover:text-amber-300 rounded hover:bg-slate-800"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                href={`/contracts/${c.id}`}
                                className="p-1 text-blue-400 hover:text-blue-300 rounded hover:bg-slate-800 flex items-center gap-1 font-semibold text-[11px]"
                              >
                                Ver <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-gray-600 text-xs font-medium border border-dashed border-slate-800 rounded-xl">
                      Nenhum contrato neste estágio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Registrar Novo Contrato</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título do Contrato *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Contrato de Licenciamento SaaS ERP"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Empresa Proprietária *</label>
                  <select 
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="">Selecione a empresa...</option>
                    {companiesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Natureza Financeira *</label>
                  <select 
                    value={formData.nature}
                    onChange={(e) => setFormData({ ...formData, nature: e.target.value as ContractNature })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="EXPENSE">Despesa (Fornecedor / Pagamento)</option>
                    <option value="REVENUE">Receita (Cliente / Faturamento)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraparte (Client/Vendor) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Tech Solutions Corp."
                  value={formData.counterpart}
                  onChange={(e) => setFormData({ ...formData, counterpart: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Início *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Término *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aviso de Rescisão (Dias)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={formData.notice_period_days}
                    onChange={(e) => setFormData({ ...formData, notice_period_days: Number(e.target.value) })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor do Contrato (R$) *</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    required
                    placeholder="Ex: 4.087,69 ou 4087.69"
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status *</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.keys(ContractStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <input 
                    type="checkbox" 
                    id="auto_renewal"
                    checked={formData.auto_renewal}
                    onChange={(e) => setFormData({ ...formData, auto_renewal: e.target.checked })}
                    className="w-4 h-4 bg-slate-950 border border-[#1e293b] rounded focus:ring-blue-500 text-blue-600"
                  />
                  <label htmlFor="auto_renewal" className="text-xs font-semibold text-gray-300 select-none">Renovação Automática</label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Minuta Digital (Texto ou Link PDF)</label>
                <input 
                  type="text" 
                  placeholder="Ex: https://storage.googleapis.com/.../minuta.pdf"
                  value={formData.raw_text_or_url}
                  onChange={(e) => setFormData({ ...formData, raw_text_or_url: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b] mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-lg shadow-blue-500/10 transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACT MODAL */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-[#0d1527] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/20">
              <h3 className="font-bold text-lg text-white">Editar Contrato</h3>
              <button 
                onClick={() => setEditingContract(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContract} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título do Contrato *</label>
                <input 
                  type="text" 
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Natureza Financeira *</label>
                  <select 
                    value={editFormData.nature}
                    onChange={(e) => setEditFormData({ ...editFormData, nature: e.target.value as ContractNature })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="EXPENSE">Despesa (Fornecedor / Pagamento)</option>
                    <option value="REVENUE">Receita (Cliente / Faturamento)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contraparte *</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.counterpart}
                    onChange={(e) => setEditFormData({ ...editFormData, counterpart: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Início *</label>
                  <input 
                    type="date" 
                    required
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data de Término *</label>
                  <input 
                    type="date" 
                    required
                    value={editFormData.end_date}
                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aviso de Rescisão (Dias)</label>
                  <input 
                    type="number" 
                    min={0}
                    value={editFormData.notice_period_days}
                    onChange={(e) => setEditFormData({ ...editFormData, notice_period_days: Number(e.target.value) })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor do Contrato (R$) *</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    required
                    value={editFormData.total_value}
                    onChange={(e) => setEditFormData({ ...editFormData, total_value: e.target.value })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status *</label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as ContractStatus })}
                    className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.keys(ContractStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <input 
                    type="checkbox" 
                    id="edit_auto_renewal"
                    checked={editFormData.auto_renewal}
                    onChange={(e) => setEditFormData({ ...editFormData, auto_renewal: e.target.checked })}
                    className="w-4 h-4 bg-slate-950 border border-[#1e293b] rounded focus:ring-blue-500 text-blue-600"
                  />
                  <label htmlFor="edit_auto_renewal" className="text-xs font-semibold text-gray-300 select-none">Renovação Automática</label>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Minuta Digital</label>
                <input 
                  type="text" 
                  value={editFormData.raw_text_or_url}
                  onChange={(e) => setEditFormData({ ...editFormData, raw_text_or_url: e.target.value })}
                  className="px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#1e293b] mt-6">
                <button 
                  type="button"
                  onClick={() => setEditingContract(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg shadow-lg shadow-amber-500/10 transition-colors"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Atualizar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONTRACT CONFIRMATION MODAL */}
      {deletingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1527] border border-rose-500/30 rounded-xl shadow-2xl overflow-hidden p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-lg text-white">Excluir Contrato?</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Tem certeza que deseja excluir o contrato <strong className="text-white">{deletingContract.title}</strong>? Esta ação removerá o contrato e todos os seus registros associados do banco de dados.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setDeletingContract(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-lg shadow-rose-600/20 transition-colors"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Excluir Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
