-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "cost_center_id" TEXT,
    "partner_id" TEXT,
    "import_id" TEXT,
    "scenario" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "description" TEXT,
    "document_number" TEXT,
    "sankhya_nufin" TEXT,
    "settlement_status" TEXT NOT NULL DEFAULT 'OPEN',
    "reconciliation_status" TEXT NOT NULL DEFAULT 'UNRECONCILED',
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "due_date" DATETIME,
    "settlement_date" DATETIME,
    "amount" DECIMAL NOT NULL,
    "is_internal_transfer" BOOLEAN NOT NULL DEFAULT false,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "source_ref" TEXT,
    "deleted_at" DATETIME,
    "deleted_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FinancialEntry_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "Partner" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "FinancialImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialEntry" ("account_name", "amount", "bank_account_id", "category_id", "company_id", "created_at", "deleted_at", "deleted_by", "description", "document_number", "due_date", "id", "import_id", "is_internal_transfer", "is_reconciled", "nature", "period_end", "period_start", "reconciliation_status", "sankhya_nufin", "scenario", "settlement_date", "settlement_status", "source", "source_ref", "updated_at") SELECT "account_name", "amount", "bank_account_id", "category_id", "company_id", "created_at", "deleted_at", "deleted_by", "description", "document_number", "due_date", "id", "import_id", "is_internal_transfer", "is_reconciled", "nature", "period_end", "period_start", "reconciliation_status", "sankhya_nufin", "scenario", "settlement_date", "settlement_status", "source", "source_ref", "updated_at" FROM "FinancialEntry";
DROP TABLE "FinancialEntry";
ALTER TABLE "new_FinancialEntry" RENAME TO "FinancialEntry";
CREATE INDEX "FinancialEntry_company_id_period_start_scenario_idx" ON "FinancialEntry"("company_id", "period_start", "scenario");
CREATE INDEX "FinancialEntry_company_id_nature_category_id_idx" ON "FinancialEntry"("company_id", "nature", "category_id");
CREATE INDEX "FinancialEntry_import_id_idx" ON "FinancialEntry"("import_id");
CREATE INDEX "FinancialEntry_company_id_settlement_status_due_date_idx" ON "FinancialEntry"("company_id", "settlement_status", "due_date");
CREATE INDEX "FinancialEntry_cost_center_id_idx" ON "FinancialEntry"("cost_center_id");
CREATE INDEX "FinancialEntry_partner_id_idx" ON "FinancialEntry"("partner_id");
CREATE UNIQUE INDEX "FinancialEntry_company_id_sankhya_nufin_key" ON "FinancialEntry"("company_id", "sankhya_nufin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
