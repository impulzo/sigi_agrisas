import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RailFlyout } from "../../../../../app/_components/molecules/RailFlyout/RailFlyout";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

const items = [
  { key: "payment-methods", href: "/catalogs/payment-methods", icon: "payments" as const, label: "Formas de pago" },
  { key: "folios", href: "/catalogs/folios", icon: "tag" as const, label: "Folios" },
];

describe("RailFlyout", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <RailFlyout
        open={false}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders role=menu with N items role=menuitem when open=true", () => {
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(items.length);
  });

  it("applies active classes to the item matching activeHref", () => {
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/catalogs/payment-methods"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const activeItem = screen.getByRole("menuitem", { name: /Formas de pago/ });
    expect(activeItem.className).toContain("bg-primary-container");
    expect(activeItem.className).toContain("text-on-primary-container");

    const inactiveItem = screen.getByRole("menuitem", { name: /Folios/ });
    expect(inactiveItem.className).not.toContain("bg-primary-container");
  });

  it("calls onItemClick with the item href when clicked", async () => {
    const onItemClick = jest.fn();
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={onItemClick}
        onClose={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByRole("menuitem", { name: /Folios/ }));
    expect(onItemClick).toHaveBeenCalledWith("/catalogs/folios");
  });

  it("calls onClose when mouse leaves the panel", () => {
    const onClose = jest.fn();
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={onClose}
      />
    );
    fireEvent.mouseLeave(screen.getByRole("menu"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sets style.top to anchorTop px", () => {
    render(
      <RailFlyout
        open={true}
        anchorTop={120}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const menu = screen.getByRole("menu");
    expect(menu).toHaveStyle({ top: "120px" });
  });

  it("applies max-height and overflow-y-auto for scroll", () => {
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const menu = screen.getByRole("menu");
    expect(menu).toHaveStyle({ maxHeight: "calc(100vh - 32px)" });
    expect(menu.className).toContain("overflow-y-auto");
    expect(menu.className).toContain("scrollbar-thin");
  });

  it("clamps top to minimum 16px", () => {
    render(
      <RailFlyout
        open={true}
        anchorTop={0}
        items={items}
        activeHref="/dashboard"
        onItemClick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const menu = screen.getByRole("menu");
    const topVal = parseFloat(menu.style.top);
    expect(topVal).toBeGreaterThanOrEqual(16);
  });
});
