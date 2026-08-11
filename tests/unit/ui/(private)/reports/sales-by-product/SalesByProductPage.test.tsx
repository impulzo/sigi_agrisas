/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useDepartmentsOptions");
jest.mock("../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch");
jest.mock("../../../../../../app/(private)/reports/sales-by-product/_logic/hooks/useSalesByProductReport");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../../../app/_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions";
import { useCustomerSearch } from "../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch";
import { useSalesByProductReport } from "../../../../../../app/(private)/reports/sales-by-product/_logic/hooks/useSalesByProductReport";
import { SalesByProductPage } from "../../../../../../app/(private)/reports/sales-by-product/_blocks/SalesByProductPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseDepartmentsOptions = useDepartmentsOptions as jest.MockedFunction<typeof useDepartmentsOptions>;
const mockUseBranchesOptions = useBranchesOptions as jest.MockedFunction<typeof useBranchesOptions>;
const mockUseCustomerSearch = useCustomerSearch as jest.MockedFunction<typeof useCustomerSearch>;
const mockUseSalesByProductReport = useSalesByProductReport as jest.MockedFunction<typeof useSalesByProductReport>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDepartmentsOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseBranchesOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseCustomerSearch.mockReturnValue({ items: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
});

describe("SalesByProductPage", () => {
  it("sin permiso muestra estado 'Sin acceso'", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["viewer"], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });
    mockUseSalesByProductReport.mockReturnValue({
      report: null, isLoading: false, error: null, isExportingPdf: false, isExportingXlsx: false,
      exportPdf: jest.fn(), exportXlsx: jest.fn(),
    });

    render(<SalesByProductPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("con datos renderiza el total y la tabla por producto (default)", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
      isLoading: false, can: () => true, refresh: jest.fn(),
    });
    mockUseSalesByProductReport.mockReturnValue({
      report: {
        generatedAt: "2026-08-08T00:00:00.000Z",
        generatedBy: { userId: "u1", email: "admin@test.com" },
        filters: { branchId: null, departmentId: null, customerId: null, from: "2026-08-01", to: "2026-08-08" },
        totals: { ticketCount: 1, subtotal: "100.0000", taxTotal: "16.0000", total: "116.0000" },
        byCustomer: [],
        byDepartment: [],
        byProduct: [
          { key: "p1", label: "Fertilizante (F1)", ticketCount: 1, quantitySold: "4.0000", currentStock: 20, subtotal: "100.0000", taxTotal: "16.0000", total: "116.0000" },
        ],
      },
      isLoading: false,
      error: null,
      isExportingPdf: false,
      isExportingXlsx: false,
      exportPdf: jest.fn(),
      exportXlsx: jest.fn(),
    });

    render(<SalesByProductPage />);
    expect(screen.getByText("Ventas por Producto")).toBeInTheDocument();
    expect(screen.getByText("Fertilizante (F1)")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
