import React from "react";
import { render, screen } from "@testing-library/react";
import { PageShell, PageHeader } from "../../../../../app/_components/organisms/PageShell";

jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

describe("PageShell", () => {
  it("renders title and description", () => {
    render(<PageShell title="Ventas" description="Historial de ventas" />);
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeInTheDocument();
    expect(screen.getByText("Historial de ventas")).toBeInTheDocument();
  });

  it("renders no description when omitted", () => {
    render(<PageShell title="Ventas" />);
    expect(screen.queryByText("Historial de ventas")).not.toBeInTheDocument();
  });

  it("renders backHref as a link to the given route", () => {
    render(<PageShell title="Compras" backHref="/reports" />);
    expect(screen.getByRole("link", { name: /volver/i })).toHaveAttribute("href", "/reports");
  });

  it("renders actions in the header row", () => {
    render(<PageShell title="Roles" actions={<button>Crear</button>} />);
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });

  it("shows the panel (toolbar + children) only when toolbar is passed", () => {
    const { container, rerender } = render(
      <PageShell title="Catálogos">
        <div data-testid="grid">grid</div>
      </PageShell>
    );
    // sin toolbar: children rendered directly, no panel wrapper
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(container.querySelector(".bg-surface-container-low")).toBeNull();

    rerender(
      <PageShell title="Ventas" toolbar={<div data-testid="toolbar">filtros</div>}>
        <div data-testid="table">tabla</div>
      </PageShell>
    );
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(container.querySelector(".bg-surface-container-low")).not.toBeNull();
  });

  it("applies the width variant classes to the root", () => {
    const { container, rerender } = render(<PageShell title="X" width="narrow" />);
    expect(container.firstElementChild?.className).toContain("max-w-4xl");

    rerender(<PageShell title="X" width="full" />);
    expect(container.firstElementChild?.className).not.toContain("max-w-4xl");
    expect(container.firstElementChild?.className).not.toContain("max-w-screen-2xl");

    rerender(<PageShell title="X" />);
    expect(container.firstElementChild?.className).toContain("max-w-screen-2xl");
  });
});

describe("PageHeader", () => {
  it("renders standalone, without a panel, for detail-style layouts", () => {
    const { container } = render(<PageHeader title="Detalle" description="Info" />);
    expect(screen.getByRole("heading", { name: "Detalle" })).toBeInTheDocument();
    expect(container.querySelector(".bg-surface-container-low")).toBeNull();
  });
});
