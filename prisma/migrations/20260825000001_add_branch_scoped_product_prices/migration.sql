-- add-branch-scoped-prices
-- ProductPrice gains branch_id (nullable). NULL = precio base (aplica a toda
-- sucursal sin override propio); no-null = override exclusivo de esa sucursal.
--
-- Postgres trata NULL como distinto de sí mismo en índices únicos normales,
-- así que un unique compuesto plano (product_id, branch_id, name) NO evita
-- duplicar el precio base (branch_id IS NULL). La unicidad real se enforza
-- con índices PARCIALES:
--   - product_price_global_name_idx  -> un nombre único por producto entre
--     los precios base (branch_id IS NULL)
--   - product_price_branch_name_idx  -> un nombre único por (producto,
--     sucursal) entre los overrides (branch_id IS NOT NULL)
--   - product_default_price_global_idx -> a lo sumo un default global por
--     producto
--   - product_default_price_branch_idx -> a lo sumo un default por
--     (producto, sucursal) entre los overrides
--
-- El unique index plano `product_prices_product_id_branch_id_name_key` que
-- reemplaza a `product_prices_product_id_name_key` es la contraparte que
-- Prisma Client espera para su `@@unique([productId, branchId, name])`
-- declarado en schema.prisma — es una restricción más laxa que nunca se
-- viola en la práctica (branchId+name sí es único por fila individual);
-- los índices parciales de arriba son los que enforzan la regla de negocio
-- real. Sin backfill: toda fila existente queda branch_id NULL, que es
-- exactamente su semántica actual de "precio base" — retrocompatible.

-- AlterTable
ALTER TABLE "product_prices" ADD COLUMN "branch_id" TEXT;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (simple, non-unique — used for FK lookups)
CREATE INDEX "product_prices_branch_id_idx" ON "product_prices"("branch_id");

-- DropIndex (old unnamed-scope unique constraint)
DROP INDEX "product_prices_product_id_name_key";

-- CreateIndex (Prisma-native @@unique([productId, branchId, name]) — laxer
-- redundant guard, see header comment)
CREATE UNIQUE INDEX "product_prices_product_id_branch_id_name_key"
  ON "product_prices"("product_id", "branch_id", "name");

-- CreateIndex (real business-rule uniqueness: base price name per product)
CREATE UNIQUE INDEX "product_price_global_name_idx"
  ON "product_prices"("product_id", "name") WHERE "branch_id" IS NULL;

-- CreateIndex (real business-rule uniqueness: override name per product+branch)
CREATE UNIQUE INDEX "product_price_branch_name_idx"
  ON "product_prices"("product_id", "branch_id", "name") WHERE "branch_id" IS NOT NULL;

-- DropIndex (old single-scope default guard)
DROP INDEX "product_default_price_idx";

-- CreateIndex (at most one global default per product)
CREATE UNIQUE INDEX "product_default_price_global_idx"
  ON "product_prices"("product_id") WHERE "is_default" AND "branch_id" IS NULL;

-- CreateIndex (at most one default per product+branch among overrides)
CREATE UNIQUE INDEX "product_default_price_branch_idx"
  ON "product_prices"("product_id", "branch_id") WHERE "is_default" AND "branch_id" IS NOT NULL;
