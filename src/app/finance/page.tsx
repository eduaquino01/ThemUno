import { getCompanies } from '@/app/actions';
import { getFinanceDashboard } from './actions';
import FinanceClient from './FinanceClient';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  const companies = await getCompanies();
  const infometter = companies.find((company: { code: string }) => company.code === 'INFOMETTER');
  const initialCompanyId = infometter?.id || 'ALL';
  const initialData = await getFinanceDashboard(initialCompanyId, 2026);
  return <FinanceClient companies={companies} initialCompanyId={initialCompanyId} initialData={initialData} />;
}
