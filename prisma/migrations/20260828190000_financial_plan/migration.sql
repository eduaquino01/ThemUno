-- CreateTable
CREATE TABLE "BankAccount" (
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

CREATE TABLE "FinancialCategory" (
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

CREATE TABLE "FinancialImport" (
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

CREATE TABLE "FinancialEntry" (
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

CREATE INDEX "BankAccount_company_id_idx" ON "BankAccount"("company_id");
CREATE INDEX "FinancialCategory_company_id_nature_idx" ON "FinancialCategory"("company_id", "nature");
CREATE UNIQUE INDEX "FinancialCategory_company_id_nature_name_key" ON "FinancialCategory"("company_id", "nature", "name");
CREATE INDEX "FinancialImport_company_id_created_at_idx" ON "FinancialImport"("company_id", "created_at");
CREATE UNIQUE INDEX "FinancialImport_company_id_source_key_key" ON "FinancialImport"("company_id", "source_key");
CREATE INDEX "FinancialEntry_company_id_period_start_scenario_idx" ON "FinancialEntry"("company_id", "period_start", "scenario");
CREATE INDEX "FinancialEntry_company_id_nature_category_id_idx" ON "FinancialEntry"("company_id", "nature", "category_id");
CREATE INDEX "FinancialEntry_import_id_idx" ON "FinancialEntry"("import_id");
