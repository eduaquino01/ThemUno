'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const ImportRowSchema = z.object({
  period_start: z.string().min(10),
  period_end: z.string().min(10),
  scenario: z.enum(['PLANNED', 'ACTUAL']),
  nature: z.enum(['REVENUE', 'EXPENSE']),
  category: z.string().min(1).max(120),
  account: z.string().min(1).max(220),
  amount: z.number().finite().nonnegative(),
  is_internal_transfer: z.boolean().default(false),
  description: z.string().max(2000).optional(),
  document_number: z.string().max(120).optional(),
  due_date: z.string().min(10).optional(),
  settlement_date: z.string().min(10).optional(),
  source_ref: z.string().max(180).optional(),
});

const ImportSchema = z.object({
  company_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  source_key: z.string().min(3).max(180),
  rows: z.array(ImportRowSchema).min(1).max(10000),
  replace_existing: z.boolean().default(false),
});

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function getFinanceDashboard(companyId: string | 'ALL' = 'ALL', year = new Date().getFullYear()) {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const where = {
    ...(companyId !== 'ALL' ? { company_id: companyId } : {}),
    period_start: { gte: start, lt: end },
  };
  const [entries, accounts, imports] = await Promise.all([
    prisma.financialEntry.findMany({
      where,
      include: { category: true, company: { select: { id: true, name: true, color: true } } },
      orderBy: [{ period_start: 'asc' }, { account_name: 'asc' }],
    }),
    prisma.bankAccount.findMany({
      where: companyId !== 'ALL' ? { company_id: companyId, is_active: true } : { is_active: true },
    }),
    prisma.financialImport.findMany({
      where: companyId !== 'ALL' ? { company_id: companyId } : {},
      orderBy: { created_at: 'desc' },
      take: 8,
    }),
  ]);

  const monthly = monthLabels.map((label, index) => ({
    month: index + 1,
    label,
    plannedRevenue: 0,
    actualRevenue: 0,
    plannedExpense: 0,
    actualExpense: 0,
  }));
  const categoryMap = new Map<string, { name: string; nature: string; planned: number; actual: number }>();
  const accountMap = new Map<string, { account: string; category: string; nature: string; planned: number; actual: number }>();

  for (const entry of entries) {
    if (entry.is_internal_transfer) continue;
    const amount = Number(entry.amount);
    const month = entry.period_start.getUTCMonth();
    const scenario = entry.scenario === 'ACTUAL' ? 'actual' : 'planned';
    const nature = entry.nature === 'REVENUE' ? 'Revenue' : 'Expense';
    const monthlyKey = `${scenario}${nature}` as 'plannedRevenue' | 'actualRevenue' | 'plannedExpense' | 'actualExpense';
    monthly[month][monthlyKey] += amount;

    const categoryKey = `${entry.nature}:${entry.category.name}`;
    const category = categoryMap.get(categoryKey) || { name: entry.category.name, nature: entry.nature, planned: 0, actual: 0 };
    category[scenario] += amount;
    categoryMap.set(categoryKey, category);

    const accountKey = `${entry.nature}:${entry.category.name}:${entry.account_name}`;
    const account = accountMap.get(accountKey) || {
      account: entry.account_name,
      category: entry.category.name,
      nature: entry.nature,
      planned: 0,
      actual: 0,
    };
    account[scenario] += amount;
    accountMap.set(accountKey, account);
  }

  const totals = monthly.reduce((acc, month) => ({
    plannedRevenue: acc.plannedRevenue + month.plannedRevenue,
    actualRevenue: acc.actualRevenue + month.actualRevenue,
    plannedExpense: acc.plannedExpense + month.plannedExpense,
    actualExpense: acc.actualExpense + month.actualExpense,
  }), { plannedRevenue: 0, actualRevenue: 0, plannedExpense: 0, actualExpense: 0 });
  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.opening_balance), 0);

  return {
    year,
    companyId,
    monthly,
    totals: {
      ...totals,
      plannedResult: totals.plannedRevenue - totals.plannedExpense,
      actualResult: totals.actualRevenue - totals.actualExpense,
      openingBalance,
      currentBalance: openingBalance + totals.actualRevenue - totals.actualExpense,
    },
    categories: Array.from(categoryMap.values()).sort((a, b) => b.actual - a.actual),
    accounts: Array.from(accountMap.values()).sort((a, b) => b.actual - a.actual),
    entries: entries.map((entry) => ({
      id: entry.id,
      company: entry.company.name,
      company_id: entry.company_id,
      period_start: entry.period_start.toISOString(),
      period_end: entry.period_end.toISOString(),
      scenario: entry.scenario,
      nature: entry.nature,
      category: entry.category.name,
      account: entry.account_name,
      amount: Number(entry.amount),
      is_internal_transfer: entry.is_internal_transfer,
      is_reconciled: entry.is_reconciled,
      bank_account_id: entry.bank_account_id,
    })),
    bankAccounts: accounts.map((account) => ({
      id: account.id,
      company_id: account.company_id,
      bank_name: account.bank_name,
      account_number: account.account_number,
    })),
    imports: imports.map((item) => ({
      ...item,
      created_at: item.created_at.toISOString(),
    })),
  };
}

export async function importFinancialPlan(input: unknown) {
  const data = ImportSchema.parse(input);
  const existing = await prisma.financialImport.findUnique({
    where: { company_id_source_key: { company_id: data.company_id, source_key: data.source_key } },
  });
  if (existing && !data.replace_existing) {
    throw new Error('Esta versão da planilha já foi importada. Marque “substituir” para reprocessá-la.');
  }

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.financialEntry.deleteMany({ where: { import_id: existing.id } });
      await tx.financialImport.delete({ where: { id: existing.id } });
    }
    const batch = await tx.financialImport.create({
      data: {
        company_id: data.company_id,
        file_name: data.file_name,
        source_key: data.source_key,
        status: 'PROCESSING',
      },
    });
    const categoryKeys = Array.from(new Set(data.rows.map((row) => `${row.nature}::${row.category}`)));
    for (const [sortOrder, key] of categoryKeys.entries()) {
      const [nature, name] = key.split('::');
      await tx.financialCategory.upsert({
        where: { company_id_nature_name: { company_id: data.company_id, nature: nature as 'REVENUE' | 'EXPENSE', name } },
        create: { company_id: data.company_id, nature: nature as 'REVENUE' | 'EXPENSE', name, sort_order: sortOrder },
        update: { is_active: true },
      });
    }
    const categories = await tx.financialCategory.findMany({ where: { company_id: data.company_id } });
    const categoryByKey = new Map(categories.map((item) => [`${item.nature}::${item.name}`, item.id]));
    const suppliedRefs = data.rows.flatMap((row) => row.source_ref ? [row.source_ref] : []);
    const existingRefs = suppliedRefs.length ? await tx.financialEntry.findMany({
      where: { company_id: data.company_id, source_ref: { in: suppliedRefs } },
      select: { source_ref: true },
    }) : [];
    const knownRefs = new Set(existingRefs.flatMap((item) => item.source_ref ? [item.source_ref] : []));
    const incomingRefs = new Set<string>();
    const newRows = data.rows.filter((row) => {
      if (!row.source_ref) return true;
      if (knownRefs.has(row.source_ref) || incomingRefs.has(row.source_ref)) return false;
      incomingRefs.add(row.source_ref);
      return true;
    });
    await tx.financialEntry.createMany({
      data: newRows.map((row, index) => ({
        company_id: data.company_id,
        category_id: categoryByKey.get(`${row.nature}::${row.category}`)!,
        import_id: batch.id,
        scenario: row.scenario,
        nature: row.nature,
        account_name: row.account,
        description: row.description,
        document_number: row.document_number,
        period_start: new Date(`${row.period_start}T12:00:00.000Z`),
        period_end: new Date(`${row.period_end}T12:00:00.000Z`),
        due_date: row.due_date ? new Date(`${row.due_date}T12:00:00.000Z`) : null,
        settlement_date: row.settlement_date ? new Date(`${row.settlement_date}T12:00:00.000Z`) : null,
        amount: row.amount,
        is_internal_transfer: row.is_internal_transfer,
        is_reconciled: row.scenario === 'ACTUAL',
        source: row.source_ref?.startsWith('SANKHYA:') ? 'SANKHYA_EXCEL' : 'EXCEL',
        source_ref: row.source_ref || `${data.source_key}:${index + 1}`,
      })),
    });
    return tx.financialImport.update({
      where: { id: batch.id },
      data: {
        status: newRows.length < data.rows.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED',
        imported_rows: newRows.length,
        ignored_rows: data.rows.length - newRows.length,
        notes: newRows.length < data.rows.length ? 'Registros duplicados foram ignorados.' : null,
      },
    });
  });
  revalidatePath('/finance');
  return { id: result.id, imported_rows: result.imported_rows, ignored_rows: result.ignored_rows };
}
