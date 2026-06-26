import { NetworkError } from "../../../../../../app/_lib/authFetch";
import {
  getProduct,
  createProduct,
  updateProduct,
  softDeleteProduct,
  listProducts,
  toProduct,
} from "../../../../../../app/(private)/catalogs/products/_logic/services/products";
import { uploadProductImage } from "../../../../../../app/(private)/catalogs/products/_logic/services/uploadProductImage";
import { deleteProductImage } from "../../../../../../app/(private)/catalogs/products/_logic/services/deleteProductImage";
import {
  ProductNotFoundError,
  ProductCodeAlreadyInUseError,
  ProductDepartmentInvalidError,
  ProductImageTooLargeError,
  ProductImageInvalidFormatError,
} from "../../../../../../app/(private)/catalogs/products/_logic/errors";

const BASE_DTO = {
  id: "p1",
  code: "PROD_01",
  name: "Producto Uno",
  unit: "kg",
  satProductCode: null,
  departmentId: "d1",
  departmentName: "Agrícola",
  providerId: null,
  providerName: null,
  taxRateId: null,
  taxRateCode: null,
  ivaRate: 0.16,
  iepsRate: null,
  imageUrl: null,
  isActive: true,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-20T00:00:00.000Z",
};

function mockFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("toProduct", () => {
  it("convierte fechas ISO a Date", () => {
    const product = toProduct(BASE_DTO);
    expect(product.createdAt).toBeInstanceOf(Date);
    expect(product.updatedAt).toBeInstanceOf(Date);
    expect(product.createdAt.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("preserva ivaRate y iepsRate null", () => {
    const product = toProduct({ ...BASE_DTO, ivaRate: null, iepsRate: null });
    expect(product.ivaRate).toBeNull();
    expect(product.iepsRate).toBeNull();
  });
});

describe("getProduct", () => {
  it("devuelve el producto correctamente con fetchImpl", async () => {
    const fetch = mockFetch(200, BASE_DTO);
    const product = await getProduct({ id: "p1" }, fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch);
    expect(product.id).toBe("p1");
    expect(product.code).toBe("PROD_01");
  });

  it("lanza ProductNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(
      getProduct({ id: "p1" }, fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch)
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("lanza NetworkError en 500", async () => {
    const fetch = mockFetch(500, {});
    await expect(
      getProduct({ id: "p1" }, fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch)
    ).rejects.toThrow(NetworkError);
  });
});

describe("createProduct", () => {
  it("crea y devuelve el producto en 201", async () => {
    const fetch = mockFetch(201, BASE_DTO);
    const product = await createProduct(
      { body: { code: "PROD_01", name: "P", unit: "kg", departmentId: "d1" } },
      fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
    );
    expect(product.id).toBe("p1");
  });

  it("lanza ProductCodeAlreadyInUseError en 409", async () => {
    const fetch = mockFetch(409, { error: "code already in use" });
    await expect(
      createProduct(
        { body: { code: "PROD_01", name: "P", unit: "kg", departmentId: "d1" } },
        fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(ProductCodeAlreadyInUseError);
  });

  it("lanza ProductDepartmentInvalidError en 400 con 'department'", async () => {
    const fetch = mockFetch(400, { error: "department not found" });
    await expect(
      createProduct(
        { body: { code: "P2", name: "P", unit: "kg", departmentId: "bad" } },
        fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(ProductDepartmentInvalidError);
  });

  it("lanza NetworkError en 400 sin 'department'", async () => {
    const fetch = mockFetch(400, { error: "invalid body" });
    await expect(
      createProduct(
        { body: { code: "P2", name: "P", unit: "kg", departmentId: "d1" } },
        fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(NetworkError);
  });
});

describe("updateProduct", () => {
  it("lanza ProductNotFoundError en 404", async () => {
    const fetch = mockFetch(404, {});
    await expect(
      updateProduct(
        { id: "p1", body: { name: "Nuevo" } },
        fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("lanza ProductDepartmentInvalidError en 400 con 'department'", async () => {
    const fetch = mockFetch(400, { error: "department is inactive" });
    await expect(
      updateProduct(
        { id: "p1", body: { departmentId: "d_old" } },
        fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
      )
    ).rejects.toThrow(ProductDepartmentInvalidError);
  });
});

describe("softDeleteProduct", () => {
  it("resuelve sin error en 200", async () => {
    const fetch = mockFetch(200, {});
    await expect(
      softDeleteProduct({ id: "p1" }, fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch)
    ).resolves.toBeUndefined();
  });

  it("lanza ProductNotFoundError en 404", async () => {
    const fetch = mockFetch(404, {});
    await expect(
      softDeleteProduct({ id: "p1" }, fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch)
    ).rejects.toThrow(ProductNotFoundError);
  });
});

describe("listProducts", () => {
  it("mapea la respuesta con items y total", async () => {
    const fetch = mockFetch(200, { items: [BASE_DTO], total: 1, page: 1, pageSize: 20 });
    const result = await listProducts(
      { page: 1, pageSize: 20 },
      fetch as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch,
    );
    expect(result.total).toBe(1);
    expect(result.items[0].code).toBe("PROD_01");
  });
});

describe("uploadProductImage (task 6.3)", () => {
  function mockFetchForUpload(status: number, body: unknown) {
    return jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }) as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch;
  }

  it("devuelve imageUrl en éxito (200)", async () => {
    const fetchImpl = mockFetchForUpload(200, { imageUrl: "https://storage.test/products/p1/uuid.jpg" });
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    const url = await uploadProductImage("p1", file, fetchImpl);
    expect(url).toBe("https://storage.test/products/p1/uuid.jpg");
  });

  it("llama al endpoint correcto con método POST", async () => {
    const fetchImpl = mockFetchForUpload(200, { imageUrl: "https://x.test/img.jpg" });
    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    await uploadProductImage("abc-123", file, fetchImpl);
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/admin/products/abc-123/image");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("lanza ProductImageTooLargeError en 413", async () => {
    const fetchImpl = mockFetchForUpload(413, { error: "Image too large", maxBytes: 2097152 });
    const file = new File(["big"], "big.jpg", { type: "image/jpeg" });
    await expect(uploadProductImage("p1", file, fetchImpl)).rejects.toThrow(ProductImageTooLargeError);
  });

  it("lanza ProductImageInvalidFormatError en 400 con 'Invalid image format'", async () => {
    const fetchImpl = mockFetchForUpload(400, { error: "Invalid image format" });
    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    await expect(uploadProductImage("p1", file, fetchImpl)).rejects.toThrow(ProductImageInvalidFormatError);
  });

  it("lanza Error genérico en 400 con otro mensaje", async () => {
    const fetchImpl = mockFetchForUpload(400, { error: "Missing file field" });
    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    await expect(uploadProductImage("p1", file, fetchImpl)).rejects.toThrow("Missing file field");
  });
});

describe("deleteProductImage (task 6.3)", () => {
  function mockFetchForDelete(status: number, body: unknown = {}) {
    return jest.fn().mockResolvedValue({
      ok: status === 204 || (status >= 200 && status < 300),
      status,
      json: () => Promise.resolve(body),
    }) as unknown as typeof import("../../../../../../app/_lib/authFetch").authFetch;
  }

  it("resuelve sin error en 204", async () => {
    const fetchImpl = mockFetchForDelete(204);
    await expect(deleteProductImage("p1", fetchImpl)).resolves.toBeUndefined();
  });

  it("llama al endpoint correcto con método DELETE", async () => {
    const fetchImpl = mockFetchForDelete(204);
    await deleteProductImage("p1", fetchImpl);
    const [url, init] = (fetchImpl as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/admin/products/p1/image");
    expect(init.method).toBe("DELETE");
  });

  it("lanza Error en respuesta no exitosa", async () => {
    const fetchImpl = mockFetchForDelete(404, { error: "Product not found" });
    await expect(deleteProductImage("p1", fetchImpl)).rejects.toThrow("Product not found");
  });
});
