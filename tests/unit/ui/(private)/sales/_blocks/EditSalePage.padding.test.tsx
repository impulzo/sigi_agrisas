/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});
jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    can: (perm: string) => perm === "sales:edit_completed" || perm === "branches:access_all",
    branchId: "b1",
    userId: "u1",
    email: "test@test.com",
    roles: [],
    isLoading: false,
    refresh: jest.fn(),
  }),
}));
jest.mock("../../../../../../app/_hooks/useHeadquarters", () => ({
  useHeadquarters: () => ({ hq: { id: "hq-1", code: "HQ", name: "Matriz" }, isLoading: false, refresh: jest.fn() }),
}));
jest.mock("../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail", () => ({
  useSaleDetail: () => ({
    sale: {
      id: "sale-1",
      branchId: "branch-1",
      customerId: "customer-1",
      cashierId: "user-1",
      cashierName: "Cajero",
      folioId: "folio-1",
      folioNumber: 42,
      folioPrefix: "A",
      paymentMethodId: "pm-1",
      paymentMethodName: "Efectivo",
      status: "completed",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      paidAmount: 116,
      paymentStatus: "paid",
      isCredit: false,
      customerName: "Cliente",
      branchName: "Sucursal",
      items: [],
      notes: null,
      cancellationReason: null,
      cancelledAt: null,
      editedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      returnedQuantityBySaleItem: {},
    },
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));
jest.mock("../../../../../../app/(private)/sales/_logic/hooks/useSaleMutations", () => ({
  useSaleMutations: () => ({ isSaving: false, edit: jest.fn(), mutationError: null, clearError: jest.fn() }),
}));
jest.mock("../../../../../../app/(private)/pos/_logic/hooks/useCart", () => ({
  useCart: () => ({
    lines: [],
    totals: { subtotal: 0, taxTotal: 0, total: 0 },
    addLine: jest.fn(),
    addLineFromDosification: jest.fn(),
    updateQuantity: jest.fn(),
    updateDiscountPct: jest.fn(),
    changeTier: jest.fn(),
    removeLine: jest.fn(),
    clear: jest.fn(),
  }),
}));
jest.mock("../../../../../../app/_hooks/useFoliosOptions", () => ({
  useFoliosOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/_hooks/usePaymentMethodsOptions", () => ({
  usePaymentMethodsOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/(private)/pos/_blocks/CartPanel", () => ({
  CartPanel: () => <div data-testid="cart-panel" />,
}));
jest.mock("../../../../../../app/(private)/pos/_blocks/ProductCatalogPanel", () => ({
  ProductCatalogPanel: () => <div data-testid="catalog-panel" />,
}));
jest.mock("../../../../../../app/(private)/pos/_blocks/PriceTierPicker", () => ({
  PriceTierPicker: () => <div />,
}));
jest.mock("../../../../../../app/(private)/sales/_blocks/SaleStatusBadge", () => ({
  SaleStatusBadge: () => <span data-testid="status-badge" />,
}));
jest.mock("../../../../../../app/_components/molecules/EmptyState/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("../../../../../../app/_components/atoms/Spinner/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { EditSalePage } from "../../../../../../app/(private)/sales/_blocks/EditSalePage";

describe("EditSalePage — gutter global de 10px izq/top/der vía layout (sales-screens-padding)", () => {
  it("el contenedor raíz NO duplica el padding top y mantiene altura sin overflow", () => {
    const { container } = render(<EditSalePage id="sale-1" />);
    expect(container.firstElementChild!.className).not.toContain("pt-2.5");
    expect(container.firstElementChild!.className).toContain("h-[calc(100vh-74px)]");
  });
});
