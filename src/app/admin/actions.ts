'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  BankAccountSchema,
  BankAccountUpdateSchema,
  CompanyUpdateSchema,
  FinancialCategoryUpdateSchema,
  MergeCategoriesSchema,
} from '@/lib/schemas';

// Revalida todas as telas que consomem os cadastros mestres depois de uma
// alteração (empresas alimentam seletores em quase todo lugar).
function revalidateAdminSurfaces() {
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/contracts');
  revalidatePath('/finance');
  revalidatePath('/governance');
  revalidatePath('/billing');
}

function iso(value: Date | null | undefined) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

// ==========================================
// EMPRESAS
// ==========================================

export async function getAdminCompanies() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            contracts: true,
            bank_accounts: true,
            financial_categories: true,
            financial_entries: true,
          },
        },
      },
    });
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      code: company.code,
      tax_id: company.tax_id,
      color: company.color,
      is_holding: company.is_holding,
      is_active: company.is_active,
      created_at: iso(company.created_at),
      updated_at: iso(company.updated_at),
      counts: company._count,
    }));
  } catch (error) {
    console.error('Error in getAdminCompanies:', error);
    return [];
  }
}

export async function updateCompany(id: string, data: unknown) {
  try {
    const validated = CompanyUpdateSchema.parse(data);
    const updated = await prisma.company.update({ where: { id }, data: validated });
    revalidateAdminSurfaces();
    return { id: updated.id };
  } catch (error: any) {
    console.error('Error in updateCompany:', error);
    if (error?.code === 'P2002') {
      throw new Error('Já existe uma empresa com esse código.');
    }
    throw new Error(error?.message || 'Erro ao atualizar empresa.');
  }
}

export async function setCompanyActive(id: string, isActive: boolean) {
  try {
    await prisma.company.update({ where: { id }, data: { is_active: isActive } });
    revalidateAdminSurfaces();
    return { id, is_active: isActive };
  } catch (error: any) {
    console.error('Error in setCompanyActive:', error);
    throw new Error(error?.message || 'Erro ao alterar o status da empresa.');
  }
}

// ==========================================
// CATEGORIAS FINANCEIRAS
// ==========================================

export async function getFinancialCategories(companyId?: string) {
  try {
    const categories = await prisma.financialCategory.findMany({
      where: companyId && companyId !== 'ALL' ? { company_id: companyId } : {},
      orderBy: [{ company_id: 'asc' }, { nature: 'asc' }, { sort_order: 'asc' }, { name: 'asc' }],
      include: {
        company: { select: { id: true, name: true, color: true } },
        _count: { select: { entries: true } },
      },
    });
    return categories.map((category) => ({
      id: category.id,
      company_id: category.company_id,
      company_name: category.company.name,
      company_color: category.company.color,
      name: category.name,
      nature: category.nature,
      sort_order: category.sort_order,
      is_active: category.is_active,
      entry_count: category._count.entries,
    }));
  } catch (error) {
    console.error('Error in getFinancialCategories:', error);
    return [];
  }
}

export async function updateFinancialCategory(id: string, data: unknown) {
  try {
    const validated = FinancialCategoryUpdateSchema.parse(data);
    if (Object.keys(validated).length === 0) {
      throw new Error('Nada para atualizar.');
    }
    await prisma.financialCategory.update({ where: { id }, data: validated });
    revalidatePath('/admin');
    revalidatePath('/finance');
    return { id };
  } catch (error: any) {
    console.error('Error in updateFinancialCategory:', error);
    if (error?.code === 'P2002') {
      throw new Error('Já existe uma categoria com esse nome nessa empresa e natureza.');
    }
    throw new Error(error?.message || 'Erro ao atualizar categoria.');
  }
}

// Une categorias equivalentes numa só: realoca os lançamentos das categorias
// de origem para a categoria-alvo e apaga as de origem. A realocação é
// obrigatória porque FinancialEntry.category_id é ON DELETE RESTRICT — apagar
// uma categoria com lançamentos falharia no banco.
export async function mergeFinancialCategories(input: unknown) {
  const { targetId, sourceIds } = MergeCategoriesSchema.parse(input);
  const uniqueSources = [...new Set(sourceIds)].filter((sourceId) => sourceId !== targetId);
  if (uniqueSources.length === 0) {
    throw new Error('Selecione ao menos uma categoria de origem diferente da categoria-alvo.');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.financialCategory.findUnique({ where: { id: targetId } });
      if (!target) throw new Error('Categoria-alvo não encontrada.');

      const sources = await tx.financialCategory.findMany({ where: { id: { in: uniqueSources } } });
      if (sources.length !== uniqueSources.length) {
        throw new Error('Uma ou mais categorias de origem não foram encontradas.');
      }
      const incompatible = sources.find(
        (source) => source.company_id !== target.company_id || source.nature !== target.nature,
      );
      if (incompatible) {
        throw new Error('Só é possível unir categorias da mesma empresa e mesma natureza (receita ou despesa).');
      }

      const moved = await tx.financialEntry.updateMany({
        where: { category_id: { in: uniqueSources } },
        data: { category_id: targetId },
      });
      const removed = await tx.financialCategory.deleteMany({ where: { id: { in: uniqueSources } } });
      return { movedEntries: moved.count, removedCategories: removed.count };
    });

    revalidatePath('/admin');
    revalidatePath('/finance');
    return result;
  } catch (error: any) {
    console.error('Error in mergeFinancialCategories:', error);
    throw new Error(error?.message || 'Erro ao unir categorias.');
  }
}

// ==========================================
// CONTAS BANCÁRIAS
// ==========================================

export async function getBankAccounts(companyId?: string) {
  try {
    const accounts = await prisma.bankAccount.findMany({
      where: companyId && companyId !== 'ALL' ? { company_id: companyId } : {},
      orderBy: [{ is_active: 'desc' }, { bank_name: 'asc' }],
      include: {
        company: { select: { id: true, name: true, color: true } },
        _count: { select: { entries: true } },
      },
    });
    return accounts.map((account) => ({
      id: account.id,
      company_id: account.company_id,
      company_name: account.company.name,
      company_color: account.company.color,
      bank_name: account.bank_name,
      branch: account.branch,
      account_number: account.account_number,
      opening_balance: Number(account.opening_balance),
      is_active: account.is_active,
      entry_count: account._count.entries,
      created_at: iso(account.created_at),
      updated_at: iso(account.updated_at),
    }));
  } catch (error) {
    console.error('Error in getBankAccounts:', error);
    return [];
  }
}

export async function createBankAccount(data: unknown) {
  try {
    const validated = BankAccountSchema.parse(data);
    const created = await prisma.bankAccount.create({ data: validated });
    revalidatePath('/admin');
    revalidatePath('/finance');
    return { id: created.id };
  } catch (error: any) {
    console.error('Error in createBankAccount:', error);
    throw new Error(error?.message || 'Erro ao cadastrar conta bancária.');
  }
}

export async function updateBankAccount(id: string, data: unknown) {
  try {
    const validated = BankAccountUpdateSchema.parse(data);
    if (Object.keys(validated).length === 0) {
      throw new Error('Nada para atualizar.');
    }
    await prisma.bankAccount.update({ where: { id }, data: validated });
    revalidatePath('/admin');
    revalidatePath('/finance');
    return { id };
  } catch (error: any) {
    console.error('Error in updateBankAccount:', error);
    throw new Error(error?.message || 'Erro ao atualizar conta bancária.');
  }
}

export async function setBankAccountActive(id: string, isActive: boolean) {
  try {
    await prisma.bankAccount.update({ where: { id }, data: { is_active: isActive } });
    revalidatePath('/admin');
    revalidatePath('/finance');
    return { id, is_active: isActive };
  } catch (error: any) {
    console.error('Error in setBankAccountActive:', error);
    throw new Error(error?.message || 'Erro ao alterar o status da conta.');
  }
}

// Vincula (ou desvincula, com null) um lançamento a uma conta bancária.
// Garante que a conta pertence à mesma empresa do lançamento.
export async function setEntryBankAccount(entryId: string, bankAccountId: string | null) {
  try {
    const entry = await prisma.financialEntry.findUnique({
      where: { id: entryId },
      select: { company_id: true },
    });
    if (!entry) throw new Error('Lançamento não encontrado.');

    if (bankAccountId) {
      const account = await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
        select: { company_id: true },
      });
      if (!account || account.company_id !== entry.company_id) {
        throw new Error('A conta selecionada não pertence à empresa deste lançamento.');
      }
    }

    await prisma.financialEntry.update({
      where: { id: entryId },
      data: { bank_account_id: bankAccountId },
    });
    revalidatePath('/finance');
    return { id: entryId, bank_account_id: bankAccountId };
  } catch (error: any) {
    console.error('Error in setEntryBankAccount:', error);
    throw new Error(error?.message || 'Erro ao vincular a conta ao lançamento.');
  }
}
