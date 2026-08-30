'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAuthorizedCompanyScope, requireAuth, requireCompanyAccess, requireGlobalAccess } from '@/lib/auth';
import { 
  ContractNature,
  ContractType, 
  ContractStatus, 
  AcceptanceStatus, 
  ChangeRequestStatus, 
  RiskCategory, 
  RiskLevel, 
  InvoiceStatus, 
  MonthlyReportStatus 
} from '@prisma/client';

// Helper: Serialize Prisma Decimals and Dates to JSON-serializable structures
function serializeCompany(company: any) {
  if (!company) return null;
  return {
    ...company,
    financial_approval_threshold: Number(company.financial_approval_threshold),
    created_at: company.created_at instanceof Date ? company.created_at.toISOString() : company.created_at,
  };
}

function serializeContract(contract: any) {
  if (!contract) return null;
  return {
    ...contract,
    nature: contract.nature || 'EXPENSE',
    total_value: Number(contract.total_value),
    start_date: contract.start_date instanceof Date ? contract.start_date.toISOString() : contract.start_date,
    end_date: contract.end_date instanceof Date ? contract.end_date.toISOString() : contract.end_date,
    created_at: contract.created_at instanceof Date ? contract.created_at.toISOString() : contract.created_at,
    updated_at: contract.updated_at instanceof Date ? contract.updated_at.toISOString() : contract.updated_at,
    company: contract.company ? serializeCompany(contract.company) : null,
    milestones: contract.milestones ? contract.milestones.map(serializeMilestone) : [],
    change_requests: contract.change_requests ? contract.change_requests.map(serializeChangeRequest) : [],
    risks: contract.risks ? contract.risks.map(serializeRisk) : [],
    invoices: contract.invoices ? contract.invoices.map(serializeInvoice) : [],
    credentials: contract.credentials ? contract.credentials.map(serializeCredential) : [],
  };
}

function serializeMilestone(m: any) {
  if (!m) return null;
  return {
    ...m,
    due_date: m.due_date instanceof Date ? m.due_date.toISOString() : m.due_date,
    billing_value: Number(m.billing_value),
  };
}

function serializeChangeRequest(cr: any) {
  if (!cr) return null;
  return {
    ...cr,
    financial_impact: Number(cr.financial_impact),
    created_at: cr.created_at instanceof Date ? cr.created_at.toISOString() : cr.created_at,
    updated_at: cr.updated_at instanceof Date ? cr.updated_at.toISOString() : cr.updated_at,
  };
}

function serializeRisk(r: any) {
  if (!r) return null;
  return {
    ...r,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  };
}

function serializeInvoice(inv: any) {
  if (!inv) return null;
  return {
    ...inv,
    issue_date: inv.issue_date instanceof Date ? inv.issue_date.toISOString() : inv.issue_date,
    due_date: inv.due_date instanceof Date ? inv.due_date.toISOString() : inv.due_date,
    amount: Number(inv.amount),
    created_at: inv.created_at instanceof Date ? inv.created_at.toISOString() : inv.created_at,
    updated_at: inv.updated_at instanceof Date ? inv.updated_at.toISOString() : inv.updated_at,
  };
}

function serializeCredential(cred: any) {
  if (!cred) return null;
  return {
    ...cred,
    created_at: cred.created_at instanceof Date ? cred.created_at.toISOString() : cred.created_at,
    updated_at: cred.updated_at instanceof Date ? cred.updated_at.toISOString() : cred.updated_at,
  };
}

function serializeReport(rep: any) {
  if (!rep) return null;
  return {
    ...rep,
    created_at: rep.created_at instanceof Date ? rep.created_at.toISOString() : rep.created_at,
    updated_at: rep.updated_at instanceof Date ? rep.updated_at.toISOString() : rep.updated_at,
  };
}

// ==========================================
// 1. CONTRACTS SERVER ACTIONS
// ==========================================

const ContractSchema = z.object({
  company_id: z.string().optional().nullable(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(['MSA', 'SOW', 'SLA', 'NDA', 'SAAS', 'HARDWARE', 'PARTNERSHIP', 'AMENDMENT']),
  nature: z.enum(['REVENUE', 'EXPENSE']).default('EXPENSE'),
  counterpart: z.string().min(1, "Counterpart is required"),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'ACTIVE', 'EXPIRED', 'TERMINATED']).default('DRAFT'),
  start_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  end_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  auto_renewal: z.boolean().default(false),
  notice_period_days: z.number().int().nonnegative().default(30),
  total_value: z.number().nonnegative(),
  raw_text_or_url: z.string().optional().nullable(),
});

const CompanySchema = z.object({
  name: z.string().min(2, "Nome da empresa é obrigatório"),
  code: z.string().min(2, "Código é obrigatório"),
  tax_id: z.string().optional().nullable(),
  color: z.string().default("#3b82f6"),
  is_holding: z.boolean().default(false),
});

async function requireContractAccess(contractId: string, permission: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, company_id: true },
  });
  if (!contract) throw new Error('Contrato não encontrado.');
  if (!contract.company_id) {
    const user = await requireAuth(permission);
    if (user.role !== 'ADMIN' && user.role !== 'DIRETORIA') {
      throw new Error('Acesso negado: contrato sem empresa só pode ser tratado por um perfil global.');
    }
    return user;
  }
  return requireCompanyAccess(contract.company_id, permission);
}

export async function getCompanies() {
  try {
    const { companyIds } = await getAuthorizedCompanyScope('view');
    const companies = await prisma.company.findMany({
      where: companyIds === null ? {} : { id: { in: companyIds } },
      orderBy: { name: 'asc' },
    });
    return companies.map(serializeCompany);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

export async function createCompany(data: any) {
  try {
    const user = await requireAuth('manage_users');
    if (user.role !== 'ADMIN') throw new Error('Apenas administradores podem cadastrar empresas.');
    const validated = CompanySchema.parse(data);
    const created = await prisma.company.create({
      data: validated,
    });
    revalidatePath('/');
    return serializeCompany(created);
  } catch (error: any) {
    console.error('Error in createCompany:', error);
    throw new Error(error.message || 'Erro ao cadastrar empresa.');
  }
}

export async function getContracts(companyId?: string) {
  try {
    const { companyIds } = await getAuthorizedCompanyScope('view', companyId || 'ALL');
    const where = companyIds === null ? {} : { company_id: { in: companyIds } };
    const contracts = await prisma.contract.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      include: {
        company: true,
        milestones: true,
        change_requests: true,
        risks: true,
        invoices: true,
      }
    });
    return contracts.map(serializeContract);
  } catch (error) {
    console.error('Database connection error in getContracts:', error);
    return [];
  }
}

export async function getContractById(id: string) {
  try {
    await requireContractAccess(id, 'view');
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        company: true,
        milestones: { orderBy: { due_date: 'asc' } },
        change_requests: { orderBy: { created_at: 'desc' } },
        risks: { orderBy: { risk_level: 'desc' } },
        invoices: { orderBy: { issue_date: 'desc' } },
        credentials: { orderBy: { created_at: 'desc' }, select: CREDENTIAL_SAFE_SELECT },
      }
    });
    return serializeContract(contract);
  } catch (error) {
    console.error(`Database connection error in getContractById(${id}):`, error);
    return null;
  }
}

export async function createContract(data: z.input<typeof ContractSchema>) {
  const validated = ContractSchema.parse(data);
  if (!validated.company_id) throw new Error('A empresa do contrato é obrigatória.');
  await requireCompanyAccess(validated.company_id, 'create');
  const contract = await prisma.contract.create({
    data: {
      ...validated,
      total_value: validated.total_value,
    },
    include: {
      milestones: true,
      change_requests: true,
      risks: true,
      invoices: true,
    },
  });
  revalidatePath('/contracts');
  revalidatePath('/');
  revalidatePath('/billing');
  revalidatePath('/governance');
  return serializeContract(contract);
}

export async function updateContract(id: string, data: unknown) {
  await requireContractAccess(id, 'edit');
  // Mesmas regras de createContract, mas com todos os campos opcionais —
  // permite atualizar só um campo (ex.: { status }) sem exigir o objeto
  // inteiro, e sem abrir mão da validação (datas, enums, valores não-negativos).
  const validated = ContractSchema.partial().parse(data);
  if (validated.company_id) await requireCompanyAccess(validated.company_id, 'edit');

  const contract = await prisma.contract.update({
    where: { id },
    data: validated,
    include: {
      milestones: true,
      change_requests: true,
      risks: true,
      invoices: true,
    },
  });
  revalidatePath(`/contracts/${id}`);
  revalidatePath('/contracts');
  revalidatePath('/');
  revalidatePath('/billing');
  revalidatePath('/governance');
  return serializeContract(contract);
}

export async function deleteContract(id: string) {
  const user = await requireContractAccess(id, 'archive');
  await prisma.contract.delete({
    where: { id }
  });
  await logAudit({ userId: user.id, module: 'CONTRACTS', entityType: 'Contract', entityId: id, action: 'DELETE' });
  revalidatePath('/contracts');
  revalidatePath('/');
  revalidatePath('/billing');
  revalidatePath('/governance');
  return { success: true };
}

// ==========================================
// 2. MILESTONES SERVER ACTIONS
// ==========================================

const MilestoneSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(3),
  scope_description: z.string(),
  due_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  acceptance_criteria: z.string(),
  acceptance_status: z.nativeEnum(AcceptanceStatus).default(AcceptanceStatus.PENDING),
  billing_value: z.number().nonnegative(),
});

export async function createMilestone(data: z.input<typeof MilestoneSchema>) {
  const validated = MilestoneSchema.parse(data);
  await requireContractAccess(validated.contract_id, 'create');
  const milestone = await prisma.milestone.create({
    data: {
      ...validated,
      billing_value: validated.billing_value,
    },
  });
  revalidatePath(`/contracts/${validated.contract_id}`);
  return serializeMilestone(milestone);
}

export async function updateMilestoneAcceptance(id: string, acceptance_status: AcceptanceStatus) {
  const current = await prisma.milestone.findUnique({ where: { id }, select: { contract_id: true } });
  if (!current) throw new Error('Marco não encontrado.');
  await requireContractAccess(current.contract_id, 'approve');
  const milestone = await prisma.milestone.update({
    where: { id },
    data: { acceptance_status },
  });
  revalidatePath(`/contracts/${milestone.contract_id}`);
  revalidatePath('/billing');
  return serializeMilestone(milestone);
}

// ==========================================
// 3. CHANGE REQUESTS SERVER ACTIONS & AMENDMENTS
// ==========================================

const ChangeRequestSchema = z.object({
  contract_id: z.string().uuid(),
  title: z.string().min(3),
  requested_by: z.string().min(2),
  scope_impact: z.string(),
  financial_impact: z.number(),
  time_impact_days: z.number().int(),
  status: z.nativeEnum(ChangeRequestStatus).default(ChangeRequestStatus.DRAFT),
});

export async function createChangeRequest(data: z.infer<typeof ChangeRequestSchema>) {
  const validated = ChangeRequestSchema.parse(data);
  await requireContractAccess(validated.contract_id, 'create');
  const cr = await prisma.changeRequest.create({
    data: {
      ...validated,
      financial_impact: validated.financial_impact,
    },
  });
  revalidatePath(`/contracts/${validated.contract_id}`);
  revalidatePath('/governance');
  return serializeChangeRequest(cr);
}

export async function updateChangeRequestStatus(id: string, status: ChangeRequestStatus) {
  const currentCr = await prisma.changeRequest.findUnique({
    where: { id },
    include: { contract: true },
  });

  if (!currentCr) throw new Error("Change request not found");
  await requireContractAccess(currentCr.contract_id, 'approve');

  let amendmentContractId: string | null = null;
  const financialImpact = Number(currentCr.financial_impact);

  // Só gera um contrato de aditivo automático quando a mudança realmente
  // adiciona valor faturável. Uma mudança com impacto zero ou negativo (ex.:
  // redução de escopo) ainda pode ser aprovada normalmente — só não cria um
  // contrato com total_value negativo, que nunca passaria pela validação
  // usada em qualquer outro fluxo de criação de contrato.
  if (status === 'APPROVED' && currentCr.status !== 'APPROVED' && financialImpact > 0) {
    const parentContract = currentCr.contract;
    const start_date = new Date();

    if (parentContract.end_date < start_date) {
      throw new Error(
        `Não é possível gerar o aditivo automaticamente: o contrato original venceu em ${parentContract.end_date.toLocaleDateString('pt-BR')}. Atualize a vigência do contrato antes de aprovar esta mudança.`
      );
    }

    // Passa pela mesma validação (ContractSchema) usada em qualquer outra
    // criação de contrato, e herda company_id/nature do contrato original
    // — antes o aditivo nascia sem empresa e sempre como EXPENSE.
    const amendmentData = ContractSchema.parse({
      company_id: parentContract.company_id,
      title: `Amendment: ${currentCr.title}`,
      type: 'AMENDMENT',
      nature: parentContract.nature,
      counterpart: parentContract.counterpart,
      status: 'ACTIVE',
      start_date,
      end_date: parentContract.end_date,
      auto_renewal: parentContract.auto_renewal,
      notice_period_days: parentContract.notice_period_days,
      total_value: financialImpact,
      raw_text_or_url: `Generated from approved change request: ${currentCr.id}`,
    });

    const amendment = await prisma.contract.create({ data: amendmentData });
    amendmentContractId = amendment.id;
  }

  const updatedCr = await prisma.changeRequest.update({
    where: { id },
    data: {
      status,
      ...(amendmentContractId ? { amendment_contract_id: amendmentContractId } : {}),
    },
  });

  revalidatePath(`/contracts/${currentCr.contract_id}`);
  revalidatePath('/governance');
  return serializeChangeRequest(updatedCr);
}

export async function getChangeRequests() {
  try {
    const { companyIds } = await getAuthorizedCompanyScope('view');
    const crs = await prisma.changeRequest.findMany({
      where: companyIds === null ? {} : { contract: { company_id: { in: companyIds } } },
      orderBy: { created_at: 'desc' },
      include: {
        contract: true,
        amendment_contract: true,
      },
    });
    return crs.map((cr) => ({
      ...serializeChangeRequest(cr),
      contract: serializeContract(cr.contract),
      amendment_contract: serializeContract(cr.amendment_contract),
    }));
  } catch (error) {
    console.error('Database connection error in getChangeRequests:', error);
    return [];
  }
}

// ==========================================
// 4. CONTRACT RISKS SERVER ACTIONS
// ==========================================

const RiskSchema = z.object({
  contract_id: z.string().uuid(),
  category: z.nativeEnum(RiskCategory),
  risk_level: z.nativeEnum(RiskLevel),
  description: z.string(),
  mitigation_plan: z.string(),
  status: z.string().default("IDENTIFIED"),
});

export async function createContractRisk(data: z.infer<typeof RiskSchema>) {
  const validated = RiskSchema.parse(data);
  await requireContractAccess(validated.contract_id, 'create');
  const risk = await prisma.contractRisk.create({
    data: validated,
  });
  revalidatePath(`/contracts/${validated.contract_id}`);
  return serializeRisk(risk);
}

// ==========================================
// 5. INVOICES SERVER ACTIONS & RECONCILIATION
// ==========================================

const InvoiceSchema = z.object({
  contract_id: z.string().uuid(),
  milestone_id: z.string().uuid().optional().nullable(),
  invoice_number: z.string().min(1),
  issue_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  due_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)),
  amount: z.number().nonnegative(),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.PENDING_ACCEPTANCE),
  payment_proof_url: z.string().optional().nullable(),
});

export async function createInvoice(data: z.input<typeof InvoiceSchema>) {
  const validated = InvoiceSchema.parse(data);
  await requireContractAccess(validated.contract_id, 'create');

  if (validated.milestone_id) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: validated.milestone_id },
    });
    if (!milestone) throw new Error("Milestone not found");
    if (milestone.contract_id !== validated.contract_id) {
      throw new Error('O marco informado não pertence ao contrato selecionado.');
    }
    if (milestone.acceptance_status !== 'ACCEPTED') {
      throw new Error("Milestone must be formally ACCEPTED before issuing invoice.");
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      ...validated,
      amount: validated.amount,
      milestone_id: validated.milestone_id || null,
    },
  });

  revalidatePath(`/contracts/${validated.contract_id}`);
  revalidatePath('/billing');
  return serializeInvoice(invoice);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus, payment_proof_url?: string) {
  const current = await prisma.invoice.findUnique({ where: { id }, select: { contract_id: true } });
  if (!current) throw new Error('Fatura não encontrada.');
  await requireContractAccess(current.contract_id, 'reconcile');
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      ...(payment_proof_url ? { payment_proof_url } : {}),
    },
  });
  revalidatePath('/billing');
  revalidatePath(`/contracts/${invoice.contract_id}`);
  return serializeInvoice(invoice);
}

export async function getInvoices() {
  try {
    const { companyIds } = await getAuthorizedCompanyScope('view');
    const invoices = await prisma.invoice.findMany({
      where: companyIds === null ? {} : { contract: { company_id: { in: companyIds } } },
      orderBy: { issue_date: 'desc' },
      include: {
        contract: true,
        milestone: true,
      },
    });
    return invoices.map((inv) => ({
      ...serializeInvoice(inv),
      contract: serializeContract(inv.contract),
      milestone: serializeMilestone(inv.milestone),
    }));
  } catch (error) {
    console.error('Database connection error in getInvoices:', error);
    return [];
  }
}

// ==========================================
// 6. MONTHLY REPORTS SERVER ACTIONS
// ==========================================

const MonthlyReportSchema = z.object({
  period_month_year: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
  performed_activities: z.array(z.string()),
  next_month_plan: z.array(z.string()),
  status: z.nativeEnum(MonthlyReportStatus).default(MonthlyReportStatus.DRAFT),
});

export async function getMonthlyReports() {
  try {
    const { companyIds } = await getAuthorizedCompanyScope('view');
    const reports = await prisma.monthlyReport.findMany({
      where: companyIds === null ? {} : { company_id: { in: companyIds } },
      orderBy: { period_month_year: 'desc' },
    });
    return reports.map(serializeReport);
  } catch (error) {
    console.error('Database connection error in getMonthlyReports:', error);
    return [];
  }
}

export async function createMonthlyReport(data: z.infer<typeof MonthlyReportSchema>) {
  await requireGlobalAccess('create');
  const validated = MonthlyReportSchema.parse(data);
  
  const report = await prisma.monthlyReport.create({
    data: {
      period_month_year: validated.period_month_year,
      performed_activities: validated.performed_activities,
      next_month_plan: validated.next_month_plan,
      status: validated.status,
    },
  });
  
  revalidatePath('/reports');
  return serializeReport(report);
}

const MonthlyReportUpdateSchema = MonthlyReportSchema.partial().extend({
  generated_pdf_url: z.string().optional(),
});

export async function updateMonthlyReport(id: string, data: unknown) {
  await requireGlobalAccess('edit');
  const validated = MonthlyReportUpdateSchema.parse(data);
  const report = await prisma.monthlyReport.update({
    where: { id },
    data: validated,
  });
  revalidatePath('/reports');
  return serializeReport(report);
}

// ==========================================
// 7. CONTRACT CREDENTIALS / VAULT SERVER ACTIONS
// ==========================================

const CredentialSchema = z.object({
  contract_id: z.string().uuid().optional().nullable(),
  type: z.enum(['PORTAL_LOGIN', 'API_KEY', 'SOFTWARE_LICENSE', 'SERVICE_ACCOUNT', 'PERSONAL_ACCOUNT', 'OTHER']).default('PORTAL_LOGIN'),
  title: z.string().min(2, "Título é obrigatório"),
  username: z.string().optional().nullable(),
  secret_value: z.string().min(1, "Senha ou chave secreta é obrigatória"),
  login_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Campos seguros para listagem: NUNCA inclui secret_value.
// O segredo só é buscado sob demanda por getCredentialSecret(), quando o
// usuário explicitamente pede para revelar ou copiar uma credencial.
const CREDENTIAL_SAFE_SELECT = {
  id: true,
  contract_id: true,
  type: true,
  title: true,
  username: true,
  login_url: true,
  notes: true,
  created_at: true,
  updated_at: true,
} as const;

import { encryptSecret, decryptSecret } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';

export async function createContractCredential(data: z.input<typeof CredentialSchema>) {
  const validated = CredentialSchema.parse(data);
  const user = validated.contract_id
    ? await requireContractAccess(validated.contract_id, 'edit')
    : await requireGlobalAccess('edit');
  const encryptedSecret = encryptSecret(validated.secret_value);
  const credential = await prisma.contractCredential.create({
    data: {
      ...validated,
      secret_value: encryptedSecret,
    },
  });
  
  await logAudit({
    userId: user.id,
    module: 'VAULT',
    entityType: 'ContractCredential',
    entityId: credential.id,
    action: 'CREATE',
    companyId: credential.contract_id ? (await prisma.contract.findUnique({ where: { id: credential.contract_id }, select: { company_id: true } }))?.company_id : null,
  });

  revalidatePath(`/contracts/${validated.contract_id}`);
  return serializeCredential(credential);
}

export async function deleteContractCredential(id: string) {
  const existing = await prisma.contractCredential.findUnique({ where: { id }, select: { contract_id: true } });
  if (!existing) throw new Error('Credencial não encontrada.');
  const user = existing.contract_id
    ? await requireContractAccess(existing.contract_id, 'edit')
    : await requireGlobalAccess('edit');
  const cred = await prisma.contractCredential.delete({
    where: { id },
  });
  if (cred.contract_id) {
    revalidatePath(`/contracts/${cred.contract_id}`);
  }
  revalidatePath('/');
  await logAudit({ userId: user.id, module: 'VAULT', entityType: 'ContractCredential', entityId: id, action: 'DELETE' });
  return { success: true };
}

export async function getStandaloneCredentials() {
  try {
    await requireGlobalAccess('view');
    const creds = await prisma.contractCredential.findMany({
      where: { contract_id: null },
      orderBy: { created_at: 'desc' },
      select: CREDENTIAL_SAFE_SELECT,
    });
    return creds.map(serializeCredential);
  } catch (error) {
    console.error('Database connection error in getStandaloneCredentials:', error);
    return [];
  }
}

// Busca e descriptografa o segredo de UMA credencial, sob demanda.
// Registra auditoria ao revelar a credencial.
export async function getCredentialSecret(id: string): Promise<string> {
  const credential = await prisma.contractCredential.findUnique({
    where: { id },
    select: { id: true, secret_value: true, contract_id: true, title: true },
  });
  if (!credential) {
    throw new Error('Credencial não encontrada.');
  }
  const user = credential.contract_id
    ? await requireContractAccess(credential.contract_id, 'reveal_credential')
    : await requireGlobalAccess('reveal_credential');

  await logAudit({
    userId: user.id,
    module: 'VAULT',
    entityType: 'ContractCredential',
    entityId: credential.id,
    action: 'REVEAL_SECRET',
    reason: `Revelação da credencial: ${credential.title}`,
  });

  return decryptSecret(credential.secret_value);
}

export async function getDashboardData() {
  try {
    // As quatro consultas são independentes entre si — rodá-las em paralelo
    // (em vez de uma await por vez, em série) reduz o tempo total de resposta
    // ao tempo da mais lenta delas, não à soma de todas.
    const [contracts, changeRequests, invoices, standaloneCredentials] = await Promise.all([
      getContracts(),
      getChangeRequests(),
      getInvoices(),
      getStandaloneCredentials(),
    ]);

    const milestones = contracts.flatMap((c: any) => c.milestones || []);
    const risks = contracts.flatMap((c: any) => c.risks || []);

    return {
      contracts,
      milestones,
      changeRequests,
      risks,
      invoices,
      standaloneCredentials,
    };
  } catch (error) {
    console.error('Database connection error in getDashboardData:', error);
    return {
      contracts: [],
      milestones: [],
      changeRequests: [],
      risks: [],
      invoices: [],
      standaloneCredentials: [],
    };
  }
}
