CREATE TABLE "CostCenterBudget" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "cost_center_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "planned_amount" DECIMAL NOT NULL,
  "created_by_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "CostCenterBudget_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CostCenterBudget_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CostCenterBudget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CostCenterBudget_company_id_cost_center_id_category_id_year_month_key"
ON "CostCenterBudget"("company_id", "cost_center_id", "category_id", "year", "month");
CREATE INDEX "CostCenterBudget_company_id_year_month_idx" ON "CostCenterBudget"("company_id", "year", "month");
CREATE INDEX "CostCenterBudget_cost_center_id_year_idx" ON "CostCenterBudget"("cost_center_id", "year");
