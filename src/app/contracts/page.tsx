import { getContracts, createContract } from '@/app/actions';
import ContractsClient from './ContractsClient';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const contracts = await getContracts();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Repositório de Contratos</h1>
        <p className="text-gray-400 text-sm mt-1">Visão integrada do ciclo de vida dos contratos e aditivos.</p>
      </div>

      <ContractsClient initialContracts={contracts} />
    </div>
  );
}
