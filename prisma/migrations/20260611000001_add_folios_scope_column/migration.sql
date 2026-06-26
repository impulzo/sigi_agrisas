-- AlterTable
ALTER TABLE "folios" ADD COLUMN "scope" VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS';

-- CreateIndex
CREATE INDEX "folios_scope_idx" ON "folios"("scope");
