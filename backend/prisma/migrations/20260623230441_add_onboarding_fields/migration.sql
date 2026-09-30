-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "financial_goal" TEXT,
ADD COLUMN     "monthly_income" DOUBLE PRECISION,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
