-- AlterTable: sat_cfdi_uses.code soporta códigos de 4 caracteres (CP01, CN01)
ALTER TABLE "sat_cfdi_uses" ALTER COLUMN "code" TYPE VARCHAR(4);

-- AlterTable: customers.cfdi_use soporta códigos de 4 caracteres (CP01, CN01)
ALTER TABLE "customers" ALTER COLUMN "cfdi_use" TYPE VARCHAR(4);
