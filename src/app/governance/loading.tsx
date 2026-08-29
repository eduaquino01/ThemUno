import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getContracts()/
// getChangeRequests() buscam os dados de governança no servidor.
export default function GovernanceLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonTable rows={7} columns={5} />
    </div>
  );
}
