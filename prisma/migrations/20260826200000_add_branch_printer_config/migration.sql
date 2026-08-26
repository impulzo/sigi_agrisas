-- CreateTable
CREATE TABLE "branch_printer_configs" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "print_mode" VARCHAR(10) NOT NULL DEFAULT 'browser',
    "agent_url" VARCHAR(200),
    "printer_host" VARCHAR(200),
    "printer_port" INTEGER DEFAULT 9100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_printer_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branch_printer_configs_branch_id_key" ON "branch_printer_configs"("branch_id");

-- AddForeignKey
ALTER TABLE "branch_printer_configs" ADD CONSTRAINT "branch_printer_configs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
