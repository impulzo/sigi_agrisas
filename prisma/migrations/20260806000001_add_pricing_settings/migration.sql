-- CreateTable
CREATE TABLE "pricing_settings" (
    "id" TEXT NOT NULL,
    "dosification_surcharge_pct" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);
