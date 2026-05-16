import React from "react";
import { render, screen } from "@testing-library/react";
import { TopAppBar } from "../../../../../app/_components/organisms/TopAppBar/TopAppBar";

describe("TopAppBar", () => {
  it("renders the Agrisas title", () => {
    render(<TopAppBar userName="Admin" userEmail="admin@agrisas.com" />);
    expect(screen.getByRole("heading", { name: "Agrisas" })).toBeInTheDocument();
  });

  it("renders icon buttons for notifications, help and settings", () => {
    render(<TopAppBar userName="Admin" userEmail="admin@agrisas.com" />);
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ayuda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustes" })).toBeInTheDocument();
  });

  it("renders avatar with initial when avatarUrl is missing", () => {
    render(<TopAppBar userName="Admin" userEmail="admin@agrisas.com" />);
    const avatar = screen.getByRole("img", { name: "Admin" });
    expect(avatar.tagName).toBe("SPAN");
    expect(avatar.textContent).toBe("A");
  });

  it("renders <img> when avatarUrl is provided", () => {
    render(
      <TopAppBar
        userName="Admin"
        userEmail="admin@agrisas.com"
        avatarUrl="https://example.com/u.jpg"
      />,
    );
    const img = screen.getByRole("img", { name: "Admin" });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://example.com/u.jpg");
  });

  it("hides SearchInput on small screens via Tailwind classes", () => {
    const { container } = render(
      <TopAppBar userName="Admin" userEmail="admin@agrisas.com" />,
    );
    const searchInputWrapper = container.querySelector(
      ".hidden.md\\:flex",
    );
    expect(searchInputWrapper).not.toBeNull();
  });
});
