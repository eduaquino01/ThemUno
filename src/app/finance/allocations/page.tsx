import { getCompanies } from '@/app/actions';
import AllocationClient from './AllocationClient';
import { getAllocationOverview } from './actions';

export const dynamic = 'force-dynamic';
export default async function AllocationsPage() {
  const [companies, initialData] = await Promise.all([getCompanies(), getAllocationOverview({ company_id: 'ALL' })]);
  return <AllocationClient companies={companies} initialData={initialData} />;
}
