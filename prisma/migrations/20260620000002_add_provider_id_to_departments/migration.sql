ALTER TABLE "departments" ADD COLUMN "provider_id" TEXT;
CREATE INDEX "departments_provider_id_idx" ON "departments"("provider_id");
ALTER TABLE "departments" ADD CONSTRAINT "departments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
