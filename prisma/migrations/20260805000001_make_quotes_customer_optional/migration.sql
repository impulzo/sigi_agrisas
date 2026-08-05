-- Complete the fix started in 20260626000001_make_sales_customer_optional: that migration's
-- comment claimed "Make customer_id optional on sales and quotes" but its SQL only touched
-- "sales" — "quotes"."customer_id" remained NOT NULL in the real DB while schema.prisma
-- (Quote.customerId String? , onDelete: SetNull) and all application code (CreateQuoteUseCase,
-- PrismaQuoteRepository.createWithItems) already assumed it was nullable. This caused every
-- quote created without a customer to fail with Postgres error 23502 (not_null_violation).
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_customer_id_fkey";
ALTER TABLE "quotes" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
