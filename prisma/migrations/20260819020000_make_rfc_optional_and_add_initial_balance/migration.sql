-- Customers: rfc becomes nullable, unique constraint becomes partial (only non-null values)
DROP INDEX "customers_rfc_key";
ALTER TABLE "customers" ALTER COLUMN "rfc" DROP NOT NULL;
CREATE UNIQUE INDEX "customers_rfc_key" ON "customers"("rfc") WHERE "rfc" IS NOT NULL;
ALTER TABLE "customers" ADD COLUMN "initial_balance" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- Providers: same treatment
DROP INDEX "providers_rfc_key";
ALTER TABLE "providers" ALTER COLUMN "rfc" DROP NOT NULL;
CREATE UNIQUE INDEX "providers_rfc_key" ON "providers"("rfc") WHERE "rfc" IS NOT NULL;
ALTER TABLE "providers" ADD COLUMN "initial_balance" DECIMAL(12,4) NOT NULL DEFAULT 0;
