/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions");
jest.mock("../../../../../../app/(private)/reports/inventory-by-department/_logic/hooks/useDepartmentPriceList");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../../../app/_hooks/useDepartmentsOptions";
import { useDepartmentPriceList } from "../../../../../../app/(private)/reports/inventory-by-department/_logic/hooks/useDepartmentPriceList";
import { InventoryByDepartmentPage } from "../../../../../../app/(private)/reports/inventory-by-department/_blocks/InventoryByDepartmentPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseDepartmentsOptions = useDepartmentsOptions as jest.MockedFunction<typeof useDepartmentsOptions>;
const mockUseDepartmentPriceList = useDepartmentPriceList as jest.MockedFunction<typeof useDepartmentPriceList>;

function reportFixture() {
  return {
    generatedAt: "2026-08-08T00:00:00.000Z",
    generatedBy: { userId: "u1", email: "admin@test.com" },
    filters: { departmentId: "dept-1" },
    departments: [
      {
        departmentId: "dept-1",
        departmentCode: "AGRO",
        departmentName: "AGRICULTOR",
        products: [
          {
            productId: "prod-1",
            code: "ACTIVA1",
            name: "ACTIVANE 1KG",
            unit: "PZA",
            ivaRate: "0.1600",
            iepsRate: null,
            prices: [
              { priceId: "p1", name: "Menudeo", price: "100.0000", minQuantity: 1, discountPct: "0.00", isDefault: true },
              { priceId: "p2", name: "Mayoreo", price: "90.0000", minQuantity: 10, discountPct: "10.00", isDefault: false },
            ],
          },
          {
            productId: "prod-2",
            code: "SINPRE",
            name: "SIN PRECIO",
            unit: "KG",
            ivaRate: null,
            iepsRate: null,
            prices: [],
          },
        ],
        subtotal: { productCount: 2, priceCount: 2 },
      },
    ],
    totals: { departmentCount: 1, productCount: 2, priceCount: 2 },
  };
}

describe("InventoryByDepartmentPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
      isLoading: false, can: () => true, refresh: jest.fn(),
    });
    mockUseDepartmentsOptions.mockReturnValue({
      options: [{ id: "dept-1", name: "AGRICULTOR", providerId: null, providerName: null }],
      isLoading: false,
    });
    mockUseDepartmentPriceList.mockReturnValue({
      report: null, isLoading: false, error: null,
      isExportingPdf: false, isExportingXlsx: false, exportError: null,
      refresh: jest.fn(), exportPdf: jest.fn().mockResolvedValue(undefined), exportXlsx: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("muestra prompt de selección cuando no hay departamento", () => {
    render(<InventoryByDepartmentPage />);
    expect(screen.getByText("Selecciona un departamento")).toBeInTheDocument();
  });

  it("muestra Sin acceso sin permiso", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: [], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });
    render(<InventoryByDepartmentPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra la tabla agrupada por producto con sus precios", () => {
    mockUseDepartmentPriceList.mockReturnValue({
      report: reportFixture(), isLoading: false, error: null,
      isExportingPdf: false, isExportingXlsx: false, exportError: null,
      refresh: jest.fn(), exportPdf: jest.fn().mockResolvedValue(undefined), exportXlsx: jest.fn().mockResolvedValue(undefined),
    });
    render(<InventoryByDepartmentPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dept-1" } });
    expect(screen.getByText("ACTIVA1 — ACTIVANE 1KG")).toBeInTheDocument();
    expect(screen.getByText("Menudeo")).toBeInTheDocument();
    expect(screen.getByText("Mayoreo")).toBeInTheDocument();
    expect(screen.getByText("SINPRE — SIN PRECIO")).toBeInTheDocument();
    expect(screen.getAllByText("Sin listas de precio")).toHaveLength(1);
    expect(screen.getAllByText(/2 productos/)).toHaveLength(2);
    expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
    expect(screen.getByText("Exportar Excel")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando el departamento no tiene productos", () => {
    mockUseDepartmentPriceList.mockReturnValue({
      report: { ...reportFixture(), departments: [], totals: { departmentCount: 0, productCount: 0, priceCount: 0 } },
      isLoading: false, error: null,
      isExportingPdf: false, isExportingXlsx: false, exportError: null,
      refresh: jest.fn(), exportPdf: jest.fn().mockResolvedValue(undefined), exportXlsx: jest.fn().mockResolvedValue(undefined),
    });
    render(<InventoryByDepartmentPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dept-1" } });
    expect(screen.getByText("Sin productos")).toBeInTheDocument();
  });
});
