'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, requireAuth } from '@/lib/auth';

const UserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(180),
  password: z.string().min(12).max(200),
  role: z.enum(['ADMIN', 'DIRETORIA', 'FINANCEIRO', 'CONTRATOS', 'CONSULTA']),
  company_ids: z.array(z.string().uuid()).max(100),
});

const BankAccountSchema = z.object({
  company_id: z.string().uuid(),
  bank_name: z.string().trim().min(2).max(120),
  branch: z.string().trim().max(30).optional(),
  account_number: z.string().trim().max(60).optional(),
  opening_balance: z.number().finite(),
});

const CompanySchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().toUpperCase().min(2).max(30).regex(/^[A-Z0-9-]+$/),
  tax_id: z.string().trim().max(30).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_holding: z.boolean(),
});

const ApprovalThresholdSchema = z.object({
  company_id: z.string().uuid(),
  threshold: z.number().min(0).max(1_000_000_000).finite(),
});

const FinancialCategorySchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  nature: z.enum(['REVENUE', 'EXPENSE']),
});

const CostCenterSchema = z.object({
  company_id: z.string().uuid(),
  code: z.string().trim().toUpperCase().min(1).max(30).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
});

const PartnerSchema = z.object({
  company_id: z.string().uuid(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  name: z.string().trim().min(2).max(160),
  tax_id: z.string().trim().max(30).optional(),
  email: z.union([z.string().trim().email().max(180), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
});

async function requireAdmin() {
  const user = await requireAuth('manage_users');
  if (user.role !== 'ADMIN') throw new Error('Apenas administradores podem executar esta operação.');
  return user;
}

export async function getAdminOverview() {
  await requireAdmin();
  const [companies, users, bankAccounts, financialCategories, costCenters, partners] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { contracts: true, user_companies: true, bank_accounts: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, role: true, is_active: true, last_login_at: true,
        user_companies: { select: { company: { select: { id: true, name: true } } } },
      },
    }),
    prisma.bankAccount.findMany({
      orderBy: [{ company: { name: 'asc' } }, { bank_name: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.financialCategory.findMany({
      orderBy: [{ company: { name: 'asc' } }, { nature: 'asc' }, { name: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.costCenter.findMany({
      orderBy: [{ company: { name: 'asc' } }, { code: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.partner.findMany({
      orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    companies: companies.map((company) => ({ ...company, financial_approval_threshold: Number(company.financial_approval_threshold), created_at: company.created_at.toISOString() })),
    users: users.map((user) => ({
      ...user,
      last_login_at: user.last_login_at?.toISOString() ?? null,
      companies: user.user_companies.map((item) => item.company),
      user_companies: undefined,
    })),
    bankAccounts: bankAccounts.map((account) => ({
      ...account,
      opening_balance: Number(account.opening_balance),
      created_at: account.created_at.toISOString(),
      updated_at: account.updated_at.toISOString(),
    })),
    financialCategories: financialCategories.map((category) => ({
      ...category, created_at: category.created_at.toISOString(), updated_at: category.updated_at.toISOString(),
    })),
    costCenters: costCenters.map((center) => ({
      ...center, created_at: center.created_at.toISOString(), updated_at: center.updated_at.toISOString(),
    })),
    partners: partners.map((partner) => ({
      ...partner, created_at: partner.created_at.toISOString(), updated_at: partner.updated_at.toISOString(),
    })),
  };
}

export async function updateFinancialApprovalThreshold(input: unknown) {
  const actor = await requireAdmin();
  const data = ApprovalThresholdSchema.parse(input);
  const current = await prisma.company.findUnique({ where: { id: data.company_id }, select: { financial_approval_threshold: true } });
  if (!current) throw new Error('Empresa não encontrada.');
  await prisma.$transaction(async (tx) => {
    await tx.company.update({ where: { id: data.company_id }, data: { financial_approval_threshold: data.threshold } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: data.company_id, module: 'ADMIN', entity_type: 'Company', entity_id: data.company_id,
      action: 'UPDATE_FINANCIAL_APPROVAL_THRESHOLD',
      previous_values: JSON.stringify({ financial_approval_threshold: Number(current.financial_approval_threshold) }),
      new_values: JSON.stringify({ financial_approval_threshold: data.threshold }),
    } });
  });
  revalidatePath('/admin');
  revalidatePath('/finance');
  return { success: true };
}

export async function updateFinancialCategoryDreGroup(categoryId: string, dreGroup: string) {
  const actor = await requireAdmin();
  const data = z.object({ categoryId: z.string().uuid(), dreGroup: z.enum(['GROSS_REVENUE','REVENUE_DEDUCTION','DIRECT_COST','OPERATING_EXPENSE','FINANCIAL_RESULT','TAX']) }).parse({ categoryId, dreGroup });
  const category = await prisma.financialCategory.findUnique({ where: { id: data.categoryId } }); if (!category) throw new Error('Categoria não encontrada.');
  await prisma.$transaction(async (tx) => { await tx.financialCategory.update({ where: { id: data.categoryId }, data: { dre_group: data.dreGroup } }); await tx.auditLog.create({ data: { user_id: actor.id, company_id: category.company_id, module: 'ADMIN', entity_type: 'FinancialCategory', entity_id: category.id, action: 'UPDATE_DRE_GROUP', previous_values: JSON.stringify({ dre_group: category.dre_group }), new_values: JSON.stringify({ dre_group: data.dreGroup }) } }); });
  revalidatePath('/admin'); revalidatePath('/finance/dre'); return { success: true };
}

export async function createAdminUser(input: unknown) {
  const actor = await requireAdmin();
  const data = UserSchema.parse(input);
  const companyCount = await prisma.company.count({ where: { id: { in: data.company_ids } } });
  if (companyCount !== data.company_ids.length) throw new Error('Uma ou mais empresas selecionadas são inválidas.');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
        user_companies: { create: data.company_ids.map((company_id) => ({ company_id })) },
      },
      select: { id: true, name: true, email: true, role: true, is_active: true },
    });
    await tx.auditLog.create({
      data: {
        user_id: actor.id,
        module: 'ADMIN',
        entity_type: 'User',
        entity_id: created.id,
        action: 'CREATE',
        new_values: JSON.stringify({ name: created.name, email: created.email, role: created.role, company_ids: data.company_ids }),
      },
    });
    return created;
  });
  revalidatePath('/admin');
  return user;
}

export async function createAdminCompany(input: unknown) {
  const actor = await requireAdmin();
  const data = CompanySchema.parse(input);
  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: { ...data, tax_id: data.tax_id || null },
    });
    await tx.userCompany.create({ data: { user_id: actor.id, company_id: created.id } });
    await tx.auditLog.create({
      data: {
        user_id: actor.id, company_id: created.id, module: 'ADMIN', entity_type: 'Company',
        entity_id: created.id, action: 'CREATE',
        new_values: JSON.stringify({ name: created.name, code: created.code, tax_id: created.tax_id }),
      },
    });
    return created;
  });
  revalidatePath('/admin');
  revalidatePath('/');
  return { id: company.id };
}

export async function setUserActive(userId: string, isActive: boolean) {
  const actor = await requireAdmin();
  const id = z.string().uuid().parse(userId);
  if (id === actor.id && !isActive) throw new Error('Você não pode desativar seu próprio usuário.');

  await prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUnique({ where: { id }, select: { is_active: true } });
    if (!previous) throw new Error('Usuário não encontrado.');
    await tx.user.update({ where: { id }, data: { is_active: isActive } });
    if (!isActive) await tx.session.deleteMany({ where: { user_id: id } });
    await tx.auditLog.create({
      data: {
        user_id: actor.id, module: 'ADMIN', entity_type: 'User', entity_id: id,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        previous_values: JSON.stringify(previous), new_values: JSON.stringify({ is_active: isActive }),
      },
    });
  });
  revalidatePath('/admin');
  return { success: true };
}

export async function createBankAccount(input: unknown) {
  const actor = await requireAdmin();
  const data = BankAccountSchema.parse(input);
  const company = await prisma.company.findUnique({ where: { id: data.company_id }, select: { id: true } });
  if (!company) throw new Error('Empresa não encontrada.');

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.bankAccount.create({
      data: {
        company_id: data.company_id,
        bank_name: data.bank_name,
        branch: data.branch || null,
        account_number: data.account_number || null,
        opening_balance: data.opening_balance,
      },
    });
    await tx.auditLog.create({
      data: {
        user_id: actor.id, company_id: data.company_id, module: 'ADMIN',
        entity_type: 'BankAccount', entity_id: created.id, action: 'CREATE',
        new_values: JSON.stringify({ bank_name: created.bank_name, branch: created.branch, account_number: created.account_number }),
      },
    });
    return created;
  });
  revalidatePath('/admin');
  revalidatePath('/finance');
  return { id: account.id };
}

export async function createFinancialCategory(input: unknown) {
  const actor = await requireAdmin();
  const data = FinancialCategorySchema.parse(input);
  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.financialCategory.create({ data });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: data.company_id, module: 'ADMIN', entity_type: 'FinancialCategory',
      entity_id: created.id, action: 'CREATE', new_values: JSON.stringify({ name: created.name, nature: created.nature }),
    } });
    return created;
  });
  revalidatePath('/admin');
  revalidatePath('/finance');
  return { id: category.id };
}

export async function createCostCenter(input: unknown) {
  const actor = await requireAdmin();
  const data = CostCenterSchema.parse(input);
  const center = await prisma.$transaction(async (tx) => {
    const created = await tx.costCenter.create({ data: { ...data, description: data.description || null } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: data.company_id, module: 'ADMIN', entity_type: 'CostCenter',
      entity_id: created.id, action: 'CREATE', new_values: JSON.stringify({ code: created.code, name: created.name }),
    } });
    return created;
  });
  revalidatePath('/admin');
  return { id: center.id };
}

export async function createPartner(input: unknown) {
  const actor = await requireAdmin();
  const data = PartnerSchema.parse(input);
  const partner = await prisma.$transaction(async (tx) => {
    const created = await tx.partner.create({ data: {
      ...data, tax_id: data.tax_id || null, email: data.email || null, phone: data.phone || null,
    } });
    await tx.auditLog.create({ data: {
      user_id: actor.id, company_id: data.company_id, module: 'ADMIN', entity_type: 'Partner',
      entity_id: created.id, action: 'CREATE', new_values: JSON.stringify({ name: created.name, type: created.type, tax_id: created.tax_id }),
    } });
    return created;
  });
  revalidatePath('/admin');
  return { id: partner.id };
}

export async function getAuditLogsPaginated(input?: {
  page?: number;
  pageSize?: number;
  module?: string;
}) {
  await requireAdmin();
  const page = Math.max(1, input?.page || 1);
  const pageSize = Math.min(100, Math.max(10, input?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (input?.module) where.module = input.module;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    logs: logs.map((log) => ({
      ...log,
      created_at: log.created_at.toISOString(),
    })),
  };
}
