'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope, requireCompanyAccess } from '@/lib/auth';
import { distributeAmount } from '@/lib/finance-calculations';

const QuerySchema = z.object({ company_id: z.string().uuid().or(z.literal('ALL')) });
const RuleSchema = z.object({
  company_id: z.string().uuid(), name: z.string().trim().min(3).max(120),
  category_id: z.string().uuid().optional().nullable(), account_contains: z.string().trim().max(160).optional().nullable(),
  items: z.array(z.object({ cost_center_id: z.string().uuid(), percentage: z.number().positive().max(100) })).min(1).max(10),
}).superRefine((data, context) => {
  if (!data.category_id && !data.account_contains) context.addIssue({ code: 'custom', path: ['category_id'], message: 'Informe uma categoria ou texto de correspondência.' });
  if (new Set(data.items.map((item) => item.cost_center_id)).size !== data.items.length) context.addIssue({ code: 'custom', path: ['items'], message: 'Não repita centros de custo.' });
  const total = data.items.reduce((sum, item) => sum + item.percentage, 0);
  if (Math.abs(total - 100) > 0.001) context.addIssue({ code: 'custom', path: ['items'], message: 'Os percentuais devem totalizar 100%.' });
});

export async function getAllocationOverview(input: unknown) {
  const data = QuerySchema.parse(input);
  const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id);
  const companyWhere = companyIds === null ? {} : { company_id: { in: companyIds } };
  const [rules, unallocated, allocated, setup] = await Promise.all([
    prisma.allocationRule.findMany({ where: companyWhere, include: { company: { select: { name: true } }, category: { select: { name: true } }, items: { include: { cost_center: { select: { code: true, name: true } } }, orderBy: { percentage: 'desc' } }, _count: { select: { allocations: true } } }, orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }] }),
    prisma.financialEntry.aggregate({ where: { ...companyWhere, nature: 'EXPENSE', deleted_at: null, cost_center_id: null, allocations: { none: {} } }, _count: { id: true }, _sum: { amount: true } }),
    prisma.financialAllocation.aggregate({ where: companyWhere, _count: { id: true }, _sum: { allocated_amount: true } }),
    data.company_id === 'ALL' ? Promise.resolve(null) : getAllocationSetup(data.company_id),
  ]);
  return {
    rules: rules.map((rule) => ({ ...rule, created_at: rule.created_at.toISOString(), updated_at: rule.updated_at.toISOString(), items: rule.items.map((item) => ({ ...item, percentage: Number(item.percentage), created_at: item.created_at.toISOString() })) })),
    totals: { unallocatedCount: unallocated._count.id, unallocatedAmount: Number(unallocated._sum.amount || 0), allocationCount: allocated._count.id, allocatedAmount: Number(allocated._sum.allocated_amount || 0) },
    setup,
  };
}

async function getAllocationSetup(companyId: string) {
  await requireCompanyAccess(companyId, 'view');
  const [costCenters, categories] = await Promise.all([
    prisma.costCenter.findMany({ where: { company_id: companyId, is_active: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.financialCategory.findMany({ where: { company_id: companyId, nature: 'EXPENSE', is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  return { costCenters, categories };
}

export async function createAllocationRule(input: unknown) {
  const data = RuleSchema.parse(input);
  const actor = await requireCompanyAccess(data.company_id, 'edit');
  const [category, centers] = await Promise.all([
    data.category_id ? prisma.financialCategory.findFirst({ where: { id: data.category_id, company_id: data.company_id, nature: 'EXPENSE', is_active: true } }) : null,
    prisma.costCenter.findMany({ where: { id: { in: data.items.map((item) => item.cost_center_id) }, company_id: data.company_id, is_active: true }, select: { id: true } }),
  ]);
  if (data.category_id && !category) throw new Error('Categoria inválida para a empresa.');
  if (centers.length !== data.items.length) throw new Error('Um ou mais centros de custo são inválidos.');
  const rule = await prisma.$transaction(async (tx) => {
    const created = await tx.allocationRule.create({ data: { company_id: data.company_id, name: data.name, category_id: data.category_id || null, account_contains: data.account_contains || null, created_by_id: actor.id, items: { create: data.items } } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: data.company_id, module: 'FINANCE', entity_type: 'AllocationRule', entity_id: created.id, action: 'CREATE_ALLOCATION_RULE', new_values: JSON.stringify(data) } });
    return created;
  });
  revalidateAllocationPaths(); return { id: rule.id };
}

export async function applyAllocationRule(ruleId: string) {
  const id = z.string().uuid().parse(ruleId);
  const rule = await prisma.allocationRule.findUnique({ where: { id }, include: { items: { orderBy: { percentage: 'desc' } } } });
  if (!rule || !rule.is_active) throw new Error('Regra ativa não encontrada.');
  const actor = await requireCompanyAccess(rule.company_id, 'edit');
  const entries = await prisma.financialEntry.findMany({ where: {
    company_id: rule.company_id, nature: 'EXPENSE', deleted_at: null, cost_center_id: null, allocations: { none: {} },
    ...(rule.category_id ? { category_id: rule.category_id } : {}),
    ...(rule.account_contains ? { account_name: { contains: rule.account_contains } } : {}),
  }, select: { id: true, amount: true } });
  if (!entries.length) return { applied_entries: 0, allocations: 0 };
  const allocationRows = entries.flatMap((entry) => {
    const amounts = distributeAmount(Number(entry.amount), rule.items.map((item) => Number(item.percentage)));
    return rule.items.map((item, index) => {
      const amount = amounts[index];
      return { company_id: rule.company_id, financial_entry_id: entry.id, cost_center_id: item.cost_center_id, rule_id: rule.id, percentage: item.percentage, allocated_amount: amount };
    });
  });
  await prisma.$transaction(async (tx) => {
    await tx.financialAllocation.createMany({ data: allocationRows });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: rule.company_id, module: 'FINANCE', entity_type: 'AllocationRule', entity_id: rule.id, action: 'APPLY_ALLOCATION_RULE', new_values: JSON.stringify({ applied_entries: entries.length, allocations: allocationRows.length }) } });
  }, { timeout: 60_000 });
  revalidateAllocationPaths(); return { applied_entries: entries.length, allocations: allocationRows.length };
}

export async function setAllocationRuleActive(ruleId: string, active: boolean) {
  const id = z.string().uuid().parse(ruleId); const value = z.boolean().parse(active);
  const rule = await prisma.allocationRule.findUnique({ where: { id } }); if (!rule) throw new Error('Regra não encontrada.');
  const actor = await requireCompanyAccess(rule.company_id, 'edit');
  await prisma.$transaction(async (tx) => { await tx.allocationRule.update({ where: { id }, data: { is_active: value } }); await tx.auditLog.create({ data: { user_id: actor.id, company_id: rule.company_id, module: 'FINANCE', entity_type: 'AllocationRule', entity_id: id, action: value ? 'ACTIVATE_ALLOCATION_RULE' : 'DEACTIVATE_ALLOCATION_RULE' } }); });
  revalidateAllocationPaths(); return { success: true };
}

export async function rollbackAllocationRule(ruleId: string) {
  const id = z.string().uuid().parse(ruleId);
  const rule = await prisma.allocationRule.findUnique({ where: { id }, include: { _count: { select: { allocations: true } } } });
  if (!rule) throw new Error('Regra não encontrada.');
  const actor = await requireCompanyAccess(rule.company_id, 'edit');
  const removed = await prisma.$transaction(async (tx) => {
    const result = await tx.financialAllocation.deleteMany({ where: { rule_id: id } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: rule.company_id, module: 'FINANCE', entity_type: 'AllocationRule', entity_id: id, action: 'ROLLBACK_ALLOCATION_RULE', previous_values: JSON.stringify({ allocations: rule._count.allocations }) } });
    return result.count;
  });
  revalidateAllocationPaths(); return { removed_allocations: removed };
}

function revalidateAllocationPaths() { revalidatePath('/finance/allocations'); revalidatePath('/finance/budgets'); revalidatePath('/finance'); }
