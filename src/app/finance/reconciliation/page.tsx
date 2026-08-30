import { getCompanies } from '@/app/actions';
import ReconciliationClient from './ReconciliationClient';
import { getReconciliationData } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
  const [companies, initialData] = await Promise.all([getCompanies(), getReconciliationData({ company_id: 'ALL', bank_account_id: 'ALL', status: 'ALL', page: 1, page_size: 50 })]);
  return <ReconciliationClient companies={companies} initialData={initialData} />;
}
