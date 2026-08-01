-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "address_country" VARCHAR(3) DEFAULT 'MEX',
ADD COLUMN     "address_exterior_number" VARCHAR(20),
ADD COLUMN     "address_interior_number" VARCHAR(20),
ADD COLUMN     "address_municipality" VARCHAR(100),
ADD COLUMN     "address_neighborhood" VARCHAR(100),
ADD COLUMN     "address_state" VARCHAR(3),
ADD COLUMN     "address_street" VARCHAR(150),
ADD COLUMN     "address_zip_code" VARCHAR(5);

-- CreateTable
CREATE TABLE "waybills" (
    "id" TEXT NOT NULL,
    "folio_id" TEXT NOT NULL,
    "folio_number" INTEGER NOT NULL,
    "folio_code" VARCHAR(40) NOT NULL,
    "origin_branch_id" TEXT NOT NULL,
    "destination_branch_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "origin_address_street" VARCHAR(150) NOT NULL,
    "origin_address_exterior_number" VARCHAR(20) NOT NULL,
    "origin_address_interior_number" VARCHAR(20),
    "origin_address_neighborhood" VARCHAR(100) NOT NULL,
    "origin_address_municipality" VARCHAR(100) NOT NULL,
    "origin_address_state" VARCHAR(3) NOT NULL,
    "origin_address_country" VARCHAR(3) NOT NULL,
    "origin_address_zip_code" VARCHAR(5) NOT NULL,
    "destination_address_street" VARCHAR(150) NOT NULL,
    "destination_address_exterior_number" VARCHAR(20) NOT NULL,
    "destination_address_interior_number" VARCHAR(20),
    "destination_address_neighborhood" VARCHAR(100) NOT NULL,
    "destination_address_municipality" VARCHAR(100) NOT NULL,
    "destination_address_state" VARCHAR(3) NOT NULL,
    "destination_address_country" VARCHAR(3) NOT NULL,
    "destination_address_zip_code" VARCHAR(5) NOT NULL,
    "vehicle_plate" VARCHAR(20) NOT NULL,
    "vehicle_config" VARCHAR(10) NOT NULL,
    "vehicle_permit_type" VARCHAR(10) NOT NULL,
    "vehicle_permit_number" VARCHAR(50) NOT NULL,
    "insurance_company" VARCHAR(150) NOT NULL,
    "insurance_policy" VARCHAR(50) NOT NULL,
    "driver_name" VARCHAR(150) NOT NULL,
    "driver_rfc" VARCHAR(13),
    "driver_license_number" VARCHAR(50) NOT NULL,
    "distance_km" DECIMAL(10,2) NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "cfdi_uuid" VARCHAR(40),
    "facturama_cfdi_id" VARCHAR(40),
    "xml_url" TEXT,
    "pdf_url" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" UUID,
    "cancellation_reason" VARCHAR(500),
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waybills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waybill_items" (
    "id" TEXT NOT NULL,
    "waybill_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_code_snapshot" VARCHAR(32),
    "product_name_snapshot" VARCHAR(200) NOT NULL,
    "sat_bienes_transp_code" VARCHAR(8) NOT NULL,
    "sat_unit_code" VARCHAR(10) NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "weight_kg" DECIMAL(14,4) NOT NULL,
    "is_hazardous_material" BOOLEAN NOT NULL DEFAULT false,
    "hazardous_material_code" VARCHAR(10),

    CONSTRAINT "waybill_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waybills_origin_branch_id_idx" ON "waybills"("origin_branch_id");

-- CreateIndex
CREATE INDEX "waybills_destination_branch_id_idx" ON "waybills"("destination_branch_id");

-- CreateIndex
CREATE INDEX "waybills_status_idx" ON "waybills"("status");

-- CreateIndex
CREATE INDEX "waybills_folio_id_idx" ON "waybills"("folio_id");

-- CreateIndex
CREATE UNIQUE INDEX "waybills_folio_id_folio_number_key" ON "waybills"("folio_id", "folio_number");

-- CreateIndex
CREATE INDEX "waybill_items_waybill_id_idx" ON "waybill_items"("waybill_id");

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "folios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_origin_branch_id_fkey" FOREIGN KEY ("origin_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_destination_branch_id_fkey" FOREIGN KEY ("destination_branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybill_items" ADD CONSTRAINT "waybill_items_waybill_id_fkey" FOREIGN KEY ("waybill_id") REFERENCES "waybills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
