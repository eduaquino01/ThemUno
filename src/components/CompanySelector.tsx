'use client';

import { useState, useEffect, useTransition } from 'react';
import { Building2, ChevronDown, Check, ShieldCheck, Plus, X, Loader2 } from 'lucide-react';
import { getCompanies, createCompany } from '@/app/actions';
import Button from '@/components/ui/Button';

export interface CompanySelectorProps {
  onCompanyChange?: (companyId: string | 'ALL') => void;
}

export default function CompanySelector({ onCompanyChange }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'ALL'>('ALL');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Create Company Modal State
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    tax_id: '',
    color: '#3b82f6',
    is_holding: false,
  });

  const loadCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data || []);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  useEffect(() => {
    loadCompanies();

    // Check localStorage for saved company preference
    const saved = localStorage.getItem('themuno_selected_company_id');
    if (saved) {
      setSelectedCompanyId(saved);
      if (onCompanyChange) onCompanyChange(saved);
    }
  }, []);

  const handleSelect = (id: string | 'ALL') => {
    setSelectedCompanyId(id);
    localStorage.setItem('themuno_selected_company_id', id);
    setIsOpen(false);
    if (onCompanyChange) onCompanyChange(id);
    window.dispatchEvent(new CustomEvent('themuno_company_changed', { detail: id }));
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('O nome da empresa é obrigatório.');
      return;
    }

    const generatedCode = formData.code.trim() || formData.name.trim().toUpperCase().replace(/\s+/g, '_').substring(0, 15);

    startTransition(async () => {
      try {
        const created = await createCompany({
          name: formData.name.trim(),
          code: generatedCode,
          tax_id: formData.tax_id.trim() || null,
          color: formData.color,
          is_holding: formData.is_holding,
        });

        if (created) {
          setCompanies(prev => [...prev, created]);
          handleSelect(created.id);
        }

        setShowModal(false);
        setFormData({
          name: '',
          code: '',
          tax_id: '',
          color: '#3b82f6',
          is_holding: false,
        });
      } catch (err: any) {
        setFormError(err.message || 'Erro ao cadastrar empresa.');
      }
    });
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 rounded-xl text-xs text-white font-medium transition-all shadow-inner group"
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCompany ? selectedCompany.color : '#3b82f6' }} />
          <span className="font-bold truncate max-w-[150px] sm:max-w-[200px]">
            {selectedCompanyId === 'ALL' ? '🏢 Todas (Visão Grupo Holding)' : selectedCompany?.name || 'Empresa'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-[#0d1527] border border-[#1e293b] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in p-2 space-y-1.5">
            <div className="px-3 py-1.5 border-b border-[#1e293b] text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
              <span>Selecione a Empresa</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>

            {/* Option: ALL COMPANIES */}
            <button
              onClick={() => handleSelect('ALL')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                selectedCompanyId === 'ALL'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="block">🏢 Visão Grupo Holding</span>
                  <span className="text-[10px] text-slate-400 font-normal">Consolidado (Todas as filiais)</span>
                </div>
              </div>
              {selectedCompanyId === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-400" />}
            </button>

            {/* Companies List */}
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {companies.map((c) => {
                const isSelected = selectedCompanyId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div className="truncate">
                        <span className="block truncate font-bold text-white">{c.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{c.tax_id || c.code}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Button: Add New Company */}
            <div className="pt-1.5 border-t border-[#1e293b]">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowModal(true);
                }}
                className="w-full py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar Nova Empresa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE COMPANY MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1527] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">Cadastrar Nova Empresa / Filial</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nome da Empresa / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ThemUno Logística & Supply S.A."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">CNPJ / Tax ID</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formData.tax_id}
                    onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-[#1e293b] rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="w-9 h-9 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <span className="font-mono text-slate-400">{formData.color}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isPending}>
                  Salvar Empresa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
