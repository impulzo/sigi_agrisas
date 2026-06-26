-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "uuid" VARCHAR(40),
    "facturama_cfdi_id" VARCHAR(40),
    "status" VARCHAR(20) NOT NULL,
    "cfdi_type" VARCHAR(2) NOT NULL DEFAULT 'I',
    "cfdi_use" VARCHAR(8) NOT NULL,
    "payment_form" VARCHAR(4) NOT NULL DEFAULT '01',
    "payment_method" VARCHAR(4) NOT NULL DEFAULT 'PUE',
    "receiver_rfc" VARCHAR(14) NOT NULL,
    "receiver_name" VARCHAR(200) NOT NULL,
    "receiver_cfdi_use" VARCHAR(8) NOT NULL,
    "receiver_fiscal_regime" VARCHAR(4) NOT NULL,
    "receiver_tax_zip_code" VARCHAR(5) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'MXN',
    "subtotal" DECIMAL(14,4) NOT NULL,
    "tax_total" DECIMAL(14,4) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "xml_url" TEXT,
    "pdf_url" TEXT,
    "sale_id" TEXT,
    "branch_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "creator_id" UUID NOT NULL,
    "cancellation_motive" VARCHAR(2),
    "uuid_replacement" VARCHAR(40),
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_code_snapshot" VARCHAR(32) NOT NULL,
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "sat_product_code" VARCHAR(8),
    "sat_unit_code" VARCHAR(10),
    "unit" VARCHAR(60) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "discount_pct" DECIMAL(5,2),
    "iva_rate" DECIMAL(6,4) NOT NULL,
    "ieps_rate" DECIMAL(6,4) NOT NULL,
    "tax_object" VARCHAR(2) NOT NULL,
    "line_subtotal" DECIMAL(14,4) NOT NULL,
    "line_iva" DECIMAL(14,4) NOT NULL,
    "line_ieps" DECIMAL(14,4) NOT NULL,
    "line_total" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_sale_id_idx" ON "invoices"("sale_id");

-- CreateIndex
CREATE INDEX "invoices_branch_id_idx" ON "invoices"("branch_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_uuid_idx" ON "invoices"("uuid");

-- CreateIndex
CREATE INDEX "invoices_receiver_rfc_idx" ON "invoices"("receiver_rfc");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
