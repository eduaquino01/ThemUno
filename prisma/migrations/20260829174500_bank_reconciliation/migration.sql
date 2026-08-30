CREATE TABLE "BankStatementImport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "bank_account_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "source_hash" TEXT NOT NULL,
  "imported_rows" INTEGER NOT NULL DEFAULT 0,
  "ignored_rows" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankStatementImport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BankStatementImport_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BankTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "bank_account_id" TEXT NOT NULL,
  "statement_import_id" TEXT NOT NULL,
  "financial_entry_id" TEXT,
  "transaction_date" DATETIME NOT NULL,
  "description" TEXT NOT NULL,
  "document_number" TEXT,
  "amount" DECIMAL NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "match_status" TEXT NOT NULL DEFAULT 'UNMATCHED',
  "matched_by_id" TEXT,
  "matched_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankTransaction_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BankTransaction_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BankTransaction_statement_import_id_fkey" FOREIGN KEY ("statement_import_id") REFERENCES "BankStatementImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BankTransaction_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "FinancialEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BankStatementImport_bank_account_id_source_hash_key" ON "BankStatementImport"("bank_account_id", "source_hash");
CREATE INDEX "BankStatementImport_company_id_created_at_idx" ON "BankStatementImport"("company_id", "created_at");
CREATE UNIQUE INDEX "BankTransaction_bank_account_id_fingerprint_key" ON "BankTransaction"("bank_account_id", "fingerprint");
CREATE INDEX "BankTransaction_company_id_match_status_transaction_date_idx" ON "BankTransaction"("company_id", "match_status", "transaction_date");
CREATE INDEX "BankTransaction_financial_entry_id_idx" ON "BankTransaction"("financial_entry_id");
