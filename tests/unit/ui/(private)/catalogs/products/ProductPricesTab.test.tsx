import React from "react";
import { render, screen } from "@testing-library/react";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

jest.mock(
  "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductPrices",
  () => ({ useProductPrices: jest.fn() })
);

import { useProductPrices } from "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductPrices";
import { ProductPricesTab } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductPricesTab";
import type { ProductPrice } from "../../../../../../app/(private)/catalogs/products/_logic/types/domain";

const mockUseProductPrices = useProductPrices as jest.Mock;

const BASE_HOOK = {
  prices: [] as ProductPrice[],
  isLoading: false,
  error: null,
  isSaving: false,
  saveError: null,
  clearSaveError: jest.fn(),
  refresh: jest.fn(),
  createOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
};

const makePrices = (overrides: Partial<ProductPrice>[] = []): ProductPrice[] => [
  {
    id: "pr1",
    productId: "p1",
    name: "Menudeo",
    price: 12.0,
    minQuantity: 1,
    discountPct: null,
    isDefault: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides[0],
  },
  {
    id: "pr2",
    productId: "p1",
    name: "Mayoreo",
    price: 10.0,
    minQuantity: 10,
    discountPct: 5,
    isDefault: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides[1],
  },
];

beforeEach(() => jest.clearAllMocks());

describe("ProductPricesTab — badge Default", () => {
  it("muestra badge 'Default' en la fila del precio marcado como default", () => {
    mockUseProductPrices.mockReturnValue({ ...BASE_HOOK, prices: makePrices() });

    render(<ProductPricesTab productId="p1" canWrite={true} />);

    // La columna header también dice "Default"; verificamos que al menos un <span> badge esté presente
    const allDefault = screen.getAllByText("Default");
    expect(allDefault.some((el) => el.tagName === "SPAN")).toBe(true);
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  it("la fila no-default no muestra badge 'Default'", () => {
    mockUseProductPrices.mockReturnValue({ ...BASE_HOOK, prices: makePrices() });

    render(<ProductPricesTab productId="p1" canWrite={true} />);

    const rows = screen.getAllByRole("row").slice(1);
    const mayoreoRow = rows.find((r) => r.textContent?.includes("Mayoreo"));
    expect(mayoreoRow?.textContent).not.toMatch(/^Default/);
  });
});

describe("ProductPricesTab — gating de permisos", () => {
  it("canWrite=true muestra botón 'Nuevo precio' y acciones de fila", () => {
    mockUseProductPrices.mockReturnValue({ ...BASE_HOOK, prices: makePrices() });

    render(<ProductPricesTab productId="p1" canWrite={true} />);

    expect(screen.getByRole("button", { name: /nuevo precio/i })).toBeInTheDocument();
  });

  it("canWrite=false oculta botón 'Nuevo precio' y muestra caption de solo lectura", () => {
    mockUseProductPrices.mockReturnValue({ ...BASE_HOOK, prices: makePrices() });

    render(<ProductPricesTab productId="p1" canWrite={false} />);

    expect(screen.queryByRole("button", { name: /nuevo precio/i })).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument();
  });
});

describe("ProductPricesTab — estado vacío", () => {
  it("muestra mensaje cuando no hay precios", () => {
    mockUseProductPrices.mockReturnValue({ ...BASE_HOOK, prices: [] });

    render(<ProductPricesTab productId="p1" canWrite={true} />);

    expect(screen.getByText(/sin precios configurados/i)).toBeInTheDocument();
  });
});
