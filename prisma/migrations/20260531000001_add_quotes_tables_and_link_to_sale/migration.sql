-- AlterTable: sales.quote_id (nullable FK to quotes, set null on quote delete)
ALTER TABLE "sales" ADD COLUMN "quote_id" TEXT;

-- CreateTable: quotes
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "folio_id" TEXT NOT NULL,
    "folio_number" INTEGER NOT NULL,
    "folio_code" VARCHAR(40) NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax_total" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "expires_at" TIMESTAMP(3),
    "authorized_at" TIMESTAMP(3),
    "authorized_by" UUID,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "converted_at" TIMESTAMP(3),
    "converted_sale_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quote_items
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_price_id" TEXT,
    "product_code_snapshot" VARCHAR(32) NOT NULL,
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "price_name_snapshot" VARCHAR(60) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "discount_pct" DECIMAL(5,2),
    "iva_rate" DECIMAL(5,4),
    "ieps_rate" DECIMAL(5,4),
    "line_subtotal" DECIMAL(14,4) NOT NULL,
    "line_tax" DECIMAL(14,4) NOT NULL,
    "line_total" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: quotes
CREATE UNIQUE INDEX "quotes_folio_id_folio_number_key" ON "quotes"("folio_id", "folio_number");
CREATE INDEX "quotes_branch_id_idx" ON "quotes"("branch_id");
CREATE INDEX "quotes_customer_id_idx" ON "quotes"("customer_id");
CREATE INDEX "quotes_status_idx" ON "quotes"("status");
CREATE INDEX "quotes_expires_at_idx" ON "quotes"("expires_at");
CREATE INDEX "quotes_created_at_idx" ON "quotes"("created_at");
CREATE INDEX "quotes_converted_sale_id_idx" ON "quotes"("converted_sale_id");

-- CreateIndex: quote_items
CREATE INDEX "quote_items_quote_id_idx" ON "quote_items"("quote_id");
CREATE INDEX "quote_items_product_id_idx" ON "quote_items"("product_id");

-- CreateIndex: sales.quote_id
CREATE INDEX "sales_quote_id_idx" ON "sales"("quote_id");

-- AddForeignKey: quotes
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_folio_id_fkey"
    FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_creator_id_fkey"
    FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_authorized_by_fkey"
    FOREIGN KEY ("authorized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_converted_sale_id_fkey"
    FOREIGN KEY ("converted_sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: quote_items
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_price_id_fkey"
    FOREIGN KEY ("product_price_id") REFERENCES "product_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales.quote_id
ALTER TABLE "sales" ADD CONSTRAINT "sales_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK constraints (non-negative totals, positive quantity)
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_subtotal_nonneg_chk" CHECK ("subtotal" >= 0);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tax_total_nonneg_chk" CHECK ("tax_total" >= 0);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_total_nonneg_chk" CHECK ("total" >= 0);
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quantity_positive_chk" CHECK ("quantity" > 0);
