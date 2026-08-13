-- CreateTable
CREATE TABLE "sat_units_of_measure" (
    "code" VARCHAR(3) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sat_units_of_measure_pkey" PRIMARY KEY ("code")
);
