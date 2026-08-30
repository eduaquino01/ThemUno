CREATE TABLE "FinancialProjectionScenario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "revenue_adjustment" DECIMAL NOT NULL DEFAULT 0,
  "expense_adjustment" DECIMAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "FinancialProjectionScenario_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialProjectionScenario_company_id_name_year_key" ON "FinancialProjectionScenario"("company_id", "name", "year");
CREATE INDEX "FinancialProjectionScenario_company_id_year_idx" ON "FinancialProjectionScenario"("company_id", "year");
