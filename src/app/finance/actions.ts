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
});

const ImportSchema = z.object({
  company_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  source_key: z.string().min(3).max(180),
  rows: z.array(ImportRowSchema).min(1).max(10000),
});

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type ImportRow = z.infer<typeof ImportRowSchema>;

function normalizeIdentityPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function entryIdentity(row: Pick<ImportRow, 'period_start' | 'period_end' | 'scenario' | 'nature' | 'category' | 'account'>) {
  return [
    row.period_start,
    row.period_end,
    row.scenario,
    row.nature,
    normalizeIdentityPart(row.category),
    normalizeIdentityPart(row.account),
  ].join('::');
}

export async function getFinanceDashboard(companyId: string | 'ALL' = 'ALL', year = 2026) {
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
      period_start: entry.period_start.toISOString(),
      period_end: entry.period_end.toISOString(),
      scenario: entry.scenario,
      nature: entry.nature,
      category: entry.category.name,
      account: entry.account_name,
      amount: Number(entry.amount),
      is_internal_transfer: entry.is_internal_transfer,
      is_reconciled: entry.is_reconciled,
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
  if (existing) {
    return {
      id: existing.id,
      imported_rows: 0,
      updated_rows: 0,
      ignored_rows: data.rows.length,
      warning_rows: existing.warning_rows,
      duplicate_file: true,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
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

    const currentEntries = await tx.financialEntry.findMany({
      where: { company_id: data.company_id },
      include: { category: { select: { name: true } } },
      orderBy: { created_at: 'asc' },
    });
    const currentByIdentity = new Map<string, (typeof currentEntries)[number]>();
    let legacyDuplicateRows = 0;
    for (const entry of currentEntries) {
      const identity = entryIdentity({
        period_start: entry.period_start.toISOString().slice(0, 10),
        period_end: entry.period_end.toISOString().slice(0, 10),
        scenario: entry.scenario,
        nature: entry.nature,
        category: entry.category.name,
        account: entry.account_name,
      });
      if (currentByIdentity.has(identity)) legacyDuplicateRows += 1;
      else currentByIdentity.set(identity, entry);
    }

    const uniqueRows = new Map<string, { row: ImportRow; sourceIndex: number }>();
    let duplicateInputRows = 0;
    data.rows.forEach((row, index) => {
      const identity = entryIdentity(row);
      if (uniqueRows.has(identity)) duplicateInputRows += 1;
      uniqueRows.set(identity, { row, sourceIndex: index + 1 });
    });

    const rowsToCreate = [];
    let updatedRows = 0;
    let ignoredRows = duplicateInputRows;
    for (const [identity, { row, sourceIndex }] of uniqueRows) {
      const current = currentByIdentity.get(identity);
      const categoryId = categoryByKey.get(`${row.nature}::${row.category}`)!;
      if (!current) {
        rowsToCreate.push({
        company_id: data.company_id,
          category_id: categoryId,
        import_id: batch.id,
        scenario: row.scenario,
        nature: row.nature,
        account_name: row.account,
        period_start: new Date(`${row.period_start}T12:00:00.000Z`),
        period_end: new Date(`${row.period_end}T12:00:00.000Z`),
        amount: row.amount,
        is_internal_transfer: row.is_internal_transfer,
        is_reconciled: row.scenario === 'ACTUAL',
        source: 'EXCEL',
          source_ref: `${data.source_key}:${sourceIndex}`,
        });
        continue;
      }

      const amountChanged = Math.round(Number(current.amount) * 100) !== Math.round(row.amount * 100);
      const metadataChanged = current.is_internal_transfer !== row.is_internal_transfer
        || current.is_reconciled !== (row.scenario === 'ACTUAL')
        || current.category_id !== categoryId;
      if (!amountChanged && !metadataChanged) {
        ignoredRows += 1;
        continue;
      }

      await tx.financialEntry.update({
        where: { id: current.id },
        data: {
          category_id: categoryId,
          import_id: batch.id,
          account_name: row.account,
          amount: row.amount,
          is_internal_transfer: row.is_internal_transfer,
          is_reconciled: row.scenario === 'ACTUAL',
          source: 'EXCEL',
          source_ref: `${data.source_key}:${sourceIndex}`,
        },
      });
      updatedRows += 1;
    }

    if (rowsToCreate.length) {
      await tx.financialEntry.createMany({ data: rowsToCreate });
    }
    const warningRows = duplicateInputRows + legacyDuplicateRows;
    return tx.financialImport.update({
      where: { id: batch.id },
      data: {
        status: warningRows ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED',
        imported_rows: rowsToCreate.length,
        updated_rows: updatedRows,
        ignored_rows: ignoredRows,
        warning_rows: warningRows,
        notes: warningRows
          ? `${duplicateInputRows} linha(s) repetida(s) no arquivo; ${legacyDuplicateRows} duplicidade(s) anterior(es) preservada(s).`
          : null,
      },
    });
  });
  revalidatePath('/finance');
  return {
    id: result.id,
    imported_rows: result.imported_rows,
    updated_rows: result.updated_rows,
    ignored_rows: result.ignored_rows,
    warning_rows: result.warning_rows,
    duplicate_file: false,
  };
}
