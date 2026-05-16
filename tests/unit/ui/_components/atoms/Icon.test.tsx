import React from "react";
import { render } from "@testing-library/react";
import { Icon } from "../../../../../app/_components/atoms/Icon/Icon";

describe("Icon", () => {
  it("renders the glyph name as text inside a material-symbols span", () => {
    const { container } = render(<Icon name="dashboard" />);
    const span = container.firstChild as HTMLSpanElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toContain("material-symbols-outlined");
    expect(span.textContent).toBe("dashboard");
    expect(span.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies custom font size via inline style", () => {
    const { container } = render(<Icon name="search" size={32} />);
    const span = container.firstChild as HTMLSpanElement;
    expect(span.style.fontSize).toBe("32px");
  });

  it("merges custom className", () => {
    const { container } = render(<Icon name="warning" className="text-error" />);
    const span = container.firstChild as HTMLSpanElement;
    expect(span.className).toContain("text-error");
    expect(span.className).toContain("material-symbols-outlined");
  });
});
