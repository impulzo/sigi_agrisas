-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "plate" VARCHAR(20) NOT NULL,
    "vehicle_config" VARCHAR(10) NOT NULL,
    "permit_type" VARCHAR(10) NOT NULL,
    "permit_number" VARCHAR(50) NOT NULL,
    "insurance_company" VARCHAR(150) NOT NULL,
    "insurance_policy" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "rfc" VARCHAR(13),
    "license_number" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_code_key" ON "vehicles"("code");

-- CreateIndex
CREATE INDEX "vehicles_code_idx" ON "vehicles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_code_key" ON "drivers"("code");

-- CreateIndex
CREATE INDEX "drivers_code_idx" ON "drivers"("code");

-- AlterTable
ALTER TABLE "waybills" ADD COLUMN "vehicle_id" TEXT,
ADD COLUMN "driver_id" TEXT;

-- CreateIndex
CREATE INDEX "waybills_vehicle_id_idx" ON "waybills"("vehicle_id");

-- CreateIndex
CREATE INDEX "waybills_driver_id_idx" ON "waybills"("driver_id");

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
