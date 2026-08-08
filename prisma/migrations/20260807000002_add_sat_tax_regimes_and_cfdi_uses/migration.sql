-- CreateTable
CREATE TABLE "sat_tax_regimes" (
    "code" VARCHAR(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sat_tax_regimes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "sat_cfdi_uses" (
    "code" VARCHAR(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sat_cfdi_uses_pkey" PRIMARY KEY ("code")
);
