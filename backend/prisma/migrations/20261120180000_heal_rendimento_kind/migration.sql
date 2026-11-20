-- Rows created while POST ignored `kind` kept category Rendimento as expense.
UPDATE "transactions"
SET "kind" = 'income'
WHERE "category" = 'Rendimento' AND "kind" <> 'income';
