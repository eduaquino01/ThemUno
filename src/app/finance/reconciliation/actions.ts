'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthorizedCompanyScope, requireCompanyAccess } from '@/lib/auth';

const RowSchema = z.object({
  row_number: z.number().int().positive(),
  transaction_date: z.string().date(),
  description: z.string().trim().min(1).max(500),
  document_number: z.string().trim().max(120).optional(),
  amount: z.number().finite().refine((value) => value !== 0, 'O valor não pode ser zero.'),
});
const ImportSchema = z.object({
  company_id: z.string().uuid(), bank_account_id: z.string().uuid(), file_name: z.string().trim().min(1).max(255),
  rows: z.array(RowSchema).min(1).max(5000),
});
const ListSchema = z.object({
  company_id: z.string().uuid().or(z.literal('ALL')), bank_account_id: z.string().uuid().or(z.literal('ALL')).default('ALL'),
  status: z.enum(['ALL', 'MATCHED', 'UNMATCHED']).default('ALL'), page: z.number().int().positive().default(1), page_size: z.number().int().min(10).max(100).default(50),
});
const MatchSchema = z.object({ transaction_id: z.string().uuid(), financial_entry_id: z.string().uuid() });

export async function getReconciliationData(input: unknown) {
  const data = ListSchema.parse(input);
  const { companyIds } = await getAuthorizedCompanyScope('view', data.company_id);
  const companyWhere = companyIds === null ? {} : { company_id: { in: companyIds } };
  const where = {
    ...companyWhere,
    ...(data.bank_account_id === 'ALL' ? {} : { bank_account_id: data.bank_account_id }),
    ...(data.status === 'ALL' ? {} : { match_status: data.status }),
  };
  const skip = (data.page - 1) * data.page_size;
  const [transactions, total, matched, unmatched, bankAccounts, imports] = await Promise.all([
    prisma.bankTransaction.findMany({
      where, skip, take: data.page_size, orderBy: [{ transaction_date: 'desc' }, { created_at: 'desc' }],
      include: {
        company: { select: { name: true } }, bank_account: { select: { bank_name: true, account_number: true } },
        financial_entry: { select: { id: true, account_name: true, description: true, document_number: true, amount: true, due_date: true, nature: true } },
      },
    }),
    prisma.bankTransaction.count({ where }),
    prisma.bankTransaction.count({ where: { ...where, match_status: 'MATCHED' } }),
    prisma.bankTransaction.count({ where: { ...where, match_status: 'UNMATCHED' } }),
    prisma.bankAccount.findMany({ where: { ...companyWhere, is_active: true }, include: { company: { select: { id: true, name: true } } }, orderBy: [{ company: { name: 'asc' } }, { bank_name: 'asc' }] }),
    prisma.bankStatementImport.findMany({ where: companyWhere, orderBy: { created_at: 'desc' }, take: 8, include: { bank_account: { select: { bank_name: true } } } }),
  ]);

  const unmatchedTransactions = transactions.filter((item) => item.match_status === 'UNMATCHED');
  const candidatePairs = await Promise.all(unmatchedTransactions.map(async (transaction) => {
    const dateFrom = new Date(transaction.transaction_date); dateFrom.setUTCDate(dateFrom.getUTCDate() - 3);
    const dateTo = new Date(transaction.transaction_date); dateTo.setUTCDate(dateTo.getUTCDate() + 3);
    const candidates = await prisma.financialEntry.findMany({
      where: {
        company_id: transaction.company_id, deleted_at: null, reconciliation_status: { not: 'RECONCILED' },
        nature: Number(transaction.amount) > 0 ? 'REVENUE' : 'EXPENSE', amount: Math.abs(Number(transaction.amount)),
        OR: [{ due_date: { gte: dateFrom, lte: dateTo } }, { settlement_date: { gte: dateFrom, lte: dateTo } }],
      },
      take: 5, orderBy: { due_date: 'asc' }, select: { id: true, account_name: true, description: true, document_number: true, amount: true, due_date: true },
    });
    return [transaction.id, candidates.map((item) => ({ ...item, amount: Number(item.amount), due_date: item.due_date?.toISOString() ?? null }))] as const;
  }));
  const candidates = Object.fromEntries(candidatePairs);

  return {
    transactions: transactions.map((item) => ({
      ...item, amount: Number(item.amount), transaction_date: item.transaction_date.toISOString(), created_at: item.created_at.toISOString(), matched_at: item.matched_at?.toISOString() ?? null,
      financial_entry: item.financial_entry ? { ...item.financial_entry, amount: Number(item.financial_entry.amount), due_date: item.financial_entry.due_date?.toISOString() ?? null } : null,
    })),
    total, matched, unmatched, page: data.page, pageSize: data.page_size, candidates,
    bankAccounts: bankAccounts.map((item) => ({ ...item, opening_balance: Number(item.opening_balance), created_at: item.created_at.toISOString(), updated_at: item.updated_at.toISOString() })),
    imports: imports.map((item) => ({ ...item, created_at: item.created_at.toISOString() })),
  };
}

export async function importBankStatement(input: unknown) {
  const data = ImportSchema.parse(input);
  const actor = await requireCompanyAccess(data.company_id, 'reconcile');
  const account = await prisma.bankAccount.findFirst({ where: { id: data.bank_account_id, company_id: data.company_id, is_active: true } });
  if (!account) throw new Error('Conta bancária inválida para a empresa selecionada.');
  const sourceHash = hash(JSON.stringify(data.rows));
  const previous = await prisma.bankStatementImport.findUnique({ where: { bank_account_id_source_hash: { bank_account_id: data.bank_account_id, source_hash: sourceHash } } });
  if (previous) throw new Error('Este mesmo arquivo já foi importado para a conta selecionada.');

  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.bankStatementImport.create({ data: { company_id: data.company_id, bank_account_id: data.bank_account_id, file_name: data.file_name, source_hash: sourceHash, created_by_id: actor.id } });
    let imported = 0; let ignored = 0;
    for (const row of data.rows) {
      const fingerprint = hash(`${row.row_number}|${row.transaction_date}|${row.description}|${row.document_number || ''}|${row.amount}`);
      const exists = await tx.bankTransaction.findUnique({ where: { bank_account_id_fingerprint: { bank_account_id: data.bank_account_id, fingerprint } } });
      if (exists) { ignored += 1; continue; }
      const transactionDate = new Date(`${row.transaction_date}T12:00:00.000Z`);
      const dateFrom = new Date(transactionDate); dateFrom.setUTCDate(dateFrom.getUTCDate() - 3);
      const dateTo = new Date(transactionDate); dateTo.setUTCDate(dateTo.getUTCDate() + 3);
      const candidates = await tx.financialEntry.findMany({ where: {
        company_id: data.company_id, deleted_at: null, reconciliation_status: { not: 'RECONCILED' },
        nature: row.amount > 0 ? 'REVENUE' : 'EXPENSE', amount: Math.abs(row.amount),
        OR: [{ due_date: { gte: dateFrom, lte: dateTo } }, { settlement_date: { gte: dateFrom, lte: dateTo } }],
      }, take: 2, select: { id: true } });
      const uniqueMatch = candidates.length === 1 ? candidates[0] : null;
      await tx.bankTransaction.create({ data: {
        company_id: data.company_id, bank_account_id: data.bank_account_id, statement_import_id: batch.id,
        financial_entry_id: uniqueMatch?.id, transaction_date: transactionDate, description: row.description,
        document_number: row.document_number || null, amount: row.amount, fingerprint,
        match_status: uniqueMatch ? 'MATCHED' : 'UNMATCHED', matched_by_id: uniqueMatch ? actor.id : null, matched_at: uniqueMatch ? new Date() : null,
      } });
      if (uniqueMatch) await tx.financialEntry.update({ where: { id: uniqueMatch.id }, data: { reconciliation_status: 'RECONCILED', is_reconciled: true, bank_account_id: data.bank_account_id } });
      imported += 1;
    }
    await tx.bankStatementImport.update({ where: { id: batch.id }, data: { imported_rows: imported, ignored_rows: ignored } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: data.company_id, module: 'FINANCE', entity_type: 'BankStatementImport', entity_id: batch.id, action: 'IMPORT_BANK_STATEMENT', new_values: JSON.stringify({ file_name: data.file_name, imported_rows: imported, ignored_rows: ignored }) } });
    return { id: batch.id, imported_rows: imported, ignored_rows: ignored };
  });
  revalidateReconciliation();
  return result;
}

export async function matchBankTransaction(input: unknown) {
  const data = MatchSchema.parse(input);
  const transaction = await prisma.bankTransaction.findUnique({ where: { id: data.transaction_id } });
  if (!transaction) throw new Error('Movimentação bancária não encontrada.');
  const actor = await requireCompanyAccess(transaction.company_id, 'reconcile');
  const entry = await prisma.financialEntry.findFirst({ where: { id: data.financial_entry_id, company_id: transaction.company_id, deleted_at: null } });
  if (!entry) throw new Error('Lançamento financeiro inválido.');
  if (entry.nature !== (Number(transaction.amount) > 0 ? 'REVENUE' : 'EXPENSE') || Number(entry.amount) !== Math.abs(Number(transaction.amount))) throw new Error('O lançamento deve possuir a mesma natureza e valor da movimentação bancária.');
  if (entry.reconciliation_status === 'RECONCILED' && transaction.financial_entry_id !== entry.id) throw new Error('Este lançamento já está conciliado com outra movimentação.');
  await prisma.$transaction(async (tx) => {
    if (transaction.financial_entry_id && transaction.financial_entry_id !== entry.id) await tx.financialEntry.update({ where: { id: transaction.financial_entry_id }, data: { reconciliation_status: 'UNRECONCILED', is_reconciled: false } });
    await tx.bankTransaction.update({ where: { id: transaction.id }, data: { financial_entry_id: entry.id, match_status: 'MATCHED', matched_by_id: actor.id, matched_at: new Date() } });
    await tx.financialEntry.update({ where: { id: entry.id }, data: { reconciliation_status: 'RECONCILED', is_reconciled: true, bank_account_id: transaction.bank_account_id } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: transaction.company_id, module: 'FINANCE', entity_type: 'BankTransaction', entity_id: transaction.id, action: 'MATCH_BANK_TRANSACTION', new_values: JSON.stringify({ financial_entry_id: entry.id }) } });
  });
  revalidateReconciliation(); return { success: true };
}

export async function unmatchBankTransaction(transactionId: string) {
  const id = z.string().uuid().parse(transactionId);
  const transaction = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!transaction) throw new Error('Movimentação bancária não encontrada.');
  const actor = await requireCompanyAccess(transaction.company_id, 'reconcile');
  await prisma.$transaction(async (tx) => {
    if (transaction.financial_entry_id) await tx.financialEntry.update({ where: { id: transaction.financial_entry_id }, data: { reconciliation_status: 'UNRECONCILED', is_reconciled: false } });
    await tx.bankTransaction.update({ where: { id }, data: { financial_entry_id: null, match_status: 'UNMATCHED', matched_by_id: null, matched_at: null } });
    await tx.auditLog.create({ data: { user_id: actor.id, company_id: transaction.company_id, module: 'FINANCE', entity_type: 'BankTransaction', entity_id: id, action: 'UNMATCH_BANK_TRANSACTION', previous_values: JSON.stringify({ financial_entry_id: transaction.financial_entry_id }) } });
  });
  revalidateReconciliation(); return { success: true };
}

function hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function revalidateReconciliation() { revalidatePath('/finance'); revalidatePath('/finance/reconciliation'); revalidatePath('/finance/cash-flow'); }
