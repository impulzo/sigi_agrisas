import React from "react";
import { render, screen } from "@testing-library/react";
import { NavigationRail } from "../../../../../app/_components/organisms/NavigationRail/NavigationRail";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from "next/navigation";

describe("NavigationRail", () => {
  it("marks Dashboard active when pathname is /dashboard", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    render(<NavigationRail />);

    const dashboard = screen.getByRole("link", { name: /Dashboard/ });
    expect(dashboard.className).toContain("bg-primary-container");
    expect(dashboard.className).toContain("text-on-primary-container");

    const pos = screen.getByRole("link", { name: /^POS$/ });
    expect(pos.className).not.toContain("bg-primary-container");
    expect(pos.className).toContain("text-on-surface-variant");
  });

  it("marks POS active when pathname starts with /pos", () => {
    (usePathname as jest.Mock).mockReturnValue("/pos/new");
    render(<NavigationRail />);

    const pos = screen.getByRole("link", { name: /^POS$/ });
    expect(pos.className).toContain("bg-primary-container");

    const dashboard = screen.getByRole("link", { name: /Dashboard/ });
    expect(dashboard.className).not.toContain("bg-primary-container");
  });

  it("renders 4 primary and 2 secondary destinations with correct hrefs", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    render(<NavigationRail />);

    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /^POS$/ })).toHaveAttribute(
      "href",
      "/pos",
    );
    expect(screen.getByRole("link", { name: /Inventory/ })).toHaveAttribute(
      "href",
      "/inventory",
    );
    expect(screen.getByRole("link", { name: /Billing/ })).toHaveAttribute(
      "href",
      "/billing",
    );
    expect(screen.getByRole("link", { name: /Support/ })).toHaveAttribute(
      "href",
      "/support",
    );
    expect(screen.getByRole("link", { name: /Account/ })).toHaveAttribute(
      "href",
      "/account",
    );
  });
});
