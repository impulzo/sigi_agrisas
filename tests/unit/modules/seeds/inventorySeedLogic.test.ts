import { seedInventory, printSeedReport } from "../../../../prisma/seeds/lib/inventorySeedLogic";
import type { PrismaLike } from "../../../../prisma/seeds/lib/inventorySeedLogic";
import type { InventoryRow } from "../../../../prisma/seeds/data/inventario-agrisas-v2";

const DEPT_ID = "dept-uuid-1";
const BRANCH_ID = "branch-uuid-1";
const OPTS = { branchId: BRANCH_ID };

function makePrisma(opts: {
  existingDepts?: Array<{ id: string; code: string }>;
  existingProduct?: { id: string } | null;
  existingPrice?: { id: string } | null;
  existingInventory?: { id: string } | null;
  productUpsertError?: Error;
} = {}): PrismaLike {
  const {
    existingDepts = [{ id: DEPT_ID, code: "FERT" }],
    existingProduct = null,
    existingPrice = null,
    existingInventory = null,
    productUpsertError,
  } = opts;

  const productUpsert = productUpsertError
    ? jest.fn().mockRejectedValue(productUpsertError)
    : jest.fn().mockResolvedValue({ id: "product-uuid-1" });

  const priceUpsert = jest.fn().mockResolvedValue({ id: "price-uuid-1" });

  const prisma: PrismaLike = {
    department: {
      findMany: jest.fn().mockResolvedValue(existingDepts),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue(existingProduct),
      upsert: productUpsert,
    },
    productPrice: {
      findUnique: jest.fn().mockResolvedValue(existingPrice),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: priceUpsert,
    },
    branchInventory: {
      findUnique: jest.fn().mockResolvedValue(existingInventory),
      upsert: jest.fn().mockResolvedValue({ id: "inv-uuid-1" }),
    },
  };

  return prisma;
}

const BASE_ROW: InventoryRow = {
  code: "PROD001",
  name: "Producto Ejemplo",
  unit: "KG",
  departmentCode: "FERT",
  departmentName: "Fertilizantes",
  satProductCode: "10171600",
  ivaRate: 0.16,
  iepsRate: 0,
  isTaxable: true,
  quantity: 16,
  prices: [
    { name: "Menudeo", price: 150.0, isDefault: true },
    { name: "Mayoreo", price: 130.0 },
  ],
};

describe("seedInventory", () => {
  describe("5.1 primera ejecución — all created", () => {
    it("crea producto y precios; counters.products.created=1, prices.created=2", async () => {
      const prisma = makePrisma({ existingProduct: null, existingPrice: null });
      const result = await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(result.counters.products.created).toBe(1);
      expect(result.counters.products.updated).toBe(0);
      expect(result.counters.products.skipped).toBe(0);
      expect(result.counters.products.errors).toBe(0);
      expect(result.counters.prices.created).toBe(2);
      expect(result.counters.prices.updated).toBe(0);
      expect(result.counters.prices.errors).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("llama product.upsert con campos correctos", async () => {
      const prisma = makePrisma();
      await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(prisma.product.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: "PROD001" },
          create: expect.objectContaining({
            code: "PROD001",
            name: "Producto Ejemplo",
            unit: "KG",
            departmentId: DEPT_ID,
            ivaRate: 0.16,
            iepsRate: 0,
            isTaxable: true,
            isActive: true,
          }),
        })
      );
    });

    it("llama productPrice.upsert para cada precio", async () => {
      const prisma = makePrisma();
      await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(prisma.productPrice.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.productPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_name: { productId: "product-uuid-1", name: "Menudeo" } },
          create: expect.objectContaining({ isDefault: true }),
        })
      );
      expect(prisma.productPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_name: { productId: "product-uuid-1", name: "Mayoreo" } },
          create: expect.objectContaining({ isDefault: false }),
        })
      );
    });
  });

  describe("5.2 segunda ejecución — all updated, 0 created", () => {
    it("counters.products.updated=1, created=0; prices.updated=2, created=0", async () => {
      const prisma = makePrisma({
        existingProduct: { id: "product-uuid-1" },
        existingPrice: { id: "price-uuid-1" },
      });
      const result = await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(result.counters.products.created).toBe(0);
      expect(result.counters.products.updated).toBe(1);
      expect(result.counters.products.skipped).toBe(0);
      expect(result.counters.products.errors).toBe(0);
      expect(result.counters.prices.created).toBe(0);
      expect(result.counters.prices.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("5.3 departmentCode inválido — skipped, no error", () => {
    it("skipped=1, errors=0, no lanza excepción", async () => {
      const row: InventoryRow = {
        ...BASE_ROW,
        departmentCode: "INEXISTENTE",
      };
      const prisma = makePrisma({ existingDepts: [{ id: DEPT_ID, code: "FERT" }] });
      const result = await seedInventory(prisma, [row], OPTS);

      expect(result.counters.products.skipped).toBe(1);
      expect(result.counters.products.created).toBe(0);
      expect(result.counters.products.errors).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("no llama a product.upsert cuando dept no existe", async () => {
      const row: InventoryRow = { ...BASE_ROW, departmentCode: "INEXISTENTE" };
      const prisma = makePrisma();
      await seedInventory(prisma, [row], OPTS);

      expect(prisma.product.upsert).not.toHaveBeenCalled();
    });
  });

  describe("5.4 error en producto — error contado, siguiente se procesa", () => {
    it("errors.products=1 pero el segundo producto se procesa (created=1)", async () => {
      const errorRow: InventoryRow = { ...BASE_ROW, code: "FAIL001" };
      const okRow: InventoryRow = { ...BASE_ROW, code: "OK001" };

      let callCount = 0;
      const prisma = makePrisma();
      (prisma.product.upsert as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error("unique constraint violated");
        return Promise.resolve({ id: "product-uuid-ok" });
      });

      const result = await seedInventory(prisma, [errorRow, okRow], OPTS);

      expect(result.counters.products.errors).toBe(1);
      expect(result.counters.products.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("FAIL001");
    });
  });

  describe("2.5 validación de isDefault múltiple", () => {
    it("solo el primer isDefault=true se respeta, el segundo se degrada a false", async () => {
      const row: InventoryRow = {
        ...BASE_ROW,
        prices: [
          { name: "Precio A", price: 100, isDefault: true },
          { name: "Precio B", price: 80, isDefault: true },
        ],
      };
      const prisma = makePrisma();
      await seedInventory(prisma, [row], OPTS);

      const calls = (prisma.productPrice.upsert as jest.Mock).mock.calls;
      const [callA, callB] = calls;
      expect(callA[0].create.isDefault).toBe(true);
      expect(callB[0].create.isDefault).toBe(false);
    });
  });

  describe("single default enforcement + limpieza legacy", () => {
    it("limpia isDefault previo y borra placeholder \"Default\" antes de upsert", async () => {
      const prisma = makePrisma();
      await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(prisma.productPrice.updateMany).toHaveBeenCalledWith({
        where: { productId: "product-uuid-1", isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.productPrice.deleteMany).toHaveBeenCalledWith({
        where: { productId: "product-uuid-1", name: "Default" },
      });
    });
  });

  describe("satProductCode", () => {
    it("propaga satProductCode al product.upsert", async () => {
      const prisma = makePrisma();
      await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(prisma.product.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ satProductCode: "10171600" }),
        })
      );
    });

    it("satProductCode null cuando falta", async () => {
      const row: InventoryRow = { ...BASE_ROW, satProductCode: undefined };
      const prisma = makePrisma();
      await seedInventory(prisma, [row], OPTS);

      expect(prisma.product.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ satProductCode: null }),
        })
      );
    });
  });

  describe("branchInventory", () => {
    it("upsert con quantity en la sucursal destino; counters.inventory.upserted=1", async () => {
      const prisma = makePrisma();
      const result = await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(prisma.branchInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { branchId_productId: { branchId: BRANCH_ID, productId: "product-uuid-1" } },
          create: expect.objectContaining({ branchId: BRANCH_ID, quantity: 16 }),
          update: { quantity: 16 },
        })
      );
      expect(result.counters.inventory.created).toBe(1);
      expect(result.counters.inventory.updated).toBe(0);
      expect(result.counters.inventory.errors).toBe(0);
    });

    it("segunda corrida — inventory.updated=1, created=0", async () => {
      const prisma = makePrisma({ existingInventory: { id: "inv-uuid-1" } });
      const result = await seedInventory(prisma, [BASE_ROW], OPTS);

      expect(result.counters.inventory.created).toBe(0);
      expect(result.counters.inventory.updated).toBe(1);
    });

    it("quantity faltante usa 0", async () => {
      const row: InventoryRow = { ...BASE_ROW, quantity: undefined };
      const prisma = makePrisma();
      await seedInventory(prisma, [row], OPTS);

      expect(prisma.branchInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ quantity: 0 }),
        })
      );
    });

    it("quantity negativa se pasa directo sin error", async () => {
      const row: InventoryRow = { ...BASE_ROW, quantity: -1 };
      const prisma = makePrisma();
      const result = await seedInventory(prisma, [row], OPTS);

      expect(prisma.branchInventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ quantity: -1 }),
          update: { quantity: -1 },
        })
      );
      expect(result.counters.inventory.errors).toBe(0);
    });
  });
});

describe("printSeedReport", () => {
  it("imprime formato esperado con creados/actualizados/omitidos/errores por entidad", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      printSeedReport({
        counters: {
          products: { created: 5, updated: 3, skipped: 1, errors: 2 },
          prices: { created: 10, updated: 6, errors: 1 },
          inventory: { created: 5, updated: 3, errors: 0 },
        },
        errors: [{ code: "PROD_X", message: "constraint violation" }],
      });

      const output = logSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("Productos");
      expect(output).toContain("Creados: 5");
      expect(output).toContain("Actualizados: 3");
      expect(output).toContain("Omitidos: 1");
      expect(output).toContain("Errores: 2");
      expect(output).toContain("Precios");
      expect(output).toContain("Creados: 10");
      expect(output).toContain("Actualizados: 6");
      expect(output).toContain("Inventario");

      const errorOutput = errorSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(errorOutput).toContain("PROD_X");
      expect(errorOutput).toContain("constraint violation");
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("no imprime detalle de errores cuando errors está vacío", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      printSeedReport({
        counters: {
          products: { created: 1, updated: 0, skipped: 0, errors: 0 },
          prices: { created: 1, updated: 0, errors: 0 },
          inventory: { created: 1, updated: 0, errors: 0 },
        },
        errors: [],
      });

      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
