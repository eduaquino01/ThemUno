'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope, requireCompanyAccess } from '@/lib/auth';

const QuerySchema = z.object({ company_id: z.string().uuid().or(z.literal('ALL')), year: z.number().int().min(2020).max(2100) });
const CloseSchema = z.object({ company_id: z.string().uuid(), year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12), notes: z.string().trim().max(500).optional(), force: z.boolean().default(false) });

export async function getClosingOverview(input: unknown) {
  const data = QuerySchema.parse(input); const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id); const companyWhere = companyIds === null ? {} : { company_id: { in: companyIds } };
  const [closes, entries] = await Promise.all([
    prisma.financialPeriodClose.findMany({ where: { ...companyWhere, year: data.year }, include: { company: { select: { name: true } } }, orderBy: [{ company: { name: 'asc' } }, { month: 'asc' }] }),
    prisma.financialEntry.findMany({ where: { ...companyWhere, scenario: 'ACTUAL', deleted_at: null, period_start: { gte: new Date(`${data.year}-01-01T00:00:00.000Z`), lt: new Date(`${data.year + 1}-01-01T00:00:00.000Z`) } }, select: { company_id: true, period_start: true, amount: true, nature: true, reconciliation_status: true } }),
  ]);
  const summary = new Map<string, { revenue: number; expense: number; unreconciled: number }>();
  for (const entry of entries) { const key = `${entry.company_id}:${entry.period_start.getUTCMonth() + 1}`; const row = summary.get(key) || { revenue: 0, expense: 0, unreconciled: 0 }; row[entry.nature === 'REVENUE' ? 'revenue' : 'expense'] += Number(entry.amount); if (entry.reconciliation_status !== 'RECONCILED') row.unreconciled += 1; summary.set(key, row); }
  return { closes: closes.map((close) => ({ ...close, closed_at: close.closed_at.toISOString(), reopened_at: close.reopened_at?.toISOString() ?? null })), summary: Object.fromEntries(summary), year: data.year };
}

export async function closeFinancialPeriod(input: unknown) {
  const data = CloseSchema.parse(input); const actor = await requireCompanyAccess(data.company_id, 'approve');
  const start = new Date(Date.UTC(data.year, data.month - 1, 1)); const end = new Date(Date.UTC(data.year, data.month, 1));
  const unreconciled = await prisma.financialEntry.count({ where: { company_id: data.company_id, scenario: 'ACTUAL', deleted_at: null, period_start: { gte: start, lt: end }, reconciliation_status: { not: 'RECONCILED' } } });
  if (unreconciled > 0 && !data.force) throw new Error(`Existem ${unreconciled} lançamentos não conciliados. Concilie-os ou use o fechamento excepcional com justificativa.`);
  if (data.force && (!data.notes || data.notes.length < 10)) throw new Error('O fechamento excepcional exige justificativa com ao menos 10 caracteres.');
  const close = await prisma.$transaction(async (tx) => {
    const saved = await tx.financialPeriodClose.upsert({ where: { company_id_year_month: { company_id: data.company_id, year: data.year, month: data.month } }, create: { company_id: data.company_id, year: data.year, month: data.month, notes: data.notes || null, closed_by_id: actor.id }, update: { status: 'CLOSED', notes: data.notes || null, closed_by_id: actor.id, closed_at: new Date(), reopened_by_id: null, reopened_at: null } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: data.company_id, module: 'FINANCE', entity_type: 'FinancialPeriodClose', entity_id: saved.id, action: data.force ? 'FORCE_CLOSE_PERIOD' : 'CLOSE_PERIOD', reason: data.notes || null, new_values: JSON.stringify({ year: data.year, month: data.month, unreconciled }) } }); return saved;
  });
  revalidateClosing(); return { id: close.id };
}

export async function reopenFinancialPeriod(companyId: string, year: number, month: number, reason: string) {
  const data = z.object({ companyId: z.string().uuid(), year: z.number().int(), month: z.number().int().min(1).max(12), reason: z.string().trim().min(10).max(500) }).parse({ companyId, year, month, reason });
  const actor = await requireCompanyAccess(data.companyId, 'approve'); const current = await prisma.financialPeriodClose.findUnique({ where: { company_id_year_month: { company_id: data.companyId, year: data.year, month: data.month } } }); if (!current || current.status !== 'CLOSED') throw new Error('Período fechado não encontrado.');
  await prisma.$transaction(async (tx) => { await tx.financialPeriodClose.update({ where: { id: current.id }, data: { status: 'OPEN', reopened_by_id: actor.id, reopened_at: new Date() } }); await tx.auditLog.create({ data: { user_id: actor.id, company_id: data.companyId, module: 'FINANCE', entity_type: 'FinancialPeriodClose', entity_id: current.id, action: 'REOPEN_PERIOD', reason: data.reason } }); });
  revalidateClosing(); return { success: true };
}
function revalidateClosing() { revalidatePath('/finance/closing'); revalidatePath('/finance'); }
