-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContractNature" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MSA', 'SOW', 'SLA', 'NDA', 'SAAS', 'HARDWARE', 'PARTNERSHIP', 'AMENDMENT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AcceptanceStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('LGPD', 'FINANCIAL', 'OPERATIONAL', 'IP', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ISSUED', 'PAID', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MonthlyReportStatus" AS ENUM ('DRAFT', 'CONSOLIDATED', 'SENT');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PORTAL_LOGIN', 'API_KEY', 'SOFTWARE_LICENSE', 'SERVICE_ACCOUNT', 'PERSONAL_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialNature" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialScenario" AS ENUM ('PLANNED', 'ACTUAL');

-- CreateEnum
CREATE TYPE "FinancialImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DIRETORIA', 'FINANCEIRO', 'CONTRATOS', 'CONSULTA');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONSULTA',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "company_id" TEXT,
    "module" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "previous_values" TEXT,
    "new_values" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tax_id" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "is_holding" BOOLEAN NOT NULL DEFAULT false,
    "financial_approval_threshold" DECIMAL(65,30) NOT NULL DEFAULT 10000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialProjectionScenario" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "revenue_adjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "expense_adjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialProjectionScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'SUPPLIER',
    "name" TEXT NOT NULL,
    "tax_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT,
    "account_number" TEXT,
    "opening_balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "FinancialNature" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "dre_group" TEXT NOT NULL DEFAULT 'OPERATING_EXPENSE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPeriodClose" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "notes" TEXT,
    "closed_by_id" TEXT,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reopened_by_id" TEXT,
    "reopened_at" TIMESTAMP(3),

    CONSTRAINT "FinancialPeriodClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenterBudget" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "planned_amount" DECIMAL(65,30) NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenterBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialImport" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "status" "FinancialImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "ignored_rows" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "cost_center_id" TEXT,
    "partner_id" TEXT,
    "import_id" TEXT,
    "scenario" "FinancialScenario" NOT NULL,
    "nature" "FinancialNature" NOT NULL,
    "account_name" TEXT NOT NULL,
    "description" TEXT,
    "document_number" TEXT,
    "sankhya_nufin" TEXT,
    "settlement_status" TEXT NOT NULL DEFAULT 'OPEN',
    "approval_status" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "reconciliation_status" TEXT NOT NULL DEFAULT 'UNRECONCILED',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "settlement_date" TIMESTAMP(3),
    "amount" DECIMAL(65,30) NOT NULL,
    "is_internal_transfer" BOOLEAN NOT NULL DEFAULT false,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "source_ref" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRule" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT,
    "account_contains" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRuleItem" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationRuleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAllocation" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "financial_entry_id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "percentage" DECIMAL(65,30) NOT NULL,
    "allocated_amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementImport" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "source_hash" TEXT NOT NULL,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "ignored_rows" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "statement_import_id" TEXT NOT NULL,
    "financial_entry_id" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "document_number" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "match_status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "matched_by_id" TEXT,
    "matched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "title" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "nature" "ContractNature" NOT NULL DEFAULT 'EXPENSE',
    "counterpart" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "total_value" DECIMAL(65,30) NOT NULL,
    "raw_text_or_url" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope_description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "acceptance_status" "AcceptanceStatus" NOT NULL DEFAULT 'PENDING',
    "billing_value" DECIMAL(65,30) NOT NULL,
    "invoice_id" TEXT,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "scope_impact" TEXT NOT NULL,
    "financial_impact" DECIMAL(65,30) NOT NULL,
    "time_impact_days" INTEGER NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "amendment_contract_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRisk" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "mitigation_plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "milestone_id" TEXT,
    "contract_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "payment_proof_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractCredential" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT,
    "type" "CredentialType" NOT NULL DEFAULT 'PORTAL_LOGIN',
    "title" TEXT NOT NULL,
    "username" TEXT,
    "secret_value" TEXT NOT NULL,
    "login_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "period_month_year" TEXT NOT NULL,
    "performed_activities" JSONB NOT NULL,
    "next_month_plan" JSONB NOT NULL,
    "generated_pdf_url" TEXT,
    "status" "MonthlyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_user_id_company_id_key" ON "UserCompany"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_created_at_idx" ON "AuditLog"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "AuditLog_company_id_module_idx" ON "AuditLog"("company_id", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE INDEX "FinancialProjectionScenario_company_id_year_idx" ON "FinancialProjectionScenario"("company_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialProjectionScenario_company_id_name_year_key" ON "FinancialProjectionScenario"("company_id", "name", "year");

-- CreateIndex
CREATE INDEX "CostCenter_company_id_is_active_idx" ON "CostCenter"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_company_id_code_key" ON "CostCenter"("company_id", "code");

-- CreateIndex
CREATE INDEX "Partner_company_id_type_is_active_idx" ON "Partner"("company_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_company_id_tax_id_key" ON "Partner"("company_id", "tax_id");

-- CreateIndex
CREATE INDEX "BankAccount_company_id_idx" ON "BankAccount"("company_id");

-- CreateIndex
CREATE INDEX "FinancialCategory_company_id_nature_idx" ON "FinancialCategory"("company_id", "nature");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_company_id_nature_name_key" ON "FinancialCategory"("company_id", "nature", "name");

-- CreateIndex
CREATE INDEX "FinancialPeriodClose_company_id_status_year_month_idx" ON "FinancialPeriodClose"("company_id", "status", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPeriodClose_company_id_year_month_key" ON "FinancialPeriodClose"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "CostCenterBudget_company_id_year_month_idx" ON "CostCenterBudget"("company_id", "year", "month");

-- CreateIndex
CREATE INDEX "CostCenterBudget_cost_center_id_year_idx" ON "CostCenterBudget"("cost_center_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenterBudget_company_id_cost_center_id_category_id_year_key" ON "CostCenterBudget"("company_id", "cost_center_id", "category_id", "year", "month");

-- CreateIndex
CREATE INDEX "FinancialImport_company_id_created_at_idx" ON "FinancialImport"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialImport_company_id_source_key_key" ON "FinancialImport"("company_id", "source_key");

-- CreateIndex
CREATE INDEX "FinancialEntry_company_id_period_start_scenario_idx" ON "FinancialEntry"("company_id", "period_start", "scenario");

-- CreateIndex
CREATE INDEX "FinancialEntry_company_id_nature_category_id_idx" ON "FinancialEntry"("company_id", "nature", "category_id");

-- CreateIndex
CREATE INDEX "FinancialEntry_import_id_idx" ON "FinancialEntry"("import_id");

-- CreateIndex
CREATE INDEX "FinancialEntry_company_id_settlement_status_due_date_idx" ON "FinancialEntry"("company_id", "settlement_status", "due_date");

-- CreateIndex
CREATE INDEX "FinancialEntry_company_id_approval_status_due_date_idx" ON "FinancialEntry"("company_id", "approval_status", "due_date");

-- CreateIndex
CREATE INDEX "FinancialEntry_cost_center_id_idx" ON "FinancialEntry"("cost_center_id");

-- CreateIndex
CREATE INDEX "FinancialEntry_partner_id_idx" ON "FinancialEntry"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEntry_company_id_sankhya_nufin_key" ON "FinancialEntry"("company_id", "sankhya_nufin");

-- CreateIndex
CREATE INDEX "AllocationRule_company_id_is_active_idx" ON "AllocationRule"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "AllocationRuleItem_cost_center_id_idx" ON "AllocationRuleItem"("cost_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationRuleItem_rule_id_cost_center_id_key" ON "AllocationRuleItem"("rule_id", "cost_center_id");

-- CreateIndex
CREATE INDEX "FinancialAllocation_company_id_cost_center_id_idx" ON "FinancialAllocation"("company_id", "cost_center_id");

-- CreateIndex
CREATE INDEX "FinancialAllocation_rule_id_idx" ON "FinancialAllocation"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAllocation_financial_entry_id_cost_center_id_key" ON "FinancialAllocation"("financial_entry_id", "cost_center_id");

-- CreateIndex
CREATE INDEX "BankStatementImport_company_id_created_at_idx" ON "BankStatementImport"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementImport_bank_account_id_source_hash_key" ON "BankStatementImport"("bank_account_id", "source_hash");

-- CreateIndex
CREATE INDEX "BankTransaction_company_id_match_status_transaction_date_idx" ON "BankTransaction"("company_id", "match_status", "transaction_date");

-- CreateIndex
CREATE INDEX "BankTransaction_financial_entry_id_idx" ON "BankTransaction"("financial_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_bank_account_id_fingerprint_key" ON "BankTransaction"("bank_account_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_amendment_contract_id_key" ON "ChangeRequest"("amendment_contract_id");

-- CreateIndex
CREATE INDEX "Invoice_contract_id_invoice_number_idx" ON "Invoice"("contract_id", "invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_company_id_period_month_year_key" ON "MonthlyReport"("company_id", "period_month_year");

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialProjectionScenario" ADD CONSTRAINT "FinancialProjectionScenario_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPeriodClose" ADD CONSTRAINT "FinancialPeriodClose_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenterBudget" ADD CONSTRAINT "CostCenterBudget_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenterBudget" ADD CONSTRAINT "CostCenterBudget_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCenterBudget" ADD CONSTRAINT "CostCenterBudget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialImport" ADD CONSTRAINT "FinancialImport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "FinancialImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRuleItem" ADD CONSTRAINT "AllocationRuleItem_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "AllocationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationRuleItem" ADD CONSTRAINT "AllocationRuleItem_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "FinancialEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAllocation" ADD CONSTRAINT "FinancialAllocation_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "AllocationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_statement_import_id_fkey" FOREIGN KEY ("statement_import_id") REFERENCES "BankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_amendment_contract_id_fkey" FOREIGN KEY ("amendment_contract_id") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRisk" ADD CONSTRAINT "ContractRisk_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCredential" ADD CONSTRAINT "ContractCredential_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
