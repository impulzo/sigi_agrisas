/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/billing/_logic/hooks/useSaleInvoices");
jest.mock("../../../../../app/(private)/billing/_logic/hooks/useInvoiceMutations");
jest.mock("../../../../../app/_components/atoms/Spinner/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));
jest.mock("../../../../../app/(private)/billing/_blocks/InvoiceStatusBadge", () => ({
  InvoiceStatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { useSaleInvoices } from "../../../../../app/(private)/billing/_logic/hooks/useSaleInvoices";
import { useInvoiceMutations } from "../../../../../app/(private)/billing/_logic/hooks/useInvoiceMutations";
import { SaleInvoicesSection } from "../../../../../app/(private)/billing/_blocks/SaleInvoicesSection";
import type { Invoice } from "../../../../../app/(private)/billing/_logic/types/domain";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseSaleInvoices = useSaleInvoices as jest.MockedFunction<typeof useSaleInvoices>;
const mockUseInvoiceMutations = useInvoiceMutations as jest.MockedFunction<typeof useInvoiceMutations>;

let _invCounter = 0;
function makeInvoice(status: Invoice["status"] = "stamped"): Invoice {
  return {
    id: `inv-${++_invCounter}`,
    uuid: "AAA-BBB-CCC",
    facturamaCfdiId: null,
    status,
    cfdiType: "I",
    cfdiUse: "G03",
    paymentForm: "03",
    paymentMethod: "PUE",
    receiverRfc: "XAXX010101000",
    receiverName: "Público",
    receiverCfdiUse: "G03",
    receiverFiscalRegime: "616",
    receiverTaxZipCode: "01000",
    currency: "MXN",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    xmlUrl: null,
    pdfUrl: null,
    saleId: "s1",
    branchId: "b1",
    customerId: null,
    cancellationMotive: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function setupUser(canRead: boolean | "loading", canWrite: boolean | "loading") {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn((p: string) => {
      if (p === "billing:read") return canRead;
      if (p === "billing:write") return canWrite;
      return false;
    }),
    refresh: jest.fn(),
  });
}

function setupInvoices(invoices: Invoice[], isLoading = false) {
  const hasStampedInvoice = invoices.some((i) => i.status === "stamped");
  mockUseSaleInvoices.mockReturnValue({
    invoices,
    hasStampedInvoice,
    isLoading,
    error: null,
    refresh: jest.fn(),
  });
  mockUseInvoiceMutations.mockReturnValue({
    isDownloading: false,
    isSaving: false,
    error: null,
    clearError: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn(),
  });
}

describe("SaleInvoicesSection — CTA 'Facturar'", () => {
  beforeEach(() => { jest.clearAllMocks(); _invCounter = 0; });

  it("muestra CTA cuando: completed + sin CFDI vigente + billing:write", () => {
    setupUser(true, true);
    setupInvoices([]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    expect(screen.getByRole("link", { name: /facturar/i })).toBeInTheDocument();
  });

  it("oculta CTA cuando venta no es completed", () => {
    setupUser(true, true);
    setupInvoices([]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="cancelled" />);
    expect(screen.queryByRole("link", { name: /facturar/i })).toBeNull();
  });

  it("oculta CTA cuando ya hay CFDI vigente (hasStampedInvoice=true)", () => {
    setupUser(true, true);
    setupInvoices([makeInvoice("stamped")]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    expect(screen.queryByRole("link", { name: /facturar/i })).toBeNull();
  });

  it("oculta CTA sin billing:write", () => {
    setupUser(true, false);
    setupInvoices([]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    expect(screen.queryByRole("link", { name: /facturar/i })).toBeNull();
  });

  it("oculta toda la sección cuando billing:read=false", () => {
    setupUser(false, true);
    setupInvoices([]);
    const { container } = render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    expect(container.firstChild).toBeNull();
  });

  it("muestra lista de facturas cuando existen", () => {
    setupUser(true, false);
    setupInvoices([makeInvoice("stamped"), makeInvoice("cancelled")]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    const badges = screen.getAllByTestId("status-badge");
    expect(badges).toHaveLength(2);
  });

  it("CTA tiene href con saleId como query param", () => {
    setupUser(true, true);
    setupInvoices([]);
    render(<SaleInvoicesSection saleId="s-xyz" saleStatus="completed" />);
    const link = screen.getByRole("link", { name: /facturar/i });
    expect(link.getAttribute("href")).toContain("saleId=s-xyz");
  });

  it("CFDI vigente muestra link a /billing/[id]", () => {
    setupUser(true, false);
    setupInvoices([makeInvoice("stamped")]);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    const verLink = screen.getByRole("link", { name: /ver/i });
    expect(verLink.getAttribute("href")).toContain("/billing/inv-1");
  });

  it("muestra spinner durante isLoading", () => {
    setupUser(true, false);
    setupInvoices([], true);
    render(<SaleInvoicesSection saleId="s1" saleStatus="completed" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });
});
