import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getAdminOverview } from './actions';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') redirect('/');
  const data = await getAdminOverview();
  return <AdminClient initialData={data} />;
}
