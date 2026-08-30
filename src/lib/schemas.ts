import { z } from 'zod';

// Schemas Zod compartilhados entre server actions. Ficam fora dos módulos
// 'use server' porque um arquivo 'use server' só pode exportar funções async.

export const CompanySchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  tax_id: z.string().optional().nullable(),
  color: z.string().default('#3b82f6'),
  is_holding: z.boolean().default(false),
});

// Update schemas: todos os campos opcionais e SEM `.default()`, para que um
// PATCH parcial (ex.: só { name }) não sobrescreva os demais campos com o
// valor default do schema de criação.
// Update parcial de contrato: todos os campos opcionais e SEM `.default()`.
// Sem isto, `ContractSchema.partial().parse({ status })` reinjeta os defaults
// do schema de criação (nature→EXPENSE, auto_renewal→false, notice_period→30)
// e o `prisma.update` sobrescreve esses campos a cada troca de status.
export const ContractUpdateSchema = z.object({
  company_id: z.string().optional().nullable(),
  title: z.string().min(3, 'Título deve ter ao menos 3 caracteres').optional(),
  type: z.enum(['MSA', 'SOW', 'SLA', 'NDA', 'SAAS', 'HARDWARE', 'PARTNERSHIP', 'AMENDMENT']).optional(),
  nature: z.enum(['REVENUE', 'EXPENSE']).optional(),
  counterpart: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
  start_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional(),
  end_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional(),
  auto_renewal: z.boolean().optional(),
  notice_period_days: z.number().int().nonnegative().optional(),
  total_value: z.number().nonnegative().optional(),
  raw_text_or_url: z.string().optional().nullable(),
});

export const CompanyUpdateSchema = z.object({
  name: z.string().min(2, 'Nome da empresa é obrigatório').optional(),
  code: z.string().min(2, 'Código é obrigatório').optional(),
  tax_id: z.string().optional().nullable(),
  color: z.string().optional(),
  is_holding: z.boolean().optional(),
});

export const BankAccountSchema = z.object({
  company_id: z.string().uuid(),
  bank_name: z.string().min(1, 'Nome do banco é obrigatório').max(180),
  branch: z.string().max(40).optional().nullable(),
  account_number: z.string().max(60).optional().nullable(),
  opening_balance: z.number().finite().default(0),
  is_active: z.boolean().default(true),
});

export const BankAccountUpdateSchema = z.object({
  bank_name: z.string().min(1, 'Nome do banco é obrigatório').max(180).optional(),
  branch: z.string().max(40).optional().nullable(),
  account_number: z.string().max(60).optional().nullable(),
  opening_balance: z.number().finite().optional(),
  is_active: z.boolean().optional(),
});

export const FinancialCategoryUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const MergeCategoriesSchema = z.object({
  targetId: z.string().uuid(),
  sourceIds: z.array(z.string().uuid()).min(1).max(50),
});
