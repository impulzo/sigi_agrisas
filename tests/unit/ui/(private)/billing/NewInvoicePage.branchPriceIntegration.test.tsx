/**
 * @jest-environment jsdom
 *
 * Cierra el gap señalado en la verificación (opsx:verify) de
 * add-billing-partial-invoice-branch-selector: los tests existentes prueban
 * el selector de sucursal (NewInvoicePage.branchSelector.test.tsx, con
 * PartialInvoiceForm mockeado) y la resolución de precio por effectiveBranchId
 * (PartialInvoiceForm.test.tsx, sin pasar por el selector real) por separado.
 * Este archivo ejercita ambos juntos: selector real + PartialInvoiceForm real,
 * verificando el escenario de spec "Catalog line whose only price is
 * branch-scoped loads once the matching branch is selected" sin depender de
 * verificación manual en Playwright.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/_lib/authFetch");
jest.mock("../../../../../app/(private)/pos/_logic/services/getProductPrices", () => ({
  getProductPrices: jest.fn(),
}));

jest.mock("../../../../../app/(private)/billing/_blocks/StampSaleForm", () => ({
  StampSaleForm: () => <div data-testid="stamp-sale-form" />,
}));
jest.mock("../../../../../app/(private)/pos/_blocks/CustomerPicker", () => ({
  CustomerPicker: () => <div data-testid="customer-picker" />,
}));
jest.mock("../../../../../app/(private)/pos/_blocks/CustomerQuickAddModal", () => ({
  CustomerQuickAddModal: () => null,
}));
jest.mock("../../../../../app/(private)/pos/_blocks/ProductCatalogPanel", () => ({
  ProductCatalogPanel: ({ onAddProduct }: { onAddProduct: (p: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onAddProduct({
          id: "prod-infinito-1l",
          code: "INFINITO_1L",
          name: "INFINITO 1L",
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
      Agregar INFINITO 1L
    </button>
  ),
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { authFetch } from "../../../../../app/_lib/authFetch";
import { getProductPrices } from "../../../../../app/(private)/pos/_logic/services/getProductPrices";
import { NewInvoicePage } from "../../../../../app/(private)/billing/_blocks/NewInvoicePage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;
const mockGetProductPrices = getProductPrices as jest.MockedFunction<typeof getProductPrices>;

const TLAXIACO_ID = "b-tlaxiaco";

function setupBypassAdmin() {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "admin@test.com",
    roles: ["admin"],
    branchId: null,
    isLoading: false,
    can: jest.fn((p: string) => (p === "billing:write" ? true : p === "branches:access_all" ? true : false)),
    refresh: jest.fn(),
  });

  mockAuthFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/admin/branches")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ items: [{ id: TLAXIACO_ID, code: "TLAXIACO", name: "TLAXIACO", isHeadquarters: false }] }),
      } as Response);
    }
    return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
  });
}

async function switchToPartialMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: /factura parcial/i }));
}

describe("NewInvoicePage + PartialInvoiceForm (real, sin mockear) — selector de sucursal resuelve precio branch-scoped", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin sucursal seleccionada: producto branch-scoped queda en 0 (sin regresión)", async () => {
    setupBypassAdmin();
    mockGetProductPrices.mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    await user.click(await screen.findByRole("button", { name: /\+ catálogo/i }));
    await user.click(await screen.findByRole("button", { name: /agregar infinito 1l/i }));

    expect(await screen.findByText("Elegir precio")).toBeInTheDocument();
    expect(mockGetProductPrices).toHaveBeenCalledWith("prod-infinito-1l", null);
  });

  it("seleccionando TLAXIACO: producto cuyo único precio es de esa sucursal resuelve su default, sin pasar por mocks intermedios", async () => {
    setupBypassAdmin();
    mockGetProductPrices.mockResolvedValueOnce([
      { id: "price-tlax", productId: "prod-infinito-1l", name: "Precio Publico", price: 1076, minQuantity: 1, discountPct: 0, isDefault: true },
    ]);
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    const select = await screen.findByRole("combobox", { name: /sucursal/i });
    await user.selectOptions(select, TLAXIACO_ID);

    await user.click(await screen.findByRole("button", { name: /\+ catálogo/i }));
    await user.click(await screen.findByRole("button", { name: /agregar infinito 1l/i }));

    expect(await screen.findByDisplayValue("1076")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /precio publico/i })).toBeInTheDocument();
    expect(mockGetProductPrices).toHaveBeenCalledWith("prod-infinito-1l", TLAXIACO_ID);
  });
});
