-- CreateTable
CREATE TABLE "customer_payment_items" (
    "id" TEXT NOT NULL,
    "customer_payment_id" TEXT NOT NULL,
    "sale_item_id" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_payment_items_customer_payment_id_idx" ON "customer_payment_items"("customer_payment_id");

-- CreateIndex
CREATE INDEX "customer_payment_items_sale_item_id_idx" ON "customer_payment_items"("sale_item_id");

-- AddForeignKey
ALTER TABLE "customer_payment_items" ADD CONSTRAINT "customer_payment_items_customer_payment_id_fkey" FOREIGN KEY ("customer_payment_id") REFERENCES "customer_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment_items" ADD CONSTRAINT "customer_payment_items_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
