import React from "react";
import { render, screen } from "@testing-library/react";
import { Badge } from "../../../../app/_components/atoms/Badge/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>read</Badge>);
    expect(screen.getByText("read")).toBeInTheDocument();
  });

  it("applies read variant class", () => {
    const { container } = render(<Badge variant="read">read</Badge>);
    expect(container.firstChild).toHaveClass("bg-tertiary-container");
  });

  it("applies neutral variant by default", () => {
    const { container } = render(<Badge>neutral</Badge>);
    expect(container.firstChild).toHaveClass("bg-surface-container-high");
  });

  it("applies write variant class", () => {
    const { container } = render(<Badge variant="write">write</Badge>);
    expect(container.firstChild).toHaveClass("bg-secondary-container");
  });
});
