-- AlterTable: add `type` (temporary DEFAULT so existing rows backfill), `notes`
ALTER TABLE "waybills" ADD COLUMN "type" VARCHAR(20) NOT NULL DEFAULT 'carta_porte';
ALTER TABLE "waybills" ADD COLUMN "notes" VARCHAR(500);

-- Explicit backfill (idempotent safety net; the DEFAULT above already covers existing rows)
UPDATE "waybills" SET "type" = 'carta_porte' WHERE "type" IS NULL OR "type" = '';

-- Drop the transitional default: `type` must be supplied explicitly by every future insert
ALTER TABLE "waybills" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable: Carta-Porte-only columns become nullable (simple transfers never populate them)
ALTER TABLE "waybills" ALTER COLUMN "origin_address_street" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_exterior_number" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_neighborhood" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_municipality" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_state" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_country" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "origin_address_zip_code" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_street" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_exterior_number" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_neighborhood" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_municipality" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_state" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_country" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "destination_address_zip_code" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "vehicle_plate" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "vehicle_config" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "vehicle_permit_type" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "vehicle_permit_number" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "insurance_company" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "insurance_policy" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "driver_name" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "driver_license_number" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "distance_km" DROP NOT NULL;
ALTER TABLE "waybills" ALTER COLUMN "arrival_at" DROP NOT NULL;

-- AlterTable: WaybillItem SAT/weight fields become nullable (simple transfers never populate them)
ALTER TABLE "waybill_items" ALTER COLUMN "sat_bienes_transp_code" DROP NOT NULL;
ALTER TABLE "waybill_items" ALTER COLUMN "sat_unit_code" DROP NOT NULL;
ALTER TABLE "waybill_items" ALTER COLUMN "weight_kg" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "waybills_type_idx" ON "waybills"("type");
