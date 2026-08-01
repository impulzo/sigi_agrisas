-- CreateTable
CREATE TABLE "sat_product_service_codes" (
    "code" VARCHAR(8) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sat_product_service_codes_pkey" PRIMARY KEY ("code")
);
