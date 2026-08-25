-- AlterTable
ALTER TABLE "sales" ADD COLUMN "client_request_id" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "client_request_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_client_request_id_key" ON "sales"("client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_client_request_id_key" ON "quotes"("client_request_id");
