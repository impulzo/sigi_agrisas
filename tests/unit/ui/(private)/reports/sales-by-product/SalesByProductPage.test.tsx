/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions");
jest.mock("../../../../../../app/_hooks/useBranchesOptions");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch");
jest.mock("../../../../../../app/(private)/reports/sales-by-product/_logic/hooks/useSalesByProductReport");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../../../app/_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../../../../app/_hooks/useBranchesOptions";
import { useCustomerSearch } from "../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch";
import { useSalesByProductReport } from "../../../../../../app/(private)/reports/sales-by-product/_logic/hooks/useSalesByProductReport";
import { SalesByProductPage } from "../../../../../../app/(private)/reports/sales-by-product/_blocks/SalesByProductPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseDepartmentsOptions = useDepartmentsOptions as jest.MockedFunction<typeof useDepartmentsOptions>;
const mockUseBranchesOptions = useBranchesOptions as jest.MockedFunction<typeof useBranchesOptions>;
const mockUseCustomerSearch = useCustomerSearch as jest.MockedFunction<typeof useCustomerSearch>;
const mockUseSalesByProductReport = useSalesByProductReport as jest.MockedFunction<typeof useSalesByProductReport>;

const REPORT = {
  generatedAt: "2026-08-08T00:00:00.000Z",
  generatedBy: { userId: "u1", email: "admin@test.com" },
  filters: { branchId: null, departmentId: null, customerId: null, from: "2026-08-01", to: "2026-08-08" },
  totals: { ticketCount: 1, subtotal: "100.0000", taxTotal: "16.0000", total: "116.0000" },
  rows: [
    {
      departmentId: "d1", departmentName: "Agroquímicos",
      productId: "p1", productCode: "F1", productName: "Fertilizante",
      customerId: "c1", customerName: "Cliente Uno",
      quantity: "4.0000", total: "116.0000",
    },
  ],
  rowsTotal: 2,
};

const baseHookResult = {
  report: REPORT,
  isLoading: false,
  error: null,
  isExportingPdf: false,
  isExportingXlsx: false,
  exportError: null,
  exportPdf: jest.fn(),
  exportXlsx: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDepartmentsOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseBranchesOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseCustomerSearch.mockReturnValue({ items: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
  mockUseCurrentUser.mockReturnValue({
    userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
    isLoading: false, can: () => true, refresh: jest.fn(),
  });
  mockUseSalesByProductReport.mockReturnValue(baseHookResult);
});

describe("SalesByProductPage", () => {
  it("sin permiso muestra estado 'Sin acceso'", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["viewer"], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });

    render(<SalesByProductPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("con datos renderiza el total y la fila de detalle Departamento+Producto+Cliente", () => {
    render(<SalesByProductPage />);
    expect(screen.getByText("Ventas por Producto")).toBeInTheDocument();
    expect(screen.getByText("Agroquímicos")).toBeInTheDocument();
    expect(screen.getByText("Fertilizante (F1)")).toBeInTheDocument();
    expect(screen.getByText("Cliente Uno")).toBeInTheDocument();
  });

  it("alcance por defecto es Global y no muestra el combobox de cliente", () => {
    render(<SalesByProductPage />);
    expect(screen.getByRole("tab", { name: "Global" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByPlaceholderText("Buscar cliente…")).not.toBeInTheDocument();
  });

  it("cambiar a Por Cliente muestra el combobox; volver a Global lo oculta", () => {
    render(<SalesByProductPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Por Cliente" }));
    expect(screen.getByPlaceholderText("Buscar cliente…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Global" }));
    expect(screen.queryByPlaceholderText("Buscar cliente…")).not.toBeInTheDocument();
  });

  it("muestra la paginación de la tabla de detalle", () => {
    render(<SalesByProductPage />);
    expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
  });

  it("reporte demasiado grande para exportar muestra mensaje legible", () => {
    mockUseSalesByProductReport.mockReturnValue({
      ...baseHookResult,
      exportError: new Error("El conjunto de datos supera 10,000 registros. Aplica más filtros."),
    });

    render(<SalesByProductPage />);
    expect(screen.getByText("El conjunto de datos supera 10,000 registros. Aplica más filtros.")).toBeInTheDocument();
  });

  it("resetea a la página 1 al cambiar el alcance", () => {
    render(<SalesByProductPage />);

    fireEvent.click(screen.getByLabelText("Página siguiente"));
    const afterNext = mockUseSalesByProductReport.mock.calls.at(-1)![0];
    expect(afterNext.page).toBe(2);

    fireEvent.click(screen.getByRole("tab", { name: "Por Cliente" }));
    const afterScopeChange = mockUseSalesByProductReport.mock.calls.at(-1)![0];
    expect(afterScopeChange.page).toBe(1);
  });
});
