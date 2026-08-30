import { getCompanies } from '@/app/actions';
import { getFinanceOperations } from '../operations/actions';
import ObligationsClient from '../operations/ObligationsClient';
import { requireAuth, ROLE_PERMISSIONS } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export default async function PayablesPage() {
  const [companies, data, user] = await Promise.all([getCompanies(), getFinanceOperations({ nature: 'EXPENSE', company_id: 'ALL', status: 'ALL', page: 1, page_size: 50 }), requireAuth()]);
  return <ObligationsClient nature="EXPENSE" companies={companies} initialData={data} canApprove={ROLE_PERMISSIONS[user.role].includes('approve')} currentUserId={user.id} />;
}
