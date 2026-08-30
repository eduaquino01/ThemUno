'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope, requireCompanyAccess } from '@/lib/auth';

const QuerySchema = z.object({ company_id: z.string().uuid().or(z.literal('ALL')), year: z.number().int().min(2020).max(2100) });
const BudgetSchema = z.object({
  company_id: z.string().uuid(), cost_center_id: z.string().uuid(), category_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12), planned_amount: z.number().finite().min(0).max(1_000_000_000),
});
const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function getBudgetOverview(input: unknown) {
  const data = QuerySchema.parse(input);
  const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id);
  const companyWhere = companyIds === null ? {} : { company_id: { in: companyIds } };
  const start = new Date(`${data.year}-01-01T00:00:00.000Z`);
  const end = new Date(`${data.year + 1}-01-01T00:00:00.000Z`);
  const [budgets, actualEntries, allocatedEntries, unallocated, setup] = await Promise.all([
    prisma.costCenterBudget.findMany({ where: { ...companyWhere, year: data.year }, include: { company: { select: { name: true } }, cost_center: { select: { code: true, name: true } }, category: { select: { name: true } } } }),
    prisma.financialEntry.findMany({ where: { ...companyWhere, nature: 'EXPENSE', scenario: 'ACTUAL', deleted_at: null, is_internal_transfer: false, cost_center_id: { not: null }, period_start: { gte: start, lt: end } }, select: { company_id: true, cost_center_id: true, category_id: true, period_start: true, amount: true } }),
    prisma.financialAllocation.findMany({ where: { ...companyWhere, financial_entry: { nature: 'EXPENSE', scenario: 'ACTUAL', deleted_at: null, is_internal_transfer: false, period_start: { gte: start, lt: end } } }, select: { company_id: true, cost_center_id: true, allocated_amount: true, cost_center: { select: { code: true, name: true } }, company: { select: { name: true } }, financial_entry: { select: { category_id: true, period_start: true, category: { select: { name: true } } } } } }),
    prisma.financialEntry.aggregate({ where: { ...companyWhere, nature: 'EXPENSE', scenario: 'ACTUAL', deleted_at: null, is_internal_transfer: false, cost_center_id: null, allocations: { none: {} }, period_start: { gte: start, lt: end } }, _sum: { amount: true } }),
    data.company_id === 'ALL' ? Promise.resolve(null) : getBudgetSetup(data.company_id),
  ]);

  type Row = { key: string; company: string; costCenter: string; category: string; month: number; planned: number; actual: number };
  const rows = new Map<string, Row>();
  for (const budget of budgets) {
    const key = `${budget.company_id}:${budget.cost_center_id}:${budget.category_id}:${budget.month}`;
    rows.set(key, { key, company: budget.company.name, costCenter: `${budget.cost_center.code} — ${budget.cost_center.name}`, category: budget.category.name, month: budget.month, planned: Number(budget.planned_amount), actual: 0 });
  }
  for (const allocation of allocatedEntries) {
    const month = allocation.financial_entry.period_start.getUTCMonth() + 1;
    const key = `${allocation.company_id}:${allocation.cost_center_id}:${allocation.financial_entry.category_id}:${month}`;
    if (!rows.has(key)) rows.set(key, { key, company: allocation.company.name, costCenter: `${allocation.cost_center.code} — ${allocation.cost_center.name}`, category: allocation.financial_entry.category.name, month, planned: 0, actual: 0 });
    rows.get(key)!.actual += Number(allocation.allocated_amount);
  }
  const missingKeys = new Set(actualEntries.map((entry) => `${entry.company_id}:${entry.cost_center_id}:${entry.category_id}:${entry.period_start.getUTCMonth() + 1}`).filter((key) => !rows.has(key)));
  if (missingKeys.size) {
    const dimensions = await prisma.financialEntry.findMany({
      where: { ...companyWhere, nature: 'EXPENSE', scenario: 'ACTUAL', deleted_at: null, cost_center_id: { not: null }, period_start: { gte: start, lt: end } },
      distinct: ['company_id', 'cost_center_id', 'category_id'],
      select: { company_id: true, cost_center_id: true, category_id: true, company: { select: { name: true } }, cost_center: { select: { code: true, name: true } }, category: { select: { name: true } } },
    });
    const dimensionMap = new Map(dimensions.map((item) => [`${item.company_id}:${item.cost_center_id}:${item.category_id}`, item]));
    for (const key of missingKeys) {
      const parts = key.split(':'); const dimension = dimensionMap.get(parts.slice(0, 3).join(':')); if (!dimension?.cost_center) continue;
      rows.set(key, { key, company: dimension.company.name, costCenter: `${dimension.cost_center.code} — ${dimension.cost_center.name}`, category: dimension.category.name, month: Number(parts[3]), planned: 0, actual: 0 });
    }
  }
  for (const entry of actualEntries) {
    const key = `${entry.company_id}:${entry.cost_center_id}:${entry.category_id}:${entry.period_start.getUTCMonth() + 1}`;
    const row = rows.get(key); if (row) row.actual += Number(entry.amount);
  }

  const monthly = monthLabels.map((label, index) => ({ month: index + 1, label, planned: 0, actual: 0 }));
  for (const row of rows.values()) { monthly[row.month - 1].planned += row.planned; monthly[row.month - 1].actual += row.actual; }
  const resultRows = Array.from(rows.values()).map((row) => ({ ...row, usage: row.planned > 0 ? row.actual / row.planned * 100 : row.actual > 0 ? 999 : 0, status: row.actual > row.planned ? 'EXCEEDED' : row.planned > 0 && row.actual / row.planned >= 0.8 ? 'WARNING' : 'HEALTHY' })).sort((a, b) => b.usage - a.usage);
  const totals = monthly.reduce((total, month) => ({ planned: total.planned + month.planned, actual: total.actual + month.actual }), { planned: 0, actual: 0 });
  return { year: data.year, rows: resultRows, monthly, totals: { ...totals, available: totals.planned - totals.actual, unallocated: Number(unallocated._sum.amount || 0), exceeded: resultRows.filter((row) => row.status === 'EXCEEDED').length, warning: resultRows.filter((row) => row.status === 'WARNING').length }, setup };
}

async function getBudgetSetup(companyId: string) {
  await requireCompanyAccess(companyId, 'view');
  const [costCenters, categories] = await Promise.all([
    prisma.costCenter.findMany({ where: { company_id: companyId, is_active: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.financialCategory.findMany({ where: { company_id: companyId, nature: 'EXPENSE', is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return { costCenters, categories };
}

export async function saveCostCenterBudget(input: unknown) {
  const data = BudgetSchema.parse(input);
  const actor = await requireCompanyAccess(data.company_id, 'edit');
  const [center, category] = await Promise.all([
    prisma.costCenter.findFirst({ where: { id: data.cost_center_id, company_id: data.company_id, is_active: true } }),
    prisma.financialCategory.findFirst({ where: { id: data.category_id, company_id: data.company_id, nature: 'EXPENSE', is_active: true } }),
  ]);
  if (!center) throw new Error('Centro de custo inválido.');
  if (!category) throw new Error('Categoria de despesa inválida.');
  const budget = await prisma.$transaction(async (tx) => {
    const saved = await tx.costCenterBudget.upsert({
      where: { company_id_cost_center_id_category_id_year_month: { company_id: data.company_id, cost_center_id: data.cost_center_id, category_id: data.category_id, year: data.year, month: data.month } },
      create: { ...data, created_by_id: actor.id }, update: { planned_amount: data.planned_amount },
    });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: data.company_id, module: 'FINANCE', entity_type: 'CostCenterBudget', entity_id: saved.id, action: 'UPSERT_BUDGET', new_values: JSON.stringify({ cost_center_id: data.cost_center_id, category_id: data.category_id, year: data.year, month: data.month, planned_amount: data.planned_amount }) } });
    return saved;
  });
  revalidatePath('/finance/budgets'); revalidatePath('/finance'); return { id: budget.id };
}
