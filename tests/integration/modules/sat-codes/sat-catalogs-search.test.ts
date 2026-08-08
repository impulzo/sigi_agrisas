import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaSatTaxRegimeRepository } from "@/modules/sat-codes/infrastructure/repositories/PrismaSatTaxRegimeRepository";
import { PrismaSatCfdiUseRepository } from "@/modules/sat-codes/infrastructure/repositories/PrismaSatCfdiUseRepository";
import { SearchSatTaxRegimesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatTaxRegimesUseCase";
import { SearchSatCfdiUsesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCfdiUsesUseCase";

const TEST_REGIME_CODES = ["995", "996"];
const TEST_USE_CODES = ["ZZZ9"];

async function cleanup() {
  await prisma.satTaxRegime.deleteMany({ where: { code: { in: TEST_REGIME_CODES } } });
  await prisma.satCfdiUse.deleteMany({ where: { code: { in: TEST_USE_CODES } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("SAT catálogos — búsqueda (integration, real DB)", () => {
  const taxRegimeUseCase = new SearchSatTaxRegimesUseCase(
    new PrismaSatTaxRegimeRepository(prisma)
  );
  const cfdiUseUseCase = new SearchSatCfdiUsesUseCase(new PrismaSatCfdiUseRepository(prisma));

  beforeAll(async () => {
    await cleanup();
    await prisma.satTaxRegime.createMany({
      data: [
        { code: "995", description: "Régimen de prueba 995" },
        { code: "996", description: "Otro régimen de prueba" },
      ],
    });
    await prisma.satCfdiUse.createMany({
      data: [{ code: "ZZZ9", description: "Uso de prueba CFDI" }],
    });
  });

  it("busca régimen fiscal por código", async () => {
    const { items } = await taxRegimeUseCase.execute("995");
    expect(items.map((i) => i.code)).toContain("995");
  });

  it("busca régimen fiscal por descripción", async () => {
    const { items } = await taxRegimeUseCase.execute("otro");
    expect(items.map((i) => i.code)).toContain("996");
  });

  it("busca uso CFDI de 4 caracteres por código", async () => {
    const { items } = await cfdiUseUseCase.execute("ZZZ9");
    expect(items.map((i) => i.code)).toContain("ZZZ9");
  });

  it("busca uso CFDI por descripción", async () => {
    const { items } = await cfdiUseUseCase.execute("prueba");
    expect(items.map((i) => i.code)).toContain("ZZZ9");
  });

  it("devuelve vacío cuando no hay match", async () => {
    const { items } = await cfdiUseUseCase.execute("zz-no-existe");
    expect(items).toEqual([]);
  });
});
