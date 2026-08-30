import { SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">{Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)}</div>
    <SkeletonTable rows={6} columns={5} />
  </div>;
}
