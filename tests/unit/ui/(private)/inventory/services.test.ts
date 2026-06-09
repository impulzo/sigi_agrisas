import { NetworkError } from "../../../../../app/_lib/authFetch";
import {
  assignProduct,
  adjustStock,
  updateInventoryItem,
  removeInventoryItem,
  listBranchInventory,
  toInventoryItem,
} from "../../../../../app/(private)/inventory/_logic/services/inventory";
import {
  InventoryAlreadyExistsError,
  InventoryTargetInvalidError,
  NegativeStockNotAllowedError,
  InventoryRecordNotFoundError,
} from "../../../../../app/(private)/inventory/_logic/errors";

const BASE_DTO = {
  id: "inv1",
  branchId: "b1",
  productId: "p1",
  productCode: "PROD_01",
  productName: "Maíz Blanco",
  quantity: 100,
  reservedQuantity: 10,
  reorderPoint: 20,
  updatedAt: "2026-05-20T00:00:00.000Z",
};

function mockFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("toInventoryItem", () => {
  it("convierte updatedAt ISO a Date", () => {
    const item = toInventoryItem(BASE_DTO);
    expect(item.updatedAt).toBeInstanceOf(Date);
    expect(item.updatedAt.toISOString()).toBe("2026-05-20T00:00:00.000Z");
  });
});

describe("assignProduct", () => {
  it("devuelve InventoryItem en 201", async () => {
    const fetch = mockFetch(201, BASE_DTO);
    const item = await assignProduct(
      { branchId: "b1", body: { productId: "p1", quantity: 100, reorderPoint: 20 } },
      fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
    );
    expect(item.productCode).toBe("PROD_01");
  });

  it("lanza InventoryAlreadyExistsError en 409", async () => {
    const fetch = mockFetch(409, {});
    await expect(
      assignProduct(
        { branchId: "b1", body: { productId: "p1", quantity: 100, reorderPoint: 20 } },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(InventoryAlreadyExistsError);
  });

  it("lanza InventoryTargetInvalidError en 400", async () => {
    const fetch = mockFetch(400, { error: "product inactive" });
    await expect(
      assignProduct(
        { branchId: "b1", body: { productId: "p_inactive", quantity: 0, reorderPoint: 0 } },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(InventoryTargetInvalidError);
  });
});

describe("adjustStock", () => {
  it("devuelve InventoryItem en 200", async () => {
    const fetch = mockFetch(200, { ...BASE_DTO, quantity: 125 });
    const item = await adjustStock(
      { branchId: "b1", productId: "p1", body: { delta: 25 } },
      fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
    );
    expect(item.quantity).toBe(125);
  });

  it("lanza NegativeStockNotAllowedError en 409", async () => {
    const fetch = mockFetch(409, {});
    await expect(
      adjustStock(
        { branchId: "b1", productId: "p1", body: { delta: -9999 } },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(NegativeStockNotAllowedError);
  });

  it("lanza InventoryRecordNotFoundError en 404", async () => {
    const fetch = mockFetch(404, {});
    await expect(
      adjustStock(
        { branchId: "b1", productId: "p_unknown", body: { delta: 1 } },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(InventoryRecordNotFoundError);
  });
});

describe("updateInventoryItem", () => {
  it("devuelve InventoryItem actualizado en 200", async () => {
    const fetch = mockFetch(200, { ...BASE_DTO, reorderPoint: 30 });
    const item = await updateInventoryItem(
      { branchId: "b1", productId: "p1", body: { reorderPoint: 30 } },
      fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
    );
    expect(item.reorderPoint).toBe(30);
  });

  it("lanza InventoryRecordNotFoundError en 404", async () => {
    const fetch = mockFetch(404, {});
    await expect(
      updateInventoryItem(
        { branchId: "b1", productId: "p_x", body: { quantity: 0 } },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(InventoryRecordNotFoundError);
  });
});

describe("removeInventoryItem", () => {
  it("resuelve sin error en 204", async () => {
    const fetch = mockFetch(204, {});
    await expect(
      removeInventoryItem(
        { branchId: "b1", productId: "p1" },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).resolves.toBeUndefined();
  });

  it("lanza InventoryRecordNotFoundError en 404", async () => {
    const fetch = mockFetch(404, {});
    await expect(
      removeInventoryItem(
        { branchId: "b1", productId: "p_x" },
        fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(InventoryRecordNotFoundError);
  });
});

describe("listBranchInventory", () => {
  it("devuelve items y total", async () => {
    const fetch = mockFetch(200, { items: [BASE_DTO], total: 1, page: 1, pageSize: 20 });
    const result = await listBranchInventory(
      { branchId: "b1", page: 1, pageSize: 20 },
      fetch as unknown as typeof import("../../../../../app/_lib/authFetch").authFetch,
    );
    expect(result.total).toBe(1);
    expect(result.items[0].productCode).toBe("PROD_01");
  });
});
