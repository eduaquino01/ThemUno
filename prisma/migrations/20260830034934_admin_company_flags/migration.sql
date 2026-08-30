-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tax_id" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "is_holding" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContractCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PORTAL_LOGIN',
    "title" TEXT NOT NULL,
    "username" TEXT,
    "secret_value" TEXT NOT NULL,
    "login_url" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ContractCredential_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT,
    "account_number" TEXT,
    "opening_balance" DECIMAL NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "BankAccount_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankAccount" ("account_number", "bank_name", "branch", "company_id", "created_at", "id", "is_active", "opening_balance", "updated_at") SELECT "account_number", "bank_name", "branch", "company_id", "created_at", "id", "is_active", "opening_balance", "updated_at" FROM "BankAccount";
DROP TABLE "BankAccount";
ALTER TABLE "new_BankAccount" RENAME TO "BankAccount";
CREATE INDEX "BankAccount_company_id_idx" ON "BankAccount"("company_id");
CREATE TABLE "new_Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nature" TEXT NOT NULL DEFAULT 'EXPENSE',
    "counterpart" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER NOT NULL DEFAULT 30,
    "total_value" DECIMAL NOT NULL,
    "raw_text_or_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Contract_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contract" ("auto_renewal", "counterpart", "created_at", "end_date", "id", "notice_period_days", "raw_text_or_url", "start_date", "status", "title", "total_value", "type", "updated_at") SELECT "auto_renewal", "counterpart", "created_at", "end_date", "id", "notice_period_days", "raw_text_or_url", "start_date", "status", "title", "total_value", "type", "updated_at" FROM "Contract";
DROP TABLE "Contract";
ALTER TABLE "new_Contract" RENAME TO "Contract";
CREATE TABLE "new_FinancialCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FinancialCategory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialCategory" ("company_id", "created_at", "id", "is_active", "name", "nature", "sort_order", "updated_at") SELECT "company_id", "created_at", "id", "is_active", "name", "nature", "sort_order", "updated_at" FROM "FinancialCategory";
DROP TABLE "FinancialCategory";
ALTER TABLE "new_FinancialCategory" RENAME TO "FinancialCategory";
CREATE INDEX "FinancialCategory_company_id_nature_idx" ON "FinancialCategory"("company_id", "nature");
CREATE UNIQUE INDEX "FinancialCategory_company_id_nature_name_key" ON "FinancialCategory"("company_id", "nature", "name");
CREATE TABLE "new_FinancialEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "import_id" TEXT,
    "scenario" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "description" TEXT,
    "document_number" TEXT,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "due_date" DATETIME,
    "settlement_date" DATETIME,
    "amount" DECIMAL NOT NULL,
    "is_internal_transfer" BOOLEAN NOT NULL DEFAULT false,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "source_ref" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FinancialEntry_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialEntry_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "FinancialImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FinancialEntry" ("account_name", "amount", "bank_account_id", "category_id", "company_id", "created_at", "description", "document_number", "due_date", "id", "import_id", "is_internal_transfer", "is_reconciled", "nature", "period_end", "period_start", "scenario", "settlement_date", "source", "source_ref", "updated_at") SELECT "account_name", "amount", "bank_account_id", "category_id", "company_id", "created_at", "description", "document_number", "due_date", "id", "import_id", "is_internal_transfer", "is_reconciled", "nature", "period_end", "period_start", "scenario", "settlement_date", "source", "source_ref", "updated_at" FROM "FinancialEntry";
DROP TABLE "FinancialEntry";
ALTER TABLE "new_FinancialEntry" RENAME TO "FinancialEntry";
CREATE INDEX "FinancialEntry_company_id_period_start_scenario_idx" ON "FinancialEntry"("company_id", "period_start", "scenario");
CREATE INDEX "FinancialEntry_company_id_nature_category_id_idx" ON "FinancialEntry"("company_id", "nature", "category_id");
CREATE INDEX "FinancialEntry_import_id_idx" ON "FinancialEntry"("import_id");
CREATE TABLE "new_FinancialImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "ignored_rows" INTEGER NOT NULL DEFAULT 0,
    "warning_rows" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialImport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FinancialImport" ("company_id", "created_at", "file_name", "id", "ignored_rows", "imported_rows", "notes", "source_key", "status", "warning_rows") SELECT "company_id", "created_at", "file_name", "id", "ignored_rows", "imported_rows", "notes", "source_key", "status", "warning_rows" FROM "FinancialImport";
DROP TABLE "FinancialImport";
ALTER TABLE "new_FinancialImport" RENAME TO "FinancialImport";
CREATE INDEX "FinancialImport_company_id_created_at_idx" ON "FinancialImport"("company_id", "created_at");
CREATE UNIQUE INDEX "FinancialImport_company_id_source_key_key" ON "FinancialImport"("company_id", "source_key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");
