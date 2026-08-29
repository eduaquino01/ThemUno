import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido automaticamente pelo Next.js enquanto getContracts()/getInvoices()
// buscam os dados de faturamento no servidor.
export default function BillingLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonTable rows={8} columns={6} />
    </div>
  );
}
