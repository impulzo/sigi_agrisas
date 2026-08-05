import { ListProductsUseCase } from "@/modules/products/application/use-cases/ListProductsUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";

const DEPT_A = "11111111-1111-1111-1111-111111111111";
const DEPT_B = "22222222-2222-2222-2222-222222222222";

describe("ListProductsUseCase", () => {
  let repo: InMemoryProductRepository;
  let useCase: ListProductsUseCase;

  beforeEach(async () => {
    repo = new InMemoryProductRepository();
    repo.reset();
    useCase = new ListProductsUseCase(repo);
    await repo.create({ code: "ARROZ_001", name: "Arroz", unit: "kg", departmentId: DEPT_A });
    await repo.create({ code: "FRIJOL_001", name: "Frijol", unit: "kg", departmentId: DEPT_A });
    await repo.create({ code: "JABON_001", name: "Jabón", unit: "pieza", departmentId: DEPT_B });
    const inactive = await repo.create({ code: "VIEJO_001", name: "Viejo", unit: "kg", departmentId: DEPT_B });
    await repo.softDelete(inactive.product.id);
  });

  it("lists only active products by default", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
    expect(result.total).toBe(3);
    expect(result.items.every((p) => p.isActive)).toBe(true);
  });

  it("includes inactive products when includeInactive=true", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: true });
    expect(result.total).toBe(4);
  });

  it("paginates", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 2, includeInactive: false });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
  });

  it("filters by departmentId", async () => {
    const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, departmentId: DEPT_B });
    expect(result.total).toBe(1);
    expect(result.items[0].code).toBe("JABON_001");
  });

  it("searches case-insensitively by name or code", async () => {
    const byName = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: "arroz" });
    expect(byName.items.map((p) => p.code)).toContain("ARROZ_001");

    const byCode = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: "frijol_0" });
    expect(byCode.items.map((p) => p.code)).toContain("FRIJOL_001");
  });

  describe("stock por sucursal", () => {
    const BRANCH_A = "33333333-3333-3333-3333-333333333333";

    it("sin branchId, stock es siempre null", async () => {
      const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false });
      expect(result.items.every((p) => p.stock === null)).toBe(true);
    });

    it("con branchId, devuelve la existencia registrada", async () => {
      const listed = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, search: "arroz" });
      const arrozId = listed.items[0].id;
      repo.setStock(BRANCH_A, arrozId, 42);

      const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, branchId: BRANCH_A, search: "arroz" });
      expect(result.items[0].stock).toBe(42);
    });

    it("con branchId pero sin registro de inventario, stock es null", async () => {
      const result = await useCase.execute({ page: 1, pageSize: 20, includeInactive: false, branchId: BRANCH_A, search: "frijol" });
      expect(result.items[0].stock).toBeNull();
    });
  });
});
