-- AlterTable
ALTER TABLE "emitter_fiscal_settings" ADD COLUMN     "address" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "issuer_address" TEXT;
