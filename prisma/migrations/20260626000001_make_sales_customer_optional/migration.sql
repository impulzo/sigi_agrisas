-- Make customer_id optional on sales and quotes (aligning DB with Prisma schema String?)
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_customer_id_fkey";
ALTER TABLE "sales" ALTER COLUMN "customer_id" DROP NOT NULL;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
