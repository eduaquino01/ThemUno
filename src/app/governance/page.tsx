import { getContracts, getChangeRequests } from '@/app/actions';
import GovernanceClient from './GovernanceClient';

export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  const contracts = await getContracts();
  const changeRequests = await getChangeRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Governança PM & Alterações</h1>
        <p className="text-gray-400 text-sm mt-1">
          Acompanhamento de entregas vinculadas a SOWs, termos de aceite e controle de aditivos.
        </p>
      </div>

      <GovernanceClient initialContracts={contracts} initialChangeRequests={changeRequests} />
    </div>
  );
}
