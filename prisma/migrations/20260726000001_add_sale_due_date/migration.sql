-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "credit_days" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "due_date" TIMESTAMP(3);
