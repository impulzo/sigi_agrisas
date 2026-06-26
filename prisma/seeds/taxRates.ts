import { PrismaClient } from "@prisma/client";

const TAX_RATES = [
  { code: "IVA_16", name: "IVA 16%", description: "Impuesto al Valor Agregado tasa general 16%", rate: 0.16 },
  { code: "IEPS_8", name: "IEPS 8%", description: "Impuesto Especial sobre Producción y Servicios 8%", rate: 0.08 },
  { code: "IVA_0", name: "IVA 0%", description: "Impuesto al Valor Agregado tasa cero", rate: 0.0 },
];

export async function seedTaxRates(prisma: PrismaClient): Promise<void> {
  for (const tr of TAX_RATES) {
    await prisma.taxRate.upsert({
      where: { code: tr.code },
      update: { name: tr.name, description: tr.description, rate: tr.rate },
      create: { code: tr.code, name: tr.name, description: tr.description, rate: tr.rate, isActive: true },
    });
  }
  console.log(`Seeded ${TAX_RATES.length} tax rates.`);
}
