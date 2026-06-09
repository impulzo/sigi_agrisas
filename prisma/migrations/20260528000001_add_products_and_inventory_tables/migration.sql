-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "sat_product_code" VARCHAR(16),
    "department_id" TEXT NOT NULL,
    "iva_rate" DECIMAL(5,4),
    "ieps_rate" DECIMAL(5,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_prices" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "discount_pct" DECIMAL(5,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_dosifications" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "num_parts" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_dosifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_inventory" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reserved_quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reorder_point" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_department_id_idx" ON "products"("department_id");

-- CreateIndex
CREATE INDEX "product_prices_product_id_idx" ON "product_prices"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_prices_product_id_name_key" ON "product_prices"("product_id", "name");

-- CreateIndex
CREATE INDEX "product_dosifications_product_id_idx" ON "product_dosifications"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_dosifications_product_id_name_key" ON "product_dosifications"("product_id", "name");

-- CreateIndex
CREATE INDEX "branch_inventory_branch_id_idx" ON "branch_inventory"("branch_id");

-- CreateIndex
CREATE INDEX "branch_inventory_product_id_idx" ON "branch_inventory"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_inventory_branch_id_product_id_key" ON "branch_inventory"("branch_id", "product_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dosifications" ADD CONSTRAINT "product_dosifications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual: CHECK constraints (Prisma does not emit native CHECK constraints from schema mapping)
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_price_nonneg_chk" CHECK ("price" >= 0);
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_min_quantity_chk" CHECK ("min_quantity" >= 1);
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_discount_pct_chk" CHECK ("discount_pct" IS NULL OR ("discount_pct" >= 0 AND "discount_pct" <= 100));
ALTER TABLE "product_dosifications" ADD CONSTRAINT "product_dosifications_num_parts_chk" CHECK ("num_parts" >= 2);
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_quantity_nonneg_chk" CHECK ("quantity" >= 0);
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_reserved_quantity_nonneg_chk" CHECK ("reserved_quantity" >= 0);
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_reorder_point_nonneg_chk" CHECK ("reorder_point" >= 0);

-- Manual: partial unique index — at most one default price per product (Prisma lacks native partial unique index support)
CREATE UNIQUE INDEX "product_default_price_idx" ON "product_prices"("product_id") WHERE "is_default" = TRUE;
