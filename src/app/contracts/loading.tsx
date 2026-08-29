import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getContracts() busca a
// lista de contratos no servidor.
export default function ContractsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonTable rows={8} columns={7} />
    </div>
  );
}
