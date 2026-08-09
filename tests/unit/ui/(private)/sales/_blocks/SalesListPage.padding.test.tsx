/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    can: (perm: string) => (perm === "sales:read" ? true : false),
    branchId: "b1",
    userId: "u1",
    email: "test@test.com",
    roles: [],
    isLoading: false,
    refresh: jest.fn(),
  }),
}));
jest.mock("../../../../../../app/_hooks/useDebounce", () => ({
  useDebounce: (v: string) => v,
}));
jest.mock("../../../../../../app/(private)/sales/_logic/hooks/useSalesList", () => ({
  useSalesList: () => ({ items: [], total: 0, isLoading: false, error: null }),
}));
jest.mock("../../../../../../app/(private)/inventory/_logic/hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/(private)/catalogs/_blocks/CatalogShell", () => ({
  CatalogShell: ({ title, description, toolbar, children }: { title: string; description: string; toolbar: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid="catalog-shell">
      <div>{title}</div>
      {toolbar}
      {children}
    </div>
  ),
}));
jest.mock("../../../../../../app/(private)/sales/_blocks/SalesToolbar", () => ({
  SalesToolbar: () => <div data-testid="sales-toolbar" />,
}));
jest.mock("../../../../../../app/(private)/sales/_blocks/SalesTable", () => ({
  SalesTable: () => <div data-testid="sales-table" />,
}));
jest.mock("../../../../../../app/(private)/catalogs/_blocks/CatalogPagination", () => ({
  CatalogPagination: () => <div data-testid="catalog-pagination" />,
}));
jest.mock("../../../../../../app/_components/molecules/EmptyState/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("../../../../../../app/_components/atoms/Spinner/Spinner", () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { SalesListPage } from "../../../../../../app/(private)/sales/_blocks/SalesListPage";

describe("SalesListPage — separación superior de 10px (sales-screens-padding)", () => {
  it("aplica pt-2.5 al contenedor raíz en el estado normal", () => {
    const { container } = render(<SalesListPage />);
    expect(screen.getByTestId("catalog-shell")).toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain("pt-2.5");
  });
});
