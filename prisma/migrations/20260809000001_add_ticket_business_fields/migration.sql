-- AlterTable
ALTER TABLE "ticket_settings" ADD COLUMN "business_address" VARCHAR(300);
ALTER TABLE "ticket_settings" ADD COLUMN "business_phone" VARCHAR(30);
ALTER TABLE "ticket_settings" ADD COLUMN "business_tax_regime" VARCHAR(120);
ALTER TABLE "ticket_settings" ADD COLUMN "legend_text" VARCHAR(500);
