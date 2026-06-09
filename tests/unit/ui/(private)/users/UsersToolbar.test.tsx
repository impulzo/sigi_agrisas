import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UsersToolbar } from "../../../../../app/(private)/users/_blocks/UsersToolbar";

describe("UsersToolbar", () => {
  function setup(overrides?: Partial<React.ComponentProps<typeof UsersToolbar>>) {
    const props = {
      search: "",
      onSearchChange: jest.fn(),
      activeRoles: [],
      availableRoles: ["admin", "viewer"],
      onToggleRole: jest.fn(),
      onClearFilters: jest.fn(),
      ...overrides,
    };
    render(<UsersToolbar {...props} />);
    return props;
  }

  it("renderiza campo de búsqueda y chips de roles", () => {
    setup();
    expect(screen.getByPlaceholderText("Buscar por nombre o email")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("viewer")).toBeInTheDocument();
  });

  it("llama onSearchChange al escribir", () => {
    const { onSearchChange } = setup();
    const input = screen.getByPlaceholderText("Buscar por nombre o email");
    fireEvent.change(input, { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  it("llama onToggleRole al hacer clic en un chip de rol", () => {
    const { onToggleRole } = setup();
    fireEvent.click(screen.getByText("admin"));
    expect(onToggleRole).toHaveBeenCalledWith("admin");
  });

  it("chip 'Todos' llama onClearFilters", () => {
    const { onClearFilters } = setup({ activeRoles: ["admin"] });
    fireEvent.click(screen.getByText("Todos"));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("chip activo tiene estilo primario", () => {
    setup({ activeRoles: ["viewer"] });
    const viewerBtn = screen.getByText("viewer");
    expect(viewerBtn.className).toContain("bg-primary");
  });
});
