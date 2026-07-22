-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "movement_at" TIMESTAMP(3) NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "direction" VARCHAR(4) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" VARCHAR(10) NOT NULL,
    "balance_after" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(12,4),
    "unit_price" DECIMAL(12,4),
    "customer_id" TEXT,
    "provider_id" TEXT,
    "folio_id" TEXT,
    "folio_code" VARCHAR(40),
    "folio_number" INTEGER,
    "origin_folio_code" VARCHAR(40),
    "origin_folio_number" INTEGER,
    "source_type" VARCHAR(20) NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'Aplicada',
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movements_branch_id_product_id_movement_at_sequen_idx" ON "inventory_movements"("branch_id", "product_id", "movement_at", "sequence");

-- CreateIndex
CREATE INDEX "inventory_movements_source_type_source_id_idx" ON "inventory_movements"("source_type", "source_id");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
