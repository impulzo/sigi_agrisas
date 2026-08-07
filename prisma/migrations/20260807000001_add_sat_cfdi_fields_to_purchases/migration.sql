-- Add SAT CFDI metadata to purchases (sat_uuid dedupe, supplier folio, invoice date, file name)
ALTER TABLE "purchases"
  ADD COLUMN "sat_uuid" VARCHAR(36),
  ADD COLUMN "supplier_invoice_number" VARCHAR(60),
  ADD COLUMN "invoice_date" TIMESTAMP(3),
  ADD COLUMN "xml_file_name" VARCHAR(255);

CREATE UNIQUE INDEX "purchases_sat_uuid_key" ON "purchases"("sat_uuid");
