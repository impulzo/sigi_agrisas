-- AlterTable: users.branch_id (nullable FK to branches)
ALTER TABLE "users" ADD COLUMN "branch_id" TEXT;

-- AlterTable: branches.is_headquarters
ALTER TABLE "branches" ADD COLUMN "is_headquarters" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "legal_name" VARCHAR(200),
    "tax_regime" VARCHAR(3),
    "cfdi_use" VARCHAR(3),
    "tax_zip_code" VARCHAR(5),
    "email" VARCHAR(120),
    "phone" VARCHAR(30),
    "address" VARCHAR(300),
    "contact_name" VARCHAR(120),
    "notes" TEXT,
    "credit_limit" DECIMAL(12,4),
    "current_balance" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sales
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "folio_id" TEXT NOT NULL,
    "folio_number" INTEGER NOT NULL,
    "folio_code" VARCHAR(40) NOT NULL,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "cashier_id" UUID NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax_total" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sale_items
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
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

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: users
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex: customers
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
CREATE UNIQUE INDEX "customers_rfc_key" ON "customers"("rfc");
CREATE INDEX "customers_code_idx" ON "customers"("code");
CREATE INDEX "customers_rfc_idx" ON "customers"("rfc");
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex: sales
CREATE UNIQUE INDEX "sales_folio_id_folio_number_key" ON "sales"("folio_id", "folio_number");
CREATE INDEX "sales_branch_id_idx" ON "sales"("branch_id");
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");
CREATE INDEX "sales_status_idx" ON "sales"("status");
CREATE INDEX "sales_completed_at_idx" ON "sales"("completed_at");

-- CreateIndex: sale_items
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- AddForeignKey: users.branch_id -> branches.id (SET NULL on delete)
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: sales -> folios, branches, customers, users, payment_methods (all RESTRICT)
ALTER TABLE "sales" ADD CONSTRAINT "sales_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sale_items -> sales (CASCADE), products (RESTRICT), product_prices (SET NULL)
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "product_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manual: drop branch_inventory CHECK quantity >= 0 (sales may push the column to negative)
ALTER TABLE "branch_inventory" DROP CONSTRAINT IF EXISTS "branch_inventory_quantity_nonneg_chk";

-- Manual: partial unique index — at most one headquarters branch at a time
CREATE UNIQUE INDEX "branches_hq_idx" ON "branches"("is_headquarters") WHERE "is_headquarters" = TRUE;

-- Manual: CHECK constraints for new tables
ALTER TABLE "customers" ADD CONSTRAINT "customers_credit_limit_chk" CHECK ("credit_limit" IS NULL OR "credit_limit" >= 0);
ALTER TABLE "customers" ADD CONSTRAINT "customers_current_balance_chk" CHECK ("current_balance" >= 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_status_chk" CHECK ("status" IN ('completed', 'cancelled', 'edited'));
ALTER TABLE "sales" ADD CONSTRAINT "sales_subtotal_chk" CHECK ("subtotal" >= 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_tax_total_chk" CHECK ("tax_total" >= 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_total_chk" CHECK ("total" >= 0);
ALTER TABLE "sales" ADD CONSTRAINT "sales_folio_number_chk" CHECK ("folio_number" >= 1);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_quantity_chk" CHECK ("quantity" > 0);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_unit_price_chk" CHECK ("unit_price" >= 0);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_discount_pct_chk" CHECK ("discount_pct" IS NULL OR ("discount_pct" >= 0 AND "discount_pct" <= 100));
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_iva_rate_chk" CHECK ("iva_rate" IS NULL OR ("iva_rate" >= 0 AND "iva_rate" <= 1));
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_ieps_rate_chk" CHECK ("ieps_rate" IS NULL OR ("ieps_rate" >= 0 AND "ieps_rate" <= 1));
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_line_subtotal_chk" CHECK ("line_subtotal" >= 0);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_line_tax_chk" CHECK ("line_tax" >= 0);
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_line_total_chk" CHECK ("line_total" >= 0);
