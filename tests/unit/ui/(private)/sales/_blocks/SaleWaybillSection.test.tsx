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

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { SaleWaybillSection } from "../../../../../../app/(private)/sales/_blocks/SaleWaybillSection";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function setupCurrentUser(permissions: string[]) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: false,
    can: (p: string) => permissions.includes(p),
    refresh: jest.fn(),
  });
}

describe("SaleWaybillSection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the CTA when sale is completed, has a customer, and user has waybills:write", () => {
    setupCurrentUser(["waybills:write"]);
    render(<SaleWaybillSection saleId="s1" saleStatus="completed" customerId="c1" />);
    expect(screen.getByRole("link", { name: /generar carta porte/i })).toHaveAttribute(
      "href",
      "/sales/s1/waybill/new"
    );
  });

  it("hides the CTA when the sale has no customer", () => {
    setupCurrentUser(["waybills:write"]);
    render(<SaleWaybillSection saleId="s1" saleStatus="completed" customerId={null} />);
    expect(screen.queryByRole("link", { name: /generar carta porte/i })).not.toBeInTheDocument();
  });

  it("hides the CTA when the sale is not completed", () => {
    setupCurrentUser(["waybills:write"]);
    render(<SaleWaybillSection saleId="s1" saleStatus="cancelled" customerId="c1" />);
    expect(screen.queryByRole("link", { name: /generar carta porte/i })).not.toBeInTheDocument();
  });

  it("hides the CTA when the user lacks waybills:write", () => {
    setupCurrentUser([]);
    render(<SaleWaybillSection saleId="s1" saleStatus="completed" customerId="c1" />);
    expect(screen.queryByRole("link", { name: /generar carta porte/i })).not.toBeInTheDocument();
  });

  it("renders nothing at all when the CTA is hidden", () => {
    setupCurrentUser([]);
    const { container } = render(<SaleWaybillSection saleId="s1" saleStatus="completed" customerId="c1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
