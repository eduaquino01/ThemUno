import { getCompanies } from '@/app/actions';
import CashFlowClient from './CashFlowClient';
import { getCashFlowProjection } from './actions';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage() {
  const companies = await getCompanies();
  const initialCompanyId = 'ALL';
  const initialYear = new Date().getFullYear();
  const initialData = await getCashFlowProjection({ company_id: initialCompanyId, year: initialYear });
  return <CashFlowClient companies={companies} initialCompanyId={initialCompanyId} initialYear={initialYear} initialData={initialData} />;
}
