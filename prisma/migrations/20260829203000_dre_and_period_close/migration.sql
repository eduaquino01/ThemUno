ALTER TABLE "FinancialCategory" ADD COLUMN "dre_group" TEXT NOT NULL DEFAULT 'OPERATING_EXPENSE';
UPDATE "FinancialCategory" SET "dre_group" = 'GROSS_REVENUE' WHERE "nature" = 'REVENUE';

CREATE TABLE "FinancialPeriodClose" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CLOSED',
  "notes" TEXT,
  "closed_by_id" TEXT,
  "closed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reopened_by_id" TEXT,
  "reopened_at" DATETIME,
  CONSTRAINT "FinancialPeriodClose_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinancialPeriodClose_company_id_year_month_key" ON "FinancialPeriodClose"("company_id", "year", "month");
CREATE INDEX "FinancialPeriodClose_company_id_status_year_month_idx" ON "FinancialPeriodClose"("company_id", "status", "year", "month");
