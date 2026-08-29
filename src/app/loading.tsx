import { SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js durante o carregamento dos dados do
// Dashboard (getDashboardData), enquanto o Server Component correspondente
// ainda não terminou de buscar contratos, faturas e credenciais.
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={7} columns={6} />
    </div>
  );
}
