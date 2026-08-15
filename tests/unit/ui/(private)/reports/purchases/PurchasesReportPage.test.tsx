/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useBranchesOptions");
jest.mock("../../../../../../app/(private)/purchases/_logic/hooks/useProviderSearch");
jest.mock("../../../../../../app/(private)/reports/purchases/_logic/hooks/usePurchasesReport");
jest.mock("../../../../../../app/(private)/reports/purchases/_logic/hooks/useProviderPaymentsReport");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../../../../app/_hooks/useBranchesOptions";
import { useProviderSearch } from "../../../../../../app/(private)/purchases/_logic/hooks/useProviderSearch";
import { usePurchasesReport } from "../../../../../../app/(private)/reports/purchases/_logic/hooks/usePurchasesReport";
import { useProviderPaymentsReport } from "../../../../../../app/(private)/reports/purchases/_logic/hooks/useProviderPaymentsReport";
import { PurchasesReportPage } from "../../../../../../app/(private)/reports/purchases/_blocks/PurchasesReportPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseBranchesOptions = useBranchesOptions as jest.MockedFunction<typeof useBranchesOptions>;
const mockUseProviderSearch = useProviderSearch as jest.MockedFunction<typeof useProviderSearch>;
const mockUsePurchasesReport = usePurchasesReport as jest.MockedFunction<typeof usePurchasesReport>;
const mockUseProviderPaymentsReport = useProviderPaymentsReport as jest.MockedFunction<typeof useProviderPaymentsReport>;

function baseHookResult(overrides: Record<string, unknown> = {}) {
  return {
    report: null,
    isLoading: false,
    error: null,
    isExportingPdf: false,
    isExportingXlsx: false,
    exportPdf: jest.fn(),
    exportXlsx: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBranchesOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseProviderSearch.mockReturnValue({ items: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
  mockUsePurchasesReport.mockReturnValue(baseHookResult());
  mockUseProviderPaymentsReport.mockReturnValue(baseHookResult());
});

describe("PurchasesReportPage", () => {
  it("sin permiso muestra estado 'Sin acceso'", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["viewer"], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });

    render(<PurchasesReportPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("con permiso renderiza el título y la tabla de compras", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
      isLoading: false, can: () => true, refresh: jest.fn(),
    });
    mockUsePurchasesReport.mockReturnValue(
      baseHookResult({
        report: {
          generatedAt: "2026-08-08T00:00:00.000Z",
          generatedBy: { userId: "u1", email: "admin@test.com" },
          filters: { branchId: null, providerId: null, status: null, from: null, to: null },
          totals: { count: 1, total: "1160.0000" },
          rows: [
            {
              id: "purch-1",
              folioCode: "CP-000001",
              providerName: "Proveedor Uno",
              branchName: "Matriz",
              subtotal: "1000.0000",
              taxTotal: "160.0000",
              total: "1160.0000",
              paidAmount: "1160.0000",
              paymentStatus: "paid",
              status: "completed",
              purchasedAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        },
      })
    );

    render(<PurchasesReportPage />);
    expect(screen.getByRole("heading", { name: "Compras" })).toBeInTheDocument();
    expect(screen.getByText("Proveedor Uno")).toBeInTheDocument();
    expect(screen.getByText("CP-000001")).toBeInTheDocument();
  });
});
