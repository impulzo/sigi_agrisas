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
  "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductDosifications",
  () => ({ useProductDosifications: jest.fn() })
);

import { useProductDosifications } from "../../../../../../app/(private)/catalogs/products/_logic/hooks/useProductDosifications";
import { ProductDosificationsTab } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductDosificationsTab";
import type { ProductDosification } from "../../../../../../app/(private)/catalogs/products/_logic/types/domain";

const mockUseDosifications = useProductDosifications as jest.Mock;

const BASE_HOOK = {
  dosifications: [] as ProductDosification[],
  isLoading: false,
  error: null,
  isSaving: false,
  saveError: null,
  clearSaveError: jest.fn(),
  refresh: jest.fn(),
  createOne: jest.fn(),
  updateOne: jest.fn(),
  softDeleteOne: jest.fn(),
  reactivateOne: jest.fn(),
};

const makeDosification = (overrides: Partial<ProductDosification> = {}): ProductDosification => ({
  id: "dos1",
  productId: "p1",
  name: "Por dosis",
  numParts: 10,
  isActive: true,
  computedUnitPrice: 10.7,
  requiresDefaultPrice: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe("ProductDosificationsTab — computedUnitPrice", () => {
  it("muestra el precio unitario calculado cuando requiresDefaultPrice es false", () => {
    mockUseDosifications.mockReturnValue({
      ...BASE_HOOK,
      dosifications: [makeDosification({ computedUnitPrice: 10.7, requiresDefaultPrice: false })],
    });

    render(<ProductDosificationsTab productId="p1" canWrite={true} />);

    expect(screen.getByText("$10.70")).toBeInTheDocument();
  });

  it("muestra 'Requiere precio default' cuando requiresDefaultPrice es true", () => {
    mockUseDosifications.mockReturnValue({
      ...BASE_HOOK,
      dosifications: [makeDosification({ computedUnitPrice: null, requiresDefaultPrice: true })],
    });

    render(<ProductDosificationsTab productId="p1" canWrite={true} />);

    expect(screen.getByText(/requiere precio default/i)).toBeInTheDocument();
  });
});

describe("ProductDosificationsTab — gating de permisos", () => {
  it("canWrite=true muestra botón 'Nueva dosificación'", () => {
    mockUseDosifications.mockReturnValue({
      ...BASE_HOOK,
      dosifications: [makeDosification()],
    });

    render(<ProductDosificationsTab productId="p1" canWrite={true} />);

    expect(screen.getByRole("button", { name: /nueva dosificación/i })).toBeInTheDocument();
  });

  it("canWrite=false oculta acciones y muestra caption de solo lectura", () => {
    mockUseDosifications.mockReturnValue({
      ...BASE_HOOK,
      dosifications: [makeDosification()],
    });

    render(<ProductDosificationsTab productId="p1" canWrite={false} />);

    expect(screen.queryByRole("button", { name: /nueva dosificación/i })).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/i)).toBeInTheDocument();
  });
});

describe("ProductDosificationsTab — estado vacío", () => {
  it("muestra mensaje cuando no hay dosificaciones", () => {
    mockUseDosifications.mockReturnValue({ ...BASE_HOOK, dosifications: [] });

    render(<ProductDosificationsTab productId="p1" canWrite={true} />);

    expect(screen.getByText(/sin dosificaciones configuradas/i)).toBeInTheDocument();
  });
});
