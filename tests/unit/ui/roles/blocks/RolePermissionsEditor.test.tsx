import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RolePermissionsEditor } from "../../../../../app/(private)/roles/_blocks/RolePermissionsEditor";
import type { Permission } from "../../../../../app/(private)/roles/_logic/types/domain";

const catalog: Permission[] = [
  { id: "p1", key: "users:read", description: "Leer usuarios" },
  { id: "p2", key: "users:write", description: "Crear/editar usuarios" },
  { id: "p3", key: "roles:read", description: "Leer roles y permisos" },
];

describe("RolePermissionsEditor", () => {
  it("renders permissions grouped by resource", () => {
    render(
      <RolePermissionsEditor
        catalog={catalog}
        staged={new Set(["p1"])}
        onToggle={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Roles y Permisos")).toBeInTheDocument();
  });

  it("shows description instead of technical key", () => {
    render(
      <RolePermissionsEditor
        catalog={catalog}
        staged={new Set()}
        onToggle={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText("Leer usuarios")).toBeInTheDocument();
    expect(screen.queryByText("users:read")).not.toBeInTheDocument();
  });

  it("falls back to key when description is null", () => {
    const withNull: Permission[] = [{ id: "p1", key: "users:read", description: null }];
    render(
      <RolePermissionsEditor
        catalog={withNull}
        staged={new Set()}
        onToggle={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText("users:read")).toBeInTheDocument();
  });

  it("toggle is checked for staged permissions, unchecked for others", () => {
    render(
      <RolePermissionsEditor
        catalog={catalog}
        staged={new Set(["p1"])}
        onToggle={jest.fn()}
        isLoading={false}
      />
    );
    expect(
      screen.getByRole("switch", { name: "Revocar Leer usuarios" })
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("switch", { name: "Conceder Crear/editar usuarios" })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggle with the correct permId when switch is clicked", () => {
    const onToggle = jest.fn();
    render(
      <RolePermissionsEditor
        catalog={catalog}
        staged={new Set()}
        onToggle={onToggle}
        isLoading={false}
      />
    );
    fireEvent.click(screen.getByRole("switch", { name: "Conceder Leer usuarios" }));
    expect(onToggle).toHaveBeenCalledWith("p1");
  });

  it("shows skeleton when isLoading is true", () => {
    const { container } = render(
      <RolePermissionsEditor
        catalog={[]}
        staged={new Set()}
        onToggle={jest.fn()}
        isLoading={true}
      />
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("disables all switches when disabled prop is true", () => {
    render(
      <RolePermissionsEditor
        catalog={catalog}
        staged={new Set()}
        onToggle={jest.fn()}
        isLoading={false}
        disabled={true}
      />
    );
    screen.getAllByRole("switch").forEach((sw) => expect(sw).toBeDisabled());
  });

  it("shows empty message when catalog is empty and not loading", () => {
    render(
      <RolePermissionsEditor
        catalog={[]}
        staged={new Set()}
        onToggle={jest.fn()}
        isLoading={false}
      />
    );
    expect(screen.getByText("No hay permisos en el catálogo")).toBeInTheDocument();
  });
});
