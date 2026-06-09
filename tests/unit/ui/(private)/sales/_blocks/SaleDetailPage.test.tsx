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
jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/_hooks/useHeadquarters");
jest.mock("../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail");
jest.mock("../../../../../../app/(private)/sales/_logic/hooks/useSaleMutations");
jest.mock("../../../../../../app/(private)/returns/_logic/hooks/useSaleReturns", () => ({
  useSaleReturns: () => ({ returns: [], isLoading: false, error: null, refresh: jest.fn() }),
}));
jest.mock("../../../../../../app/(private)/sales/_blocks/SaleReturnsSection", () => ({
  SaleReturnsSection: () => null,
}));
jest.mock("../../../../../../app/(private)/sales/_blocks/SalePaymentsSection", () => ({
  SalePaymentsSection: () => null,
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { useHeadquarters } from "../../../../../../app/_hooks/useHeadquarters";
import { useSaleDetail } from "../../../../../../app/(private)/sales/_logic/hooks/useSaleDetail";
import { useSaleMutations } from "../../../../../../app/(private)/sales/_logic/hooks/useSaleMutations";
import { SaleDetailPage } from "../../../../../../app/(private)/sales/_blocks/SaleDetailPage";
import type { SaleDetail } from "../../../../../../app/(private)/sales/_logic/types/domain";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseHeadquarters = useHeadquarters as jest.MockedFunction<typeof useHeadquarters>;
const mockUseSaleDetail = useSaleDetail as jest.MockedFunction<typeof useSaleDetail>;
const mockUseSaleMutations = useSaleMutations as jest.MockedFunction<typeof useSaleMutations>;

function makeSale(status: "completed" | "cancelled" | "edited" = "completed"): SaleDetail {
  return {
    id: "sale-1",
    branchId: "branch-1",
    cashierId: "user-1",
    cashierName: "Cajero Test",
    folioId: "folio-1",
    folioNumber: 42,
    folioPrefix: "A",
    paymentMethodId: "pm-1",
    paymentMethodName: "Efectivo",
    status,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid",
    isCredit: false,
    customerName: "Cliente Test",
    branchName: "Sucursal Norte",
    items: [],
    notes: null,
    cancellationReason: null,
    cancelledAt: status === "cancelled" ? new Date() : null,
    editedAt: null,
    createdAt: new Date("2026-05-30T10:00:00Z"),
    updatedAt: new Date("2026-05-30T10:00:00Z"),
    returnedQuantityBySaleItem: {},
  };
}

function setup({
  can = jest.fn(() => false as boolean | "loading"),
  branchId = null as string | null,
  hq = null as { id: string; code: string; name: string } | null,
  sale = makeSale(),
}: {
  can?: jest.Mock;
  branchId?: string | null;
  hq?: { id: string; code: string; name: string } | null;
  sale?: SaleDetail;
} = {}) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    isLoading: false,
    branchId,
    can,
    refresh: jest.fn(),
  });
  mockUseHeadquarters.mockReturnValue({ hq, isLoading: false, refresh: jest.fn() });
  mockUseSaleDetail.mockReturnValue({ sale, isLoading: false, error: null, refresh: jest.fn() });
  mockUseSaleMutations.mockReturnValue({
    isSaving: false,
    mutationError: null,
    clearError: jest.fn(),
    cancel: jest.fn(),
    edit: jest.fn(),
  });
}

describe("SaleDetailPage — guard de edición HQ", () => {
  beforeEach(() => jest.clearAllMocks());

  it("oculta 'Editar venta' cuando sales:edit_completed=false", () => {
    setup({
      can: jest.fn(() => false),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "hq-1",
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.queryByRole("link", { name: /Editar venta/i })).not.toBeInTheDocument();
  });

  it("oculta 'Editar venta' cuando edit=true pero el usuario no está en HQ y no tiene bypass", () => {
    setup({
      can: jest.fn((perm: string) => perm === "sales:edit_completed"),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "otra-sucursal",
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.queryByRole("link", { name: /Editar venta/i })).not.toBeInTheDocument();
  });

  it("muestra 'Editar venta' cuando edit=true y el usuario está asignado a la sucursal HQ", () => {
    setup({
      can: jest.fn((perm: string) => perm === "sales:edit_completed"),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "hq-1",
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.getByRole("link", { name: /Editar venta/i })).toBeInTheDocument();
  });

  it("muestra 'Editar venta' cuando edit=true y el usuario tiene branches:access_all (bypass)", () => {
    setup({
      can: jest.fn(
        (perm: string) => perm === "sales:edit_completed" || perm === "branches:access_all",
      ),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "otra-sucursal",
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.getByRole("link", { name: /Editar venta/i })).toBeInTheDocument();
  });

  it("oculta 'Editar venta' cuando la venta está cancelada aunque el usuario pueda editar y esté en HQ", () => {
    setup({
      can: jest.fn(() => true),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "hq-1",
      sale: makeSale("cancelled"),
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.queryByRole("link", { name: /Editar venta/i })).not.toBeInTheDocument();
  });

  it("el enlace 'Editar venta' apunta a /sales/[id]/edit", () => {
    setup({
      can: jest.fn((perm: string) => perm === "sales:edit_completed"),
      hq: { id: "hq-1", code: "HQ", name: "Matriz" },
      branchId: "hq-1",
    });
    render(<SaleDetailPage id="sale-1" />);
    expect(screen.getByRole("link", { name: /Editar venta/i })).toHaveAttribute(
      "href",
      "/sales/sale-1/edit",
    );
  });
});
