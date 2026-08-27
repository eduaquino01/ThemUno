import { getContractById } from '@/app/actions';
import { notFound } from 'next/navigation';
import ContractDetailsClient from './ContractDetailsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContractById(id);

  if (!contract) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ContractDetailsClient contract={contract} />
    </div>
  );
}
