import React from "react";
import { render, screen } from "@testing-library/react";
import { Chip } from "../../../../../app/_components/atoms/Chip/Chip";

describe("Chip", () => {
  it("renders label", () => {
    render(<Chip label="+12.4%" />);
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
  });

  it("renders with an icon", () => {
    const { container } = render(
      <Chip label="+12.4%" icon="trending_up" tone="primary" />,
    );
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe(
      "trending_up",
    );
  });

  it("applies tone classes", () => {
    const { container, rerender } = render(<Chip label="A" tone="error" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-error-container",
    );

    rerender(<Chip label="A" tone="warning" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-secondary-container",
    );

    rerender(<Chip label="A" tone="primary" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-primary-fixed/20",
    );
  });
});
