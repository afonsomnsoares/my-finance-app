-- Money fields were stored as double precision (Float), which is not safe
-- for currency arithmetic (binary floating point cannot represent most
-- decimal fractions exactly, e.g. 0.1 + 0.2 !== 0.3). Switch them all to
-- exact-precision DECIMAL(65,30), matching Prisma's default mapping for
-- the `Decimal` scalar type on PostgreSQL.
--
-- USING col::numeric is a lossless cast for the values already stored
-- (they came from parseFloat() on 2-decimal user input), so no data is
-- lost by this migration.

ALTER TABLE "users"
  ALTER COLUMN "monthly_income" TYPE DECIMAL(65,30) USING "monthly_income"::numeric,
  ALTER COLUMN "monthly_expenses" TYPE DECIMAL(65,30) USING "monthly_expenses"::numeric,
  ALTER COLUMN "fixed_expenses" TYPE DECIMAL(65,30) USING "fixed_expenses"::numeric,
  ALTER COLUMN "savings_target" TYPE DECIMAL(65,30) USING "savings_target"::numeric;

ALTER TABLE "category_budgets"
  ALTER COLUMN "monthly_limit" TYPE DECIMAL(65,30) USING "monthly_limit"::numeric;

ALTER TABLE "transactions"
  ALTER COLUMN "amount" TYPE DECIMAL(65,30) USING "amount"::numeric;

ALTER TABLE "investments"
  ALTER COLUMN "amount" TYPE DECIMAL(65,30) USING "amount"::numeric,
  ALTER COLUMN "buy_price" TYPE DECIMAL(65,30) USING "buy_price"::numeric;
