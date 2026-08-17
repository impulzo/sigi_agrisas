-- AlterTable: customers gains structured address (mirrors branches' pattern), used to build
-- the Carta Porte complement's destination Ubicacion for sale-linked waybills.
ALTER TABLE "customers"
  ADD COLUMN "address_street" VARCHAR(150),
  ADD COLUMN "address_exterior_number" VARCHAR(20),
  ADD COLUMN "address_interior_number" VARCHAR(20),
  ADD COLUMN "address_neighborhood" VARCHAR(100),
  ADD COLUMN "address_municipality" VARCHAR(100),
  ADD COLUMN "address_state" VARCHAR(3),
  ADD COLUMN "address_country" VARCHAR(3) DEFAULT 'MEX',
  ADD COLUMN "address_zip_code" VARCHAR(5);

-- AlterTable: waybills.destination_branch_id becomes nullable (only required for type='simple');
-- destination_customer_id + sale_id are required together for type='carta_porte'.
ALTER TABLE "waybills"
  ALTER COLUMN "destination_branch_id" DROP NOT NULL,
  ADD COLUMN "destination_customer_id" TEXT,
  ADD COLUMN "sale_id" TEXT;

-- CreateIndex
CREATE INDEX "waybills_destination_customer_id_idx" ON "waybills"("destination_customer_id");

-- CreateIndex
CREATE INDEX "waybills_sale_id_idx" ON "waybills"("sale_id");

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_destination_customer_id_fkey" FOREIGN KEY ("destination_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
