-- AlterTable
ALTER TABLE "inventory_lots" ADD COLUMN     "notified_six_months_at" TIMESTAMP(3),
ADD COLUMN     "notified_three_months_at" TIMESTAMP(3),
ADD COLUMN     "notified_day_of_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "inventory_notification_settings" (
    "id" TEXT NOT NULL,
    "expiration_notification_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_notification_settings_pkey" PRIMARY KEY ("id")
);
