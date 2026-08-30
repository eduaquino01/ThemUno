ALTER TABLE "Company" ADD COLUMN "financial_approval_threshold" DECIMAL NOT NULL DEFAULT 10000;

ALTER TABLE "FinancialEntry" ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "FinancialEntry" ADD COLUMN "approval_required" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinancialEntry" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "FinancialEntry" ADD COLUMN "reviewed_by_id" TEXT;
ALTER TABLE "FinancialEntry" ADD COLUMN "reviewed_at" DATETIME;
ALTER TABLE "FinancialEntry" ADD COLUMN "rejection_reason" TEXT;

CREATE INDEX "FinancialEntry_company_id_approval_status_due_date_idx"
ON "FinancialEntry"("company_id", "approval_status", "due_date");
