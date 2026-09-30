-- CreateTable
CREATE TABLE "category_budgets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "monthly_limit" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_budgets_user_id_category_key" ON "category_budgets"("user_id", "category");

-- AddForeignKey
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
