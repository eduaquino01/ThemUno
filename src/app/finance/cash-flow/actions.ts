'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope } from '@/lib/auth';

const QuerySchema = z.object({
  company_id: z.string().uuid().or(z.literal('ALL')),
  year: z.number().int().min(2020).max(2100),
});

const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function getCashFlowProjection(input: unknown) {
  const data = QuerySchema.parse(input);
  const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id);
  const start = new Date(`${data.year}-01-01T00:00:00.000Z`);
  const end = new Date(`${data.year + 1}-01-01T00:00:00.000Z`);
  const companyWhere = companyIds === null ? {} : { company_id: { in: companyIds } };

  const [entries, accounts] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        ...companyWhere,
        deleted_at: null,
        is_internal_transfer: false,
        approval_status: { not: 'REJECTED' },
        OR: [
          { due_date: { gte: start, lt: end } },
          { settlement_date: { gte: start, lt: end } },
        ],
      },
      select: {
        nature: true, amount: true, settlement_status: true, approval_status: true,
        due_date: true, settlement_date: true,
      },
    }),
    prisma.bankAccount.findMany({
      where: { ...companyWhere, is_active: true },
      select: { id: true, bank_name: true, account_number: true, opening_balance: true, company: { select: { name: true } } },
      orderBy: [{ company: { name: 'asc' } }, { bank_name: 'asc' }],
    }),
  ]);

  const months = labels.map((label, index) => ({
    month: index + 1, label, actualIn: 0, actualOut: 0, projectedIn: 0, projectedOut: 0,
    openingBalance: 0, closingBalance: 0,
  }));

  let overdueIn = 0;
  let overdueOut = 0;
  let pendingApproval = 0;
  const today = new Date();

  for (const entry of entries) {
    const amount = Number(entry.amount);
    const settled = entry.settlement_status === 'SETTLED';
    const referenceDate = settled ? entry.settlement_date || entry.due_date : entry.due_date;
    if (!referenceDate || referenceDate < start || referenceDate >= end) continue;
    const month = months[referenceDate.getUTCMonth()];
    if (settled) {
      if (entry.nature === 'REVENUE') month.actualIn += amount;
      else month.actualOut += amount;
    } else {
      if (entry.nature === 'REVENUE') month.projectedIn += amount;
      else month.projectedOut += amount;
      if (entry.approval_status === 'PENDING') pendingApproval += amount;
      if (entry.due_date && entry.due_date < today) {
        if (entry.nature === 'REVENUE') overdueIn += amount;
        else overdueOut += amount;
      }
    }
  }

  const openingBalance = accounts.reduce((sum, account) => sum + Number(account.opening_balance), 0);
  let runningBalance = openingBalance;
  for (const month of months) {
    month.openingBalance = runningBalance;
    runningBalance += month.actualIn + month.projectedIn - month.actualOut - month.projectedOut;
    month.closingBalance = runningBalance;
  }

  const totals = months.reduce((result, month) => ({
    actualIn: result.actualIn + month.actualIn,
    actualOut: result.actualOut + month.actualOut,
    projectedIn: result.projectedIn + month.projectedIn,
    projectedOut: result.projectedOut + month.projectedOut,
  }), { actualIn: 0, actualOut: 0, projectedIn: 0, projectedOut: 0 });

  return {
    year: data.year,
    months,
    totals: { ...totals, openingBalance, projectedClosingBalance: runningBalance, overdueIn, overdueOut, pendingApproval },
    accounts: accounts.map((account) => ({ ...account, opening_balance: Number(account.opening_balance) })),
  };
}
