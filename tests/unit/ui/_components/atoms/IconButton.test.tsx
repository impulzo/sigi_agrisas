import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "../../../../../app/_components/atoms/IconButton/IconButton";

describe("IconButton", () => {
  it("renders with required props and the Material icon", () => {
    render(<IconButton icon="notifications" ariaLabel="Notificaciones" />);
    const btn = screen.getByRole("button", { name: "Notificaciones" });
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector(".material-symbols-outlined")?.textContent).toBe(
      "notifications",
    );
  });

  it("applies variant classes", () => {
    const { rerender } = render(
      <IconButton icon="settings" ariaLabel="Ajustes" variant="filled" />,
    );
    expect(screen.getByRole("button").className).toContain("bg-primary");

    rerender(
      <IconButton icon="settings" ariaLabel="Ajustes" variant="tonal" />,
    );
    expect(screen.getByRole("button").className).toContain(
      "bg-surface-container-high",
    );

    rerender(
      <IconButton icon="settings" ariaLabel="Ajustes" variant="ghost" />,
    );
    expect(screen.getByRole("button").className).toContain(
      "text-on-surface-variant",
    );
  });

  it("triggers onClick", async () => {
    const onClick = jest.fn();
    render(
      <IconButton icon="search" ariaLabel="Buscar" onClick={onClick} />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
