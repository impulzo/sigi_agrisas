import React from "react";
import { render, screen } from "@testing-library/react";
import { Avatar } from "../../../../../app/_components/atoms/Avatar/Avatar";

describe("Avatar", () => {
  it("renders an <img> when src is provided", () => {
    render(<Avatar src="https://example.com/u.jpg" alt="Admin" />);
    const img = screen.getByRole("img", { name: "Admin" });
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://example.com/u.jpg");
  });

  it("falls back to initials when src is missing", () => {
    render(<Avatar alt="Admin" fallbackInitials="A" />);
    const fallback = screen.getByRole("img", { name: "Admin" });
    expect(fallback.tagName).toBe("SPAN");
    expect(fallback.textContent).toBe("A");
  });

  it("applies size classes", () => {
    const { rerender, container } = render(
      <Avatar alt="X" fallbackInitials="X" size="sm" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("h-8");

    rerender(<Avatar alt="X" fallbackInitials="X" size="lg" />);
    expect((container.firstChild as HTMLElement).className).toContain("h-14");
  });

  it("renders ? when no fallback initials and no src", () => {
    render(<Avatar alt="User" />);
    expect(screen.getByRole("img", { name: "User" }).textContent).toBe("?");
  });
});
