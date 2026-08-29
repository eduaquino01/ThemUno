import { SkeletonCard, SkeletonPageHeader } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getMonthlyReports() busca
// os relatórios mensais no servidor.
export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
