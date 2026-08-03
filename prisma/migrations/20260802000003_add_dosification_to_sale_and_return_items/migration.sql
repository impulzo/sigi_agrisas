-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "dosification_id" TEXT,
ADD COLUMN     "num_parts_snapshot" INTEGER;

-- AlterTable
ALTER TABLE "return_items" ADD COLUMN     "dosification_id" TEXT,
ADD COLUMN     "num_parts_snapshot" INTEGER;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_dosification_id_fkey" FOREIGN KEY ("dosification_id") REFERENCES "product_dosifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_dosification_id_fkey" FOREIGN KEY ("dosification_id") REFERENCES "product_dosifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
