import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/_hooks/useTaxRatesOptions", () => ({
  useTaxRatesOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions", () => ({
  useDepartmentsOptions: () => ({ options: [] }),
}));
jest.mock("../../../../../../app/_hooks/useSatCodesSearch", () => ({
  useSatCodesSearch: jest.fn(() => ({ options: [], isLoading: false })),
}));
jest.mock("../../../../../../app/_hooks/useSatCatalogSearch", () => ({
  useSatCatalogSearch: jest.fn(() => ({ options: [], isLoading: false })),
}));

const updateProduct = jest.fn();
jest.mock("../../../../../../app/(private)/catalogs/products/_logic/services/products", () => ({
  updateProduct: (...args: unknown[]) => updateProduct(...args),
}));
jest.mock("../../../../../../app/(private)/catalogs/products/_logic/services/uploadProductImage", () => ({
  uploadProductImage: jest.fn(),
}));
jest.mock("../../../../../../app/(private)/catalogs/products/_logic/services/deleteProductImage", () => ({
  deleteProductImage: jest.fn(),
}));

import { ProductGeneralTab } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductGeneralTab";
import type { Product } from "../../../../../../app/(private)/catalogs/products/_logic/types/domain";

const BASE_PRODUCT: Product = {
  id: "p1",
  code: "PROD_01",
  name: "Arroz",
  unit: "kg",
  unitDescription: null,
  satProductCode: null,
  departmentId: "dept-1",
  departmentName: "Agrícola",
  providerId: null,
  providerName: null,
  taxRateId: null,
  taxRateCode: null,
  ivaRate: null,
  iepsRate: null,
  imageUrl: null,
  manufactureDate: null,
  acquisitionPrice: 52.3,
  isTaxable: false,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => jest.clearAllMocks());

describe("ProductGeneralTab — precio de adquisición", () => {
  it("pre-rellena el precio de adquisición existente", () => {
    render(
      <ProductGeneralTab product={BASE_PRODUCT} canWrite deptOptions={[]} onUpdated={jest.fn()} />
    );
    expect(screen.getByLabelText(/precio de adquisición/i)).toHaveValue(52.3);
  });

  it("captura y envía un nuevo precio de adquisición", async () => {
    updateProduct.mockResolvedValue({ ...BASE_PRODUCT, acquisitionPrice: 60 });
    const user = userEvent.setup();
    render(
      <ProductGeneralTab product={BASE_PRODUCT} canWrite deptOptions={[]} onUpdated={jest.fn()} />
    );

    const input = screen.getByLabelText(/precio de adquisición/i);
    await user.clear(input);
    await user.type(input, "60");

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(updateProduct).toHaveBeenCalledWith({ id: "p1", body: { acquisitionPrice: 60 } });
  });

  it("limpiar el campo envía acquisitionPrice null", async () => {
    updateProduct.mockResolvedValue({ ...BASE_PRODUCT, acquisitionPrice: null });
    const user = userEvent.setup();
    render(
      <ProductGeneralTab product={BASE_PRODUCT} canWrite deptOptions={[]} onUpdated={jest.fn()} />
    );

    const input = screen.getByLabelText(/precio de adquisición/i);
    await user.clear(input);

    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(updateProduct).toHaveBeenCalledWith({ id: "p1", body: { acquisitionPrice: null } });
  });
});
