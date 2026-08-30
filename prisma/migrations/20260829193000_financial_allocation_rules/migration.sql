CREATE TABLE "AllocationRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category_id" TEXT,
  "account_contains" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "AllocationRule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AllocationRule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "FinancialCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AllocationRuleItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rule_id" TEXT NOT NULL,
  "cost_center_id" TEXT NOT NULL,
  "percentage" DECIMAL NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllocationRuleItem_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "AllocationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AllocationRuleItem_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "FinancialAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "financial_entry_id" TEXT NOT NULL,
  "cost_center_id" TEXT NOT NULL,
  "rule_id" TEXT,
  "percentage" DECIMAL NOT NULL,
  "allocated_amount" DECIMAL NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAllocation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinancialAllocation_financial_entry_id_fkey" FOREIGN KEY ("financial_entry_id") REFERENCES "FinancialEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FinancialAllocation_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "CostCenter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FinancialAllocation_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "AllocationRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AllocationRule_company_id_is_active_idx" ON "AllocationRule"("company_id", "is_active");
CREATE UNIQUE INDEX "AllocationRuleItem_rule_id_cost_center_id_key" ON "AllocationRuleItem"("rule_id", "cost_center_id");
CREATE INDEX "AllocationRuleItem_cost_center_id_idx" ON "AllocationRuleItem"("cost_center_id");
CREATE UNIQUE INDEX "FinancialAllocation_financial_entry_id_cost_center_id_key" ON "FinancialAllocation"("financial_entry_id", "cost_center_id");
CREATE INDEX "FinancialAllocation_company_id_cost_center_id_idx" ON "FinancialAllocation"("company_id", "cost_center_id");
CREATE INDEX "FinancialAllocation_rule_id_idx" ON "FinancialAllocation"("rule_id");
