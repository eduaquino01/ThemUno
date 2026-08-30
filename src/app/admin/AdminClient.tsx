'use client';

import { useState } from 'react';
import { Building2, FolderTree, Landmark } from 'lucide-react';
import type {
  getAdminCompanies,
  getBankAccounts,
  getFinancialCategories,
} from './actions';
import CompaniesPanel from './_components/CompaniesPanel';
import CategoriesPanel from './_components/CategoriesPanel';
import BankAccountsPanel from './_components/BankAccountsPanel';

export type AdminCompany = Awaited<ReturnType<typeof getAdminCompanies>>[number];
export type AdminCategory = Awaited<ReturnType<typeof getFinancialCategories>>[number];
export type AdminBankAccount = Awaited<ReturnType<typeof getBankAccounts>>[number];

type Tab = 'empresas' | 'categorias' | 'contas';

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'empresas', label: 'Empresas', icon: Building2 },
  { id: 'categorias', label: 'Categorias financeiras', icon: FolderTree },
  { id: 'contas', label: 'Contas bancárias', icon: Landmark },
];

export default function AdminClient({
  initialCompanies,
  initialCategories,
  initialBankAccounts,
}: {
  initialCompanies: AdminCompany[];
  initialCategories: AdminCategory[];
  initialBankAccounts: AdminBankAccount[];
}) {
  const [tab, setTab] = useState<Tab>('empresas');

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[#1e293b] bg-[#0d1527] p-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === 'empresas' && <CompaniesPanel initialCompanies={initialCompanies} />}
      {tab === 'categorias' && <CategoriesPanel initialCategories={initialCategories} />}
      {tab === 'contas' && (
        <BankAccountsPanel initialBankAccounts={initialBankAccounts} companies={initialCompanies} />
      )}
    </div>
  );
}
