-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "counterpart" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "total_value" DECIMAL NOT NULL,
    "raw_text_or_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope_description" TEXT NOT NULL,
    "due_date" DATETIME NOT NULL,
    "acceptance_criteria" TEXT NOT NULL,
    "acceptance_status" TEXT NOT NULL DEFAULT 'PENDING',
    "billing_value" DECIMAL NOT NULL,
    "invoice_id" TEXT,
    CONSTRAINT "Milestone_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "scope_impact" TEXT NOT NULL,
    "financial_impact" DECIMAL NOT NULL,
    "time_impact_days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "amendment_contract_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ChangeRequest_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChangeRequest_amendment_contract_id_fkey" FOREIGN KEY ("amendment_contract_id") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractRisk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mitigation_plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ContractRisk_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestone_id" TEXT,
    "contract_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    "payment_proof_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Invoice_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "Milestone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period_month_year" TEXT NOT NULL,
    "performed_activities" JSONB NOT NULL,
    "next_month_plan" JSONB NOT NULL,
    "generated_pdf_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_amendment_contract_id_key" ON "ChangeRequest"("amendment_contract_id");
