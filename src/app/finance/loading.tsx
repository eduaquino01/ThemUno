import { SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getCompanies() e
// getFinanceDashboard() buscam os dados financeiros no servidor.
export default function FinanceLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}
