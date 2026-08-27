import { getContracts, getInvoices } from '@/app/actions';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const contracts = await getContracts();
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Faturamento & Medições</h1>
        <p className="text-gray-400 text-sm mt-1">
          Validação e conciliação de faturas, NFs e controle de glosas financeiras.
        </p>
      </div>

      <BillingClient initialContracts={contracts} initialInvoices={invoices} />
    </div>
  );
}
