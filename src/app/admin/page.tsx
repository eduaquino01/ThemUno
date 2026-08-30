import { getAdminCompanies, getBankAccounts, getFinancialCategories } from './actions';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [companies, categories, bankAccounts] = await Promise.all([
    getAdminCompanies(),
    getFinancialCategories(),
    getBankAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Administração de Cadastros</h1>
        <p className="mt-1 text-sm text-gray-400">
          Gestão de empresas, categorias financeiras e contas bancárias — com busca, filtros e normalização de duplicatas.
        </p>
      </div>

      <AdminClient
        initialCompanies={companies}
        initialCategories={categories}
        initialBankAccounts={bankAccounts}
      />
    </div>
  );
}
