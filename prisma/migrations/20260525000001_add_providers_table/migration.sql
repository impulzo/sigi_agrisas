-- CreateTable
CREATE TABLE "providers" (
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
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "providers_rfc_key" ON "providers"("rfc");

-- CreateIndex
CREATE INDEX "providers_code_idx" ON "providers"("code");

-- CreateIndex
CREATE INDEX "providers_rfc_idx" ON "providers"("rfc");

-- CreateIndex
CREATE INDEX "providers_name_idx" ON "providers"("name");
