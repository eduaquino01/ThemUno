import { SkeletonPageHeader, SkeletonTable } from '@/components/ui/Skeleton';

// Exibido pelo Next.js enquanto o /admin busca empresas, categorias e contas.
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}
