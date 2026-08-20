-- CreateTable
CREATE TABLE "emitter_fiscal_settings" (
    "id" TEXT NOT NULL,
    "rfc" VARCHAR(13),
    "legal_name" VARCHAR(200),
    "fiscal_regime" VARCHAR(3),
    "zip_code" VARCHAR(5),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emitter_fiscal_settings_pkey" PRIMARY KEY ("id")
);
