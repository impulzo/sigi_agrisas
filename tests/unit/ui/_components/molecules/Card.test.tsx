import React from "react";
import { render } from "@testing-library/react";
import { Card } from "../../../../../app/_components/molecules/Card/Card";

describe("Card", () => {
  it("renders default tone with surface classes", () => {
    const { container } = render(<Card>contenido</Card>);
    const div = container.firstChild as HTMLDivElement;
    expect(div.className).toContain("bg-surface-container-lowest");
    expect(div.className).toContain("border-outline-variant");
    expect(div.textContent).toBe("contenido");
  });

  it("renders primary tone with primary background", () => {
    const { container } = render(<Card tone="primary">x</Card>);
    const div = container.firstChild as HTMLDivElement;
    expect(div.className).toContain("bg-primary");
    expect(div.className).toContain("text-on-primary");
  });

  it("merges custom className", () => {
    const { container } = render(<Card className="min-h-[200px]">x</Card>);
    const div = container.firstChild as HTMLDivElement;
    expect(div.className).toContain("min-h-[200px]");
  });
});
