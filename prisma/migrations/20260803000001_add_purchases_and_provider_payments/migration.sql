-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "credit_days" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "credit_limit" DECIMAL(12,4),
ADD COLUMN     "current_balance" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "folio_id" TEXT NOT NULL,
    "folio_number" INTEGER NOT NULL,
    "folio_code" VARCHAR(40) NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax_total" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "paid_amount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "payment_status" VARCHAR(10) NOT NULL DEFAULT 'paid',
    "notes" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_code_snapshot" VARCHAR(32) NOT NULL,
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(12,4) NOT NULL,
    "discount_pct" DECIMAL(5,2),
    "iva_rate" DECIMAL(5,4),
    "ieps_rate" DECIMAL(5,4),
    "line_subtotal" DECIMAL(14,4) NOT NULL,
    "line_tax" DECIMAL(14,4) NOT NULL,
    "line_total" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_payments" (
    "id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "folio_id" TEXT NOT NULL,
    "folio_number" INTEGER NOT NULL,
    "folio_code" VARCHAR(40) NOT NULL,
    "creator_id" UUID NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_provider_id_idx" ON "purchases"("provider_id");

-- CreateIndex
CREATE INDEX "purchases_branch_id_idx" ON "purchases"("branch_id");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

-- CreateIndex
CREATE INDEX "purchases_purchased_at_idx" ON "purchases"("purchased_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_folio_id_folio_number_key" ON "purchases"("folio_id", "folio_number");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_items_product_id_idx" ON "purchase_items"("product_id");

-- CreateIndex
CREATE INDEX "provider_payments_purchase_id_status_idx" ON "provider_payments"("purchase_id", "status");

-- CreateIndex
CREATE INDEX "provider_payments_provider_id_status_idx" ON "provider_payments"("provider_id", "status");

-- CreateIndex
CREATE INDEX "provider_payments_branch_id_created_at_idx" ON "provider_payments"("branch_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_payments_folio_id_folio_number_key" ON "provider_payments"("folio_id", "folio_number");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payments" ADD CONSTRAINT "provider_payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payments" ADD CONSTRAINT "provider_payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payments" ADD CONSTRAINT "provider_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payments" ADD CONSTRAINT "provider_payments_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
