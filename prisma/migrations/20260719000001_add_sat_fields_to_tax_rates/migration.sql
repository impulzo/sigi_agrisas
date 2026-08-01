-- AlterTable: widen rate precision to 6 decimals (0.000000 format)
ALTER TABLE "tax_rates" ALTER COLUMN "rate" TYPE DECIMAL(9,6);

-- AlterTable: add SAT classification fields with transitional defaults for backfill
ALTER TABLE "tax_rates" ADD COLUMN "sat_tax_code" VARCHAR(3) NOT NULL DEFAULT '002';
ALTER TABLE "tax_rates" ADD COLUMN "factor_type" VARCHAR(10) NOT NULL DEFAULT 'Tasa';
ALTER TABLE "tax_rates" ADD COLUMN "display_value" DECIMAL(9,4) NOT NULL DEFAULT 0;

-- AlterTable: add optional accounting accounts (no default, nullable)
ALTER TABLE "tax_rates" ADD COLUMN "transferred_account" VARCHAR(20);
ALTER TABLE "tax_rates" ADD COLUMN "pending_transferred_account" VARCHAR(20);
ALTER TABLE "tax_rates" ADD COLUMN "credited_account" VARCHAR(20);
ALTER TABLE "tax_rates" ADD COLUMN "pending_credited_account" VARCHAR(20);

-- Backfill canonical seeded rows (see prisma/seeds/taxRates.ts)
UPDATE "tax_rates" SET "sat_tax_code" = '002', "factor_type" = 'Tasa', "display_value" = 16 WHERE "code" = 'IVA_16';
UPDATE "tax_rates" SET "sat_tax_code" = '003', "factor_type" = 'Tasa', "display_value" = 8 WHERE "code" = 'IEPS_8';
UPDATE "tax_rates" SET "sat_tax_code" = '002', "factor_type" = 'Tasa', "display_value" = 0 WHERE "code" = 'IVA_0';

-- Drop transitional defaults now that existing rows are backfilled; new inserts must provide values explicitly
ALTER TABLE "tax_rates" ALTER COLUMN "sat_tax_code" DROP DEFAULT;
ALTER TABLE "tax_rates" ALTER COLUMN "factor_type" DROP DEFAULT;
ALTER TABLE "tax_rates" ALTER COLUMN "display_value" DROP DEFAULT;

-- Enforce closed set of factor types at the DB level
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_factor_type_check" CHECK ("factor_type" IN ('Tasa', 'Cuota', 'Exento'));
