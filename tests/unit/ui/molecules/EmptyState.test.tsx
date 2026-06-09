import React from "react";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../../../../app/_components/molecules/EmptyState/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon="lock" title="Sin acceso" description="No tienes permisos" />);
    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
    expect(screen.getByText("No tienes permisos")).toBeInTheDocument();
  });

  it("renders action slot when provided", () => {
    render(
      <EmptyState icon="lock" title="Sin acceso" action={<button>Reintentar</button>} />
    );
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });

  it("does not render action slot when not provided", () => {
    render(<EmptyState icon="lock" title="Sin acceso" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
