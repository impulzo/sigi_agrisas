-- CreateTable
CREATE TABLE "ticket_settings" (
    "id" TEXT NOT NULL,
    "logo_url" TEXT,
    "header_text" TEXT,
    "footer_text" TEXT,
    "paper_width" VARCHAR(4) NOT NULL DEFAULT '80mm',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_settings_pkey" PRIMARY KEY ("id")
);
