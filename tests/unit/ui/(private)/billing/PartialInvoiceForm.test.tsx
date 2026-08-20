/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../app/(private)/billing/_logic/services", () => ({
  stampInvoice: jest.fn(),
}));

jest.mock("../../../../../app/(private)/pos/_logic/services/getProductPrices", () => ({
  getProductPrices: jest.fn(),
}));

jest.mock("../../../../../app/(private)/pos/_blocks/CustomerPicker", () => ({
  CustomerPicker: () => <div data-testid="customer-picker" />,
}));

jest.mock("../../../../../app/(private)/pos/_blocks/ProductCatalogPanel", () => ({
  ProductCatalogPanel: ({ onAddProduct }: { onAddProduct: (p: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onAddProduct({
          id: "prod-1",
          code: "P001",
          name: "Producto de prueba",
          ivaRate: 0.16,
          iepsRate: null,
          isActive: true,
          departmentId: "d1",
          createdAt: new Date(),
          updatedAt: new Date(),
          stock: null,
        })
      }
    >
      Agregar Producto de prueba
    </button>
  ),
}));

import { getProductPrices } from "../../../../../app/(private)/pos/_logic/services/getProductPrices";
import { PartialInvoiceForm } from "../../../../../app/(private)/billing/_blocks/PartialInvoiceForm";

const mockGetProductPrices = getProductPrices as jest.MockedFunction<typeof getProductPrices>;

describe("PartialInvoiceForm — handleAddProduct preselects default price", () => {
  beforeEach(() => jest.clearAllMocks());

  it("preloads the default price's unitPrice, not 0", async () => {
    mockGetProductPrices.mockResolvedValueOnce([
      { id: "price-1", productId: "prod-1", name: "Precio menudeo", price: 50, minQuantity: 1, discountPct: 0, isDefault: false },
      { id: "price-2", productId: "prod-1", name: "Precio mayoreo", price: 250, minQuantity: 10, discountPct: 0, isDefault: true },
    ]);
    render(<PartialInvoiceForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /\+ catálogo/i }));
    await user.click(screen.getByRole("button", { name: /agregar producto de prueba/i }));

    expect(await screen.findByDisplayValue("250")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /precio mayoreo/i })).toBeInTheDocument();
  });

  it("falls back to the first price when none is marked default", async () => {
    mockGetProductPrices.mockResolvedValueOnce([
      { id: "price-1", productId: "prod-1", name: "Único precio", price: 75, minQuantity: 1, discountPct: 0, isDefault: false },
    ]);
    render(<PartialInvoiceForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /\+ catálogo/i }));
    await user.click(screen.getByRole("button", { name: /agregar producto de prueba/i }));

    expect(await screen.findByDisplayValue("75")).toBeInTheDocument();
  });

  it("falls back to unitPrice 0 when the product has no prices", async () => {
    mockGetProductPrices.mockResolvedValueOnce([]);
    render(<PartialInvoiceForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /\+ catálogo/i }));
    await user.click(screen.getByRole("button", { name: /agregar producto de prueba/i }));

    expect(await screen.findByText("Elegir precio")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0.00")).toHaveValue("0");
  });
});
