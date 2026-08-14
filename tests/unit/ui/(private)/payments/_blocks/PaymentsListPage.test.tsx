/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/payments"),
}));

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/payments/_logic/hooks/usePaymentsList");
jest.mock("../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [] }),
}));
jest.mock("../../../../../../app/_components/organisms/PageShell", () => ({
  PageShell: ({ title, children, toolbar }: { title: string; children: React.ReactNode; toolbar: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {toolbar}
      {children}
    </div>
  ),
}));
jest.mock("../../../../../../app/(private)/catalogs/_blocks/CatalogPagination", () => ({
  CatalogPagination: () => <div data-testid="pagination" />,
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { usePaymentsList } from "../../../../../../app/(private)/payments/_logic/hooks/usePaymentsList";
import { PaymentsListPage } from "../../../../../../app/(private)/payments/_blocks/PaymentsListPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUsePaymentsList = usePaymentsList as jest.MockedFunction<typeof usePaymentsList>;

function setupUser(canRead: boolean | "loading", isBypass = false) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn((perm: string) => {
      if (perm === "payments:read") return canRead;
      if (perm === "branches:access_all") return isBypass;
      return false;
    }),
    refresh: jest.fn(),
  });
}

function setupList(items: unknown[] = [], isLoading = false) {
  mockUsePaymentsList.mockReturnValue({
    items: items as ReturnType<typeof usePaymentsList>["items"],
    total: items.length,
    page: 1,
    isLoading,
    error: null,
    refresh: jest.fn(),
  });
}

describe("PaymentsListPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra spinner cuando permissions están cargando", () => {
    setupUser("loading");
    setupList([], true);
    const { container } = render(<PaymentsListPage />);
    expect(container.querySelector("[aria-label]") ?? container.querySelector("svg")).toBeTruthy();
  });

  it("muestra 'Sin acceso' cuando canRead=false", () => {
    setupUser(false);
    setupList();
    render(<PaymentsListPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("renderiza toolbar y título cuando tiene acceso", () => {
    setupUser(true);
    setupList();
    render(<PaymentsListPage />);
    expect(screen.getByText("Abonos")).toBeInTheDocument();
  });

  it("muestra empty state cuando no hay items", () => {
    setupUser(true);
    setupList([]);
    render(<PaymentsListPage />);
    expect(screen.getByText("Sin abonos")).toBeInTheDocument();
  });

  it("alterna a vista agrupada al hacer click en el toggle (Historia #2)", () => {
    setupUser(true);
    setupList([
      {
        id: "pay-1",
        saleId: "s1",
        saleFolioCode: "VNT-000001",
        customerName: "Cliente A",
        userId: "u1",
        userName: "Cobrador",
        branchId: "b1",
        paymentMethodId: "pm1",
        paymentMethodName: "Efectivo",
        folioId: "f1",
        folioNumber: 1,
        folioPrefix: "RECIBO-",
        amount: 300,
        status: "completed",
        createdAt: new Date("2026-06-01T10:00:00Z"),
        updatedAt: new Date("2026-06-01T10:00:00Z"),
        saleTotal: 1000,
        salePaidAmount: 300,
        salePaymentStatus: "partial",
        saleDueAmount: 700,
      },
    ]);
    render(<PaymentsListPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Vista agrupada" }));
    expect(screen.getByText("VNT-000001")).toBeInTheDocument();
    expect(screen.getByText("1 abono")).toBeInTheDocument();
  });
});
