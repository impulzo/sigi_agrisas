-- AlterTable
ALTER TABLE "ticket_settings" ADD COLUMN     "business_email" VARCHAR(200);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "issuer_email" VARCHAR(200);
