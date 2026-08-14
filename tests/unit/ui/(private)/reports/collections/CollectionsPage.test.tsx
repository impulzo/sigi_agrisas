/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/reports/collections/_blocks/global/GlobalCollectionsView", () => ({
  GlobalCollectionsView: () => <div data-testid="global-view" />,
}));
jest.mock("../../../../../../app/(private)/reports/collections/_blocks/by-customer/ByCustomerCollectionsView", () => ({
  ByCustomerCollectionsView: () => <div data-testid="by-customer-view" />,
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { CollectionsPage } from "../../../../../../app/(private)/reports/collections/_blocks/CollectionsPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function mockCan(perms: Record<string, boolean | "loading">) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1", email: "admin@test.com", roles: ["admin"], branchId: null,
    isLoading: false, can: (perm: string) => perms[perm] ?? false, refresh: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CollectionsPage", () => {
  it("sin ningún permiso muestra 'Sin acceso'", () => {
    mockCan({ "reports:cash_cut_read": false, "reports:customer_collections_read": false });
    render(<CollectionsPage />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
  });

  it("con ambos permisos muestra el SegmentedButton con Global por defecto", () => {
    mockCan({ "reports:cash_cut_read": true, "reports:customer_collections_read": true });
    render(<CollectionsPage />);
    expect(screen.getByRole("tablist", { name: "Vista de cobranza" })).toBeInTheDocument();
    expect(screen.getByTestId("global-view")).toBeInTheDocument();
    expect(screen.queryByTestId("by-customer-view")).not.toBeInTheDocument();
  });

  it("con solo reports:cash_cut_read fuerza la vista Global sin SegmentedButton", () => {
    mockCan({ "reports:cash_cut_read": true, "reports:customer_collections_read": false });
    render(<CollectionsPage />);
    expect(screen.queryByRole("tablist", { name: "Vista de cobranza" })).not.toBeInTheDocument();
    expect(screen.getByTestId("global-view")).toBeInTheDocument();
  });

  it("con solo reports:customer_collections_read fuerza la vista Por Cliente sin SegmentedButton", () => {
    mockCan({ "reports:cash_cut_read": false, "reports:customer_collections_read": true });
    render(<CollectionsPage />);
    expect(screen.queryByRole("tablist", { name: "Vista de cobranza" })).not.toBeInTheDocument();
    expect(screen.getByTestId("by-customer-view")).toBeInTheDocument();
  });

  it("mientras algún permiso está en loading, trata de forma optimista sin parpadear a 'Sin acceso'", () => {
    mockCan({ "reports:cash_cut_read": "loading", "reports:customer_collections_read": false });
    render(<CollectionsPage />);
    expect(screen.queryByText("Sin acceso")).not.toBeInTheDocument();
    expect(screen.getByTestId("global-view")).toBeInTheDocument();
  });

  it("con ambos permisos en loading, trata de forma optimista mostrando el SegmentedButton", () => {
    mockCan({ "reports:cash_cut_read": "loading", "reports:customer_collections_read": "loading" });
    render(<CollectionsPage />);
    expect(screen.queryByText("Sin acceso")).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Vista de cobranza" })).toBeInTheDocument();
    expect(screen.getByTestId("global-view")).toBeInTheDocument();
  });
});
