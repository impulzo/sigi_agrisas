-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "purchase_item_id" TEXT NOT NULL,
    "lot_number" VARCHAR(64) NOT NULL,
    "expiration_date" DATE NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_lots_branch_id_product_id_expiration_date_idx" ON "inventory_lots"("branch_id", "product_id", "expiration_date");

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
