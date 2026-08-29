'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createMonthlyReport } from '@/app/actions';
import { generateMonthlyReportPDF } from '@/lib/pdf-generator';
export type MonthlyReportStatus = 'DRAFT' | 'CONSOLIDATED' | 'SENT';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  CheckCircle, 
  ClipboardList,
  Loader2,
  Calendar,
  X
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastProvider';

interface ReportsClientProps {
  initialReports: any[];
}

export default function ReportsClient({ initialReports }: ReportsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Log feed input state
  const [period, setPeriod] = useState('2026-08');
  const [currentPerformedInput, setCurrentPerformedInput] = useState('');
  const [currentPlannedInput, setCurrentPlannedInput] = useState('');

  // Draft lists
  const [performedList, setPerformedList] = useState<string[]>([
    'Concluído o desenvolvimento dos conectores adicionais para banco legado (CR #01).',
    'Realizado os testes de carga e validação no ambiente de Staging para migração de ERP.',
    'Homologado o aceite formal do Milestone 2 com Nexus Cloud.'
  ]);
  const [plannedList, setPlannedList] = useState<string[]>([
    'Iniciar o deploy final em produção e suporte hypercare de 30 dias.',
    'Assinar minuta de aditivo contratual para suporte ERP.',
    'Mapear e testar criptografia de logs no Cloud Storage (mitigação do risco LGPD).'
  ]);

  // Feed handlers
  const addPerformedActivity = () => {
    if (!currentPerformedInput.trim()) return;
    setPerformedList([...performedList, currentPerformedInput.trim()]);
    setCurrentPerformedInput('');
  };

  const removePerformedActivity = (idx: number) => {
    setPerformedList(performedList.filter((_, i) => i !== idx));
  };

  const addPlannedActivity = () => {
    if (!currentPlannedInput.trim()) return;
    setPlannedList([...plannedList, currentPlannedInput.trim()]);
    setCurrentPlannedInput('');
  };

  const removePlannedActivity = (idx: number) => {
    setPlannedList(plannedList.filter((_, i) => i !== idx));
  };

  // Compiler Handler
  const handleCompileReport = () => {
    if (performedList.length === 0 || plannedList.length === 0) {
      toast.error('Por favor insira pelo menos uma atividade realizada e uma planejada.');
      return;
    }

    startTransition(async () => {
      try {
        // 1. Save to Database
        await createMonthlyReport({
          period_month_year: period,
          performed_activities: performedList,
          next_month_plan: plannedList,
          status: 'CONSOLIDATED',
        });

        // 2. Generate and Download PDF client-side
        await generateMonthlyReportPDF(period, performedList, plannedList);

        // 3. Clear lists
        setPerformedList([]);
        setPlannedList([]);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao consolidar relatório.');
      }
    });
  };

  // Historical Download PDF handler
  const handleDownloadHistoricalPDF = async (report: any) => {
    const perfArr = Array.isArray(report.performed_activities) 
      ? report.performed_activities 
      : JSON.parse(report.performed_activities as string);
    const planArr = Array.isArray(report.next_month_plan)
      ? report.next_month_plan
      : JSON.parse(report.next_month_plan as string);

    await generateMonthlyReportPDF(report.period_month_year, perfArr, planArr);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* 1. REPORT BUILDER (Left Column) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div className="flex justify-between items-center border-b border-[#1e293b] pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              Assistente de Compilação Mensal
            </h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input 
                type="month" 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-950 border border-[#1e293b] text-white text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Log performed activities */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">1. Atividades Realizadas no Mês</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Finalizada migração de banco de homologação..."
                value={currentPerformedInput}
                onChange={(e) => setCurrentPerformedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPerformedActivity()}
                className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
              <Button 
                variant="primary" 
                size="sm"
                onClick={addPerformedActivity}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Adicionar
              </Button>
            </div>

            {/* List draft */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {performedList.map((item, idx) => (
                <div key={idx} className="flex gap-3 justify-between items-start p-2.5 rounded-lg bg-black/10 text-xs text-gray-200 group">
                  <span className="leading-relaxed">{item}</span>
                  <button 
                    onClick={() => removePerformedActivity(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Log planned activities */}
          <div className="space-y-3 pt-4 border-t border-[#1e293b]">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">2. Planejamento para o Próximo Mês</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Setup de rotinas de auditoria de segurança..."
                value={currentPlannedInput}
                onChange={(e) => setCurrentPlannedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlannedActivity()}
                className="flex-1 px-3 py-2 text-sm bg-slate-950 border border-[#1e293b] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              />
              <Button 
                variant="primary" 
                size="sm"
                onClick={addPlannedActivity}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Adicionar
              </Button>
            </div>

            {/* List draft */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {plannedList.map((item, idx) => (
                <div key={idx} className="flex gap-3 justify-between items-start p-2.5 rounded-lg bg-black/10 text-xs text-gray-200 group">
                  <span className="leading-relaxed">{item}</span>
                  <button 
                    onClick={() => removePlannedActivity(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Consolidate Actions */}
          <div className="pt-4 border-t border-[#1e293b] flex justify-end">
            <Button 
              variant="success" 
              size="lg"
              onClick={handleCompileReport}
              isLoading={isPending}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Consolidar Relatório & Gerar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 2. HISTORY LIST (Right Column) */}
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-xl flex flex-col gap-4">
          <h3 className="font-bold text-lg text-white border-b border-[#1e293b] pb-3">Histórico de Relatórios</h3>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {initialReports.length > 0 ? (
              initialReports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-lg bg-slate-900 border border-[#1e293b] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Período: {rep.period_month_year}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold block">
                      Status: CONSOLIDADO
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDownloadHistoricalPDF(rep)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white rounded-md transition-colors"
                    title="Baixar Relatório PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                Nenhum relatório compilado anteriormente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
