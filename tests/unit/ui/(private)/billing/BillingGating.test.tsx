/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/billing"),
}));

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/billing/_logic/hooks/useInvoicesList");
jest.mock("../../../../../app/(private)/billing/_logic/hooks/useCsdManager");
jest.mock("../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [] }),
}));
jest.mock("../../../../../app/(private)/catalogs/_blocks/CatalogShell", () => ({
  CatalogShell: ({ title, children, toolbar }: { title: string; children: React.ReactNode; toolbar: React.ReactNode }) => (
    <div><h1>{title}</h1>{toolbar}{children}</div>
  ),
}));
jest.mock("../../../../../app/(private)/catalogs/_blocks/CatalogPagination", () => ({
  CatalogPagination: () => <div data-testid="pagination" />,
}));
jest.mock("../../../../../app/(private)/billing/_blocks/StampSaleForm", () => ({
  StampSaleForm: () => <div data-testid="stamp-sale-form" />,
}));
jest.mock("../../../../../app/(private)/billing/_blocks/PartialInvoiceForm", () => ({
  PartialInvoiceForm: () => <div data-testid="partial-form" />,
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { useInvoicesList } from "../../../../../app/(private)/billing/_logic/hooks/useInvoicesList";
import { useCsdManager } from "../../../../../app/(private)/billing/_logic/hooks/useCsdManager";
import { BillingListPage } from "../../../../../app/(private)/billing/_blocks/BillingListPage";
import { NewInvoicePage } from "../../../../../app/(private)/billing/_blocks/NewInvoicePage";
import { CsdManagerPage } from "../../../../../app/(private)/billing/_blocks/CsdManagerPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseInvoicesList = useInvoicesList as jest.MockedFunction<typeof useInvoicesList>;
const mockUseCsdManager = useCsdManager as jest.MockedFunction<typeof useCsdManager>;

function setupUser(permissions: Record<string, boolean | "loading">) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: "b1",
    isLoading: false,
    can: jest.fn((p: string) => permissions[p] ?? false),
    refresh: jest.fn(),
  });
}

function setupList() {
  mockUseInvoicesList.mockReturnValue({
    items: [],
    total: 0,
    page: 1,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
}

function setupCsd() {
  mockUseCsdManager.mockReturnValue({
    status: null,
    isLoading: false,
    statusError: null,
    isUploading: false,
    uploadError: null,
    uploadSuccess: false,
    clearUploadError: jest.fn(),
    upload: jest.fn(),
    refreshStatus: jest.fn(),
  });
}

describe("BillingListPage — permission gating", () => {
  beforeEach(() => jest.clearAllMocks());

  it("mostra spinner cuando billing:read = loading", () => {
    setupUser({ "billing:read": "loading" });
    setupList();
    const { container } = render(<BillingListPage />);
    expect(container.querySelector("svg") ?? container.querySelector("[class*=spinner]")).toBeTruthy();
  });

  it("muestra 'Sin acceso' cuando billing:read = false", () => {
    setupUser({ "billing:read": false });
    setupList();
    render(<BillingListPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra lista cuando billing:read = true", () => {
    setupUser({ "billing:read": true, "billing:write": false, "billing:manage_csd": false, "branches:access_all": false });
    setupList();
    render(<BillingListPage />);
    expect(screen.getByText("Facturación")).toBeInTheDocument();
  });

  it("botón Nueva factura visible solo con billing:write", () => {
    setupUser({ "billing:read": true, "billing:write": true, "billing:manage_csd": false, "branches:access_all": false });
    setupList();
    render(<BillingListPage />);
    expect(screen.getByRole("link", { name: /nueva factura/i })).toBeInTheDocument();
  });

  it("botón Nueva factura oculto sin billing:write", () => {
    setupUser({ "billing:read": true, "billing:write": false, "billing:manage_csd": false, "branches:access_all": false });
    setupList();
    render(<BillingListPage />);
    expect(screen.queryByRole("link", { name: /nueva factura/i })).toBeNull();
  });

  it("botón Configurar CSD visible solo con billing:manage_csd", () => {
    setupUser({ "billing:read": true, "billing:write": false, "billing:manage_csd": true, "branches:access_all": false });
    setupList();
    render(<BillingListPage />);
    expect(screen.getByRole("link", { name: /configurar csd/i })).toBeInTheDocument();
  });
});

describe("NewInvoicePage — permission gating", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra spinner cuando billing:write = loading", () => {
    setupUser({ "billing:write": "loading" });
    const { container } = render(<NewInvoicePage />);
    expect(container.querySelector("svg") ?? container.querySelector("[class*=spin]")).toBeTruthy();
  });

  it("muestra 'Sin acceso' cuando billing:write = false", () => {
    setupUser({ "billing:write": false });
    render(<NewInvoicePage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra formulario cuando billing:write = true", () => {
    setupUser({ "billing:write": true });
    render(<NewInvoicePage />);
    expect(screen.getByText(/nueva factura/i)).toBeInTheDocument();
  });
});

describe("CsdManagerPage — permission gating", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra 'Sin acceso' cuando billing:manage_csd = false", () => {
    setupUser({ "billing:manage_csd": false });
    setupCsd();
    render(<CsdManagerPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("muestra formulario CSD cuando billing:manage_csd = true", () => {
    setupUser({ "billing:manage_csd": true });
    setupCsd();
    render(<CsdManagerPage />);
    expect(screen.getByLabelText(/certificado \(\.cer\)/i)).toBeInTheDocument();
  });
});

describe("InvoiceActionsBar — cancel button gating", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders cancel button when stamped + canCancel=true", () => {
    const { InvoiceActionsBar } = require("../../../../../app/(private)/billing/_blocks/InvoiceActionsBar");
    const invoice = { id: "inv-1", status: "stamped" } as Parameters<typeof InvoiceActionsBar>[0]["invoice"];
    render(
      <InvoiceActionsBar
        invoice={invoice}
        canCancel={true}
        isDownloading={false}
        isSaving={false}
        onDownload={jest.fn()}
        onCancelClick={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /cancelar cfdi/i })).toBeInTheDocument();
  });

  it("hides cancel button when canCancel=false", () => {
    const { InvoiceActionsBar } = require("../../../../../app/(private)/billing/_blocks/InvoiceActionsBar");
    const invoice = { id: "inv-1", status: "stamped" } as Parameters<typeof InvoiceActionsBar>[0]["invoice"];
    render(
      <InvoiceActionsBar
        invoice={invoice}
        canCancel={false}
        isDownloading={false}
        isSaving={false}
        onDownload={jest.fn()}
        onCancelClick={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /cancelar cfdi/i })).toBeNull();
  });

  it("hides cancel button when invoice is cancelled (even with canCancel=true)", () => {
    const { InvoiceActionsBar } = require("../../../../../app/(private)/billing/_blocks/InvoiceActionsBar");
    const invoice = { id: "inv-1", status: "cancelled" } as Parameters<typeof InvoiceActionsBar>[0]["invoice"];
    render(
      <InvoiceActionsBar
        invoice={invoice}
        canCancel={true}
        isDownloading={false}
        isSaving={false}
        onDownload={jest.fn()}
        onCancelClick={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /cancelar cfdi/i })).toBeNull();
  });

  it("always renders PDF and XML download buttons", () => {
    const { InvoiceActionsBar } = require("../../../../../app/(private)/billing/_blocks/InvoiceActionsBar");
    const invoice = { id: "inv-1", status: "stamped" } as Parameters<typeof InvoiceActionsBar>[0]["invoice"];
    render(
      <InvoiceActionsBar
        invoice={invoice}
        canCancel={false}
        isDownloading={false}
        isSaving={false}
        onDownload={jest.fn()}
        onCancelClick={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descargar xml/i })).toBeInTheDocument();
  });
});
