-- Imported actual entries represent transactions that have already been settled.
UPDATE "FinancialEntry"
SET "settlement_status" = 'SETTLED'
WHERE "scenario" = 'ACTUAL'
  AND "settlement_status" = 'OPEN';
