'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope, requireCompanyAccess } from '@/lib/auth';
import { assertFinancialPeriodOpen } from '@/lib/financial-period';

const NatureSchema = z.enum(['REVENUE', 'EXPENSE']);
const ListSchema = z.object({
  nature: NatureSchema,
  company_id: z.string().uuid().or(z.literal('ALL')),
  status: z.enum(['ALL', 'OPEN', 'SETTLED', 'DISPUTED']).default('ALL'),
  approval: z.enum(['ALL', 'NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED']).default('ALL'),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().min(10).max(100).default(50),
});

const ObligationSchema = z.object({
  company_id: z.string().uuid(),
  nature: NatureSchema,
  category_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  cost_center_id: z.string().uuid().optional().nullable(),
  document_number: z.string().trim().max(120).optional(),
  description: z.string().trim().min(2).max(500),
  due_date: z.string().date(),
  amount: z.number().positive().finite(),
});

const SettlementSchema = z.object({
  entry_id: z.string().uuid(),
  settlement_date: z.string().date(),
  bank_account_id: z.string().uuid().optional().nullable(),
});

const ReviewSchema = z.object({
  entry_id: z.string().uuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(500).optional(),
}).superRefine((data, context) => {
  if (data.decision === 'REJECTED' && (!data.reason || data.reason.length < 3)) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Informe o motivo da rejeição.' });
  }
});

export async function getFinanceOperations(input: unknown) {
  const data = ListSchema.parse(input);
  const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id);
  const where = {
    nature: data.nature,
    deleted_at: null,
    due_date: { not: null },
    ...(companyIds === null ? {} : { company_id: { in: companyIds } }),
    ...(data.status === 'ALL' ? {} : { settlement_status: data.status }),
    ...(data.approval === 'ALL' ? {} : { approval_status: data.approval }),
  } as const;
  const skip = (data.page - 1) * data.page_size;
  const [entries, total, openAggregate, settledAggregate, setup] = await Promise.all([
    prisma.financialEntry.findMany({
      where, skip, take: data.page_size,
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
      include: {
        company: { select: { id: true, name: true } }, category: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } }, cost_center: { select: { id: true, code: true, name: true } },
        bank_account: { select: { id: true, bank_name: true } },
      },
    }),
    prisma.financialEntry.count({ where }),
    prisma.financialEntry.aggregate({ where: { ...where, settlement_status: 'OPEN' }, _sum: { amount: true } }),
    prisma.financialEntry.aggregate({ where: { ...where, settlement_status: 'SETTLED' }, _sum: { amount: true } }),
    data.company_id === 'ALL' ? Promise.resolve(null) : getOperationSetup(data.company_id, data.nature),
  ]);

  return {
    entries: entries.map((entry) => ({
      ...entry, amount: Number(entry.amount), due_date: entry.due_date?.toISOString() ?? null,
      settlement_date: entry.settlement_date?.toISOString() ?? null,
      period_start: entry.period_start.toISOString(), period_end: entry.period_end.toISOString(),
      created_at: entry.created_at.toISOString(), updated_at: entry.updated_at.toISOString(),
    })),
    total,
    page: data.page,
    pageSize: data.page_size,
    totals: { open: Number(openAggregate._sum.amount || 0), settled: Number(settledAggregate._sum.amount || 0) },
    setup,
  };
}

async function getOperationSetup(companyId: string, nature: 'REVENUE' | 'EXPENSE') {
  await requireCompanyAccess(companyId, 'view');
  const partnerTypes = nature === 'REVENUE' ? ['CUSTOMER', 'BOTH'] as const : ['SUPPLIER', 'BOTH'] as const;
  const [categories, partners, costCenters, bankAccounts] = await Promise.all([
    prisma.financialCategory.findMany({ where: { company_id: companyId, nature, is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.partner.findMany({ where: { company_id: companyId, type: { in: [...partnerTypes] }, is_active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.costCenter.findMany({ where: { company_id: companyId, is_active: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.bankAccount.findMany({ where: { company_id: companyId, is_active: true }, orderBy: { bank_name: 'asc' }, select: { id: true, bank_name: true, branch: true, account_number: true } }),
  ]);
  return { categories, partners, costCenters, bankAccounts };
}

export async function createFinancialObligation(input: unknown) {
  const data = ObligationSchema.parse(input);
  const actor = await requireCompanyAccess(data.company_id, 'create');
  const acceptedPartnerTypes = data.nature === 'REVENUE' ? ['CUSTOMER', 'BOTH'] as const : ['SUPPLIER', 'BOTH'] as const;
  const [category, partner, costCenter, company] = await Promise.all([
    prisma.financialCategory.findFirst({ where: { id: data.category_id, company_id: data.company_id, nature: data.nature, is_active: true } }),
    prisma.partner.findFirst({ where: { id: data.partner_id, company_id: data.company_id, type: { in: [...acceptedPartnerTypes] }, is_active: true } }),
    data.cost_center_id ? prisma.costCenter.findFirst({ where: { id: data.cost_center_id, company_id: data.company_id, is_active: true } }) : null,
    prisma.company.findUnique({ where: { id: data.company_id }, select: { financial_approval_threshold: true } }),
  ]);
  if (!category) throw new Error('Categoria inválida para a empresa e natureza selecionadas.');
  if (!partner) throw new Error('Parceiro inválido para a empresa selecionada.');
  if (data.cost_center_id && !costCenter) throw new Error('Centro de custo inválido para a empresa selecionada.');
  if (!company) throw new Error('Empresa não encontrada.');

  const approvalRequired = data.amount >= Number(company.financial_approval_threshold);

  const dueDate = new Date(`${data.due_date}T12:00:00.000Z`);
  await assertFinancialPeriodOpen(data.company_id, dueDate);
  const periodStart = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), 1, 12));
  const periodEnd = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0, 12));
  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.financialEntry.create({ data: {
      company_id: data.company_id, category_id: data.category_id, partner_id: data.partner_id,
      cost_center_id: data.cost_center_id || null, scenario: 'PLANNED', nature: data.nature,
      account_name: partner.name, description: data.description, document_number: data.document_number || null,
      period_start: periodStart, period_end: periodEnd, due_date: dueDate, amount: data.amount,
      settlement_status: 'OPEN', reconciliation_status: 'UNRECONCILED', source: 'MANUAL',
      approval_required: approvalRequired, approval_status: approvalRequired ? 'PENDING' : 'NOT_REQUIRED',
      created_by_id: actor.id,
    } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: data.company_id, module: 'FINANCE', entity_type: 'FinancialEntry',
      entity_id: created.id, action: 'CREATE_OBLIGATION',
      new_values: JSON.stringify({ nature: data.nature, amount: data.amount, due_date: data.due_date, partner_id: data.partner_id, cost_center_id: data.cost_center_id, approval_required: approvalRequired }),
    } });
    return created;
  });
  revalidateFinancialPaths(data.nature);
  return { id: entry.id };
}

export async function settleFinancialObligation(input: unknown) {
  const data = SettlementSchema.parse(input);
  const current = await prisma.financialEntry.findUnique({ where: { id: data.entry_id } });
  if (!current || current.deleted_at) throw new Error('Lançamento não encontrado.');
  const actor = await requireCompanyAccess(current.company_id, 'reconcile');
  if (current.settlement_status === 'SETTLED') throw new Error('Este lançamento já foi baixado.');
  if (current.approval_status === 'PENDING') throw new Error('Este lançamento precisa ser aprovado antes da baixa.');
  if (current.approval_status === 'REJECTED') throw new Error('Um lançamento rejeitado não pode ser baixado.');
  if (data.bank_account_id) {
    const account = await prisma.bankAccount.findFirst({ where: { id: data.bank_account_id, company_id: current.company_id, is_active: true } });
    if (!account) throw new Error('Conta bancária inválida para a empresa do lançamento.');
  }
  const settlementDate = new Date(`${data.settlement_date}T12:00:00.000Z`);
  await assertFinancialPeriodOpen(current.company_id, settlementDate);
  await prisma.$transaction(async (tx) => {
    await tx.financialEntry.update({ where: { id: current.id }, data: {
      settlement_status: 'SETTLED', settlement_date: settlementDate, bank_account_id: data.bank_account_id || null,
      scenario: 'ACTUAL', is_reconciled: false, reconciliation_status: 'UNRECONCILED',
    } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: current.company_id, module: 'FINANCE', entity_type: 'FinancialEntry',
      entity_id: current.id, action: 'SETTLE', previous_values: JSON.stringify({ settlement_status: current.settlement_status }),
      new_values: JSON.stringify({ settlement_status: 'SETTLED', settlement_date: data.settlement_date, bank_account_id: data.bank_account_id }),
    } });
  });
  revalidateFinancialPaths(current.nature);
  return { success: true };
}

export async function reviewFinancialObligation(input: unknown) {
  const data = ReviewSchema.parse(input);
  const current = await prisma.financialEntry.findUnique({ where: { id: data.entry_id } });
  if (!current || current.deleted_at) throw new Error('Lançamento não encontrado.');
  const actor = await requireCompanyAccess(current.company_id, 'approve');
  if (!current.approval_required || current.approval_status !== 'PENDING') {
    throw new Error('Este lançamento não está aguardando aprovação.');
  }
  if (current.created_by_id === actor.id) {
    throw new Error('Por segurança, quem cadastrou o lançamento não pode aprová-lo.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.financialEntry.update({ where: { id: current.id }, data: {
      approval_status: data.decision, reviewed_by_id: actor.id, reviewed_at: new Date(),
      rejection_reason: data.decision === 'REJECTED' ? data.reason : null,
    } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: current.company_id, module: 'FINANCE', entity_type: 'FinancialEntry',
      entity_id: current.id, action: data.decision === 'APPROVED' ? 'APPROVE_OBLIGATION' : 'REJECT_OBLIGATION',
      previous_values: JSON.stringify({ approval_status: current.approval_status }),
      new_values: JSON.stringify({ approval_status: data.decision }), reason: data.reason || null,
    } });
  });
  revalidateFinancialPaths(current.nature);
  return { success: true };
}

function revalidateFinancialPaths(nature: 'REVENUE' | 'EXPENSE') {
  revalidatePath('/finance');
  revalidatePath(nature === 'EXPENSE' ? '/finance/payables' : '/finance/receivables');
}
