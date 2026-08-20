/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions");
jest.mock("../../../../../../app/_hooks/useBranchesOptions");
jest.mock("../../../../../../app/(private)/reports/inventory/_logic/hooks/useInventoryReport");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../../../app/_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../../../../app/_hooks/useBranchesOptions";
import { useInventoryReport } from "../../../../../../app/(private)/reports/inventory/_logic/hooks/useInventoryReport";
import { InventoryPage } from "../../../../../../app/(private)/reports/inventory/_blocks/InventoryPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseDepartmentsOptions = useDepartmentsOptions as jest.MockedFunction<typeof useDepartmentsOptions>;
const mockUseBranchesOptions = useBranchesOptions as jest.MockedFunction<typeof useBranchesOptions>;
const mockUseInventoryReport = useInventoryReport as jest.MockedFunction<typeof useInventoryReport>;

function emptyHookReturn() {
  return {
    report: null, isLoading: false, error: null,
    isExportingPdf: false, isExportingXlsx: false, exportError: null,
    refresh: jest.fn(), exportPdf: jest.fn().mockResolvedValue(undefined), exportXlsx: jest.fn().mockResolvedValue(undefined),
  };
}

function reportFixture() {
  return {
    generatedAt: "2026-08-08T00:00:00.000Z",
    generatedBy: { userId: "u1", email: "admin@test.com" },
    filters: { departmentId: null, branchId: null },
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
            unitDescription: null,
            stockQuantity: "25.0000",
            ivaRate: "0.1600",
            iepsRate: null,
            acquisitionPrice: null,
            prices: [
              { priceId: "p1", name: "Menudeo", price: "100.0000", minQuantity: 1, discountPct: "0.00", isDefault: true },
            ],
          },
        ],
        subtotal: { productCount: 1, priceCount: 1, totalStock: "25.0000" },
      },
      {
        departmentId: "dept-2",
        departmentCode: "FERT",
        departmentName: "FERTILIZANTES",
        products: [
          {
            productId: "prod-2",
            code: "UREA50",
            name: "UREA 50KG",
            unit: "SACO",
            unitDescription: null,
            stockQuantity: "8.0000",
            ivaRate: "0.1600",
            iepsRate: null,
            acquisitionPrice: null,
            prices: [
              { priceId: "p2", name: "Menudeo", price: "500.0000", minQuantity: 1, discountPct: null, isDefault: true },
            ],
          },
        ],
        subtotal: { productCount: 1, priceCount: 1, totalStock: "8.0000" },
      },
    ],
    totals: { departmentCount: 2, productCount: 2, priceCount: 2, totalStock: "33.0000" },
  };
}

describe("InventoryPage", () => {
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
    mockUseBranchesOptions.mockReturnValue({
      options: [{ id: "branch-1", name: "Matriz" }],
      isLoading: false,
    });
    mockUseInventoryReport.mockReturnValue(emptyHookReturn());
  });

  it("muestra Sin acceso sin permiso", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: [], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });
    render(<InventoryPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra filtro de sucursal solo con branches:access_all", () => {
    render(<InventoryPage />);
    expect(screen.getByText("Sucursal")).toBeInTheDocument();
  });

  it("oculta filtro de sucursal sin branches:access_all", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "op@test.com", roles: ["operator"], branchId: "branch-1",
      isLoading: false, can: (perm: string) => perm !== "branches:access_all", refresh: jest.fn(),
    });
    render(<InventoryPage />);
    expect(screen.queryByText("Sucursal")).not.toBeInTheDocument();
  });

  it("tab 'Por Departamento' es el default, con gate de selección y shouldFetch=false", () => {
    render(<InventoryPage />);
    expect(screen.getByRole("tab", { name: "Por Departamento" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Global" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Selecciona un departamento")).toBeInTheDocument();

    const lastCall = mockUseInventoryReport.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldFetch).toBe(false);
    expect(lastCall?.departmentId).toBeUndefined();
  });

  it("seleccionar departamento dispara fetch con departmentId y muestra la tabla", () => {
    mockUseInventoryReport.mockReturnValue({ ...emptyHookReturn(), report: reportFixture() });
    render(<InventoryPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Departamento" }), { target: { value: "dept-1" } });

    const lastCall = mockUseInventoryReport.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldFetch).toBe(true);
    expect(lastCall?.departmentId).toBe("dept-1");
    expect(screen.getByText("ACTIVA1")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("tab 'Global' dispara fetch sin requerir departamento y muestra todos los departamentos", () => {
    mockUseInventoryReport.mockReturnValue({ ...emptyHookReturn(), report: reportFixture() });
    render(<InventoryPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Global" }));

    expect(screen.queryByRole("combobox", { name: "Departamento" })).not.toBeInTheDocument();
    const lastCall = mockUseInventoryReport.mock.calls.at(-1)?.[0];
    expect(lastCall?.shouldFetch).toBe(true);
    expect(lastCall?.departmentId).toBeUndefined();
    expect(screen.getByText("AGRO — AGRICULTOR")).toBeInTheDocument();
    expect(screen.getByText("FERT — FERTILIZANTES")).toBeInTheDocument();
  });

  it("botones de exportar deshabilitados sin datos, habilitados con datos", () => {
    const { rerender } = render(<InventoryPage />);
    expect(screen.getByText("Exportar PDF")).toBeDisabled();
    expect(screen.getByText("Exportar Excel")).toBeDisabled();

    mockUseInventoryReport.mockReturnValue({ ...emptyHookReturn(), report: reportFixture() });
    rerender(<InventoryPage />);
    expect(screen.getByText("Exportar PDF")).not.toBeDisabled();
    expect(screen.getByText("Exportar Excel")).not.toBeDisabled();
  });

  it("muestra estado vacío cuando no hay productos para los filtros", () => {
    mockUseInventoryReport.mockReturnValue({
      ...emptyHookReturn(),
      report: { ...reportFixture(), departments: [], totals: { departmentCount: 0, productCount: 0, priceCount: 0, totalStock: "0.0000" } },
    });
    render(<InventoryPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Global" }));
    expect(screen.getByText("Sin productos")).toBeInTheDocument();
  });
});
