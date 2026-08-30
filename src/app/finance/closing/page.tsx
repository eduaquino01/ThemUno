import { getCompanies } from '@/app/actions';
import ClosingClient from './ClosingClient';
import { getClosingOverview } from './actions';
export const dynamic = 'force-dynamic';
export default async function ClosingPage() { const year = new Date().getFullYear(); const [companies, initialData] = await Promise.all([getCompanies(), getClosingOverview({ company_id: 'ALL', year })]); return <ClosingClient companies={companies} initialData={initialData} initialYear={year} />; }
