import { getMonthlyReports } from '@/app/actions';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const reports = await getMonthlyReports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Relatórios Mensais & Auditoria</h1>
        <p className="text-gray-400 text-sm mt-1">
          Compilação de atividades desempenhadas e planejamento para faturamento mensal.
        </p>
      </div>

      <ReportsClient initialReports={reports} />
    </div>
  );
}
