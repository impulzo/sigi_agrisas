-- Extend sales.status CHECK constraint to include 'returned_total'
ALTER TABLE "sales" DROP CONSTRAINT "sales_status_chk";
ALTER TABLE "sales" ADD CONSTRAINT "sales_status_chk" CHECK ("status" IN ('completed', 'cancelled', 'edited', 'returned_total'));
