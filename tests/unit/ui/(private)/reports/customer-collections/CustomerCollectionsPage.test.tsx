/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch");
jest.mock("../../../../../../app/(private)/reports/customer-collections/_logic/hooks/useCustomerCollectionsReport");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions";
import { useCustomerSearch } from "../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch";
import { useCustomerCollectionsReport } from "../../../../../../app/(private)/reports/customer-collections/_logic/hooks/useCustomerCollectionsReport";
import { CustomerCollectionsPage } from "../../../../../../app/(private)/reports/customer-collections/_blocks/CustomerCollectionsPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseBranchesOptions = useBranchesOptions as jest.MockedFunction<typeof useBranchesOptions>;
const mockUseCustomerSearch = useCustomerSearch as jest.MockedFunction<typeof useCustomerSearch>;
const mockUseCustomerCollectionsReport = useCustomerCollectionsReport as jest.MockedFunction<typeof useCustomerCollectionsReport>;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseBranchesOptions.mockReturnValue({ options: [], isLoading: false });
  mockUseCustomerSearch.mockReturnValue({ items: [], total: 0, isLoading: false, error: null, refresh: jest.fn() });
});

describe("CustomerCollectionsPage", () => {
  it("sin permiso muestra estado 'Sin acceso'", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["viewer"], branchId: null,
      isLoading: false, can: () => false, refresh: jest.fn(),
    });
    mockUseCustomerCollectionsReport.mockReturnValue({
      report: null, isLoading: false, error: null, isExportingPdf: false, isExportingXlsx: false,
      exportPdf: jest.fn(), exportXlsx: jest.fn(),
    });

    render(<CustomerCollectionsPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("con datos renderiza el total cobrado y la tabla por cliente (default)", () => {
    mockUseCurrentUser.mockReturnValue({
      userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
      isLoading: false, can: () => true, refresh: jest.fn(),
    });
    mockUseCustomerCollectionsReport.mockReturnValue({
      report: {
        generatedAt: "2026-08-08T00:00:00.000Z",
        generatedBy: { userId: "u1", email: "admin@test.com" },
        filters: { branchId: null, customerId: null, from: "2026-08-01", to: "2026-08-08" },
        totals: { totalCollected: "116.0000" },
        rows: [
          {
            paymentId: "p1", saleId: "s1", customerId: "c1", customerCode: "C001",
            customerName: "Cliente Uno", factura: "TC-000001", amount: "116.0000",
            paymentMethodName: "Efectivo", reference: null, collectedAt: "2026-08-04T10:00:00.000Z",
          },
        ],
        byCustomer: [{ customerId: "c1", customerCode: "C001", customerName: "Cliente Uno", count: 1, total: "116.0000" }],
        byTicket: [{ saleId: "s1", factura: "TC-000001", customerName: "Cliente Uno", count: 1, total: "116.0000" }],
      },
      isLoading: false,
      error: null,
      isExportingPdf: false,
      isExportingXlsx: false,
      exportPdf: jest.fn(),
      exportXlsx: jest.fn(),
    });

    render(<CustomerCollectionsPage />);
    expect(screen.getByText("Cobranza por Cliente")).toBeInTheDocument();
    expect(screen.getByText("Cliente Uno")).toBeInTheDocument();
    expect(screen.getByText("C001")).toBeInTheDocument();
  });
});
