import { getDashboardData } from '@/app/actions';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const dashboardData = await getDashboardData();

  return <DashboardClient initialData={dashboardData} />;
}
