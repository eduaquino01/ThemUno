import { getCompanies } from '@/app/actions';
import BudgetClient from './BudgetClient';
import { getBudgetOverview } from './actions';

export const dynamic = 'force-dynamic';
export default async function BudgetsPage() {
  const year = new Date().getFullYear();
  const [companies, initialData] = await Promise.all([getCompanies(), getBudgetOverview({ company_id: 'ALL', year })]);
  return <BudgetClient companies={companies} initialData={initialData} initialYear={year} />;
}
