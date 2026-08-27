-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "issuer_rfc" VARCHAR(14),
ADD COLUMN     "issuer_legal_name" VARCHAR(200),
ADD COLUMN     "issuer_fiscal_regime" VARCHAR(4),
ADD COLUMN     "issuer_zip_code" VARCHAR(5);
