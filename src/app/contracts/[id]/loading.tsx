import { Skeleton, SkeletonCard, SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getContractById() busca os
// detalhes de um contrato específico (marcos, riscos, faturas, credenciais).
export default function ContractDetailsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SkeletonCard className="lg:col-span-2" />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}
