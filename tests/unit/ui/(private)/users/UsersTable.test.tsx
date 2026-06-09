import React from "react";
import { render, screen } from "@testing-library/react";
import { UsersTable } from "../../../../../app/(private)/users/_blocks/UsersTable";
import type { User } from "../../../../../app/(private)/users/_logic/types/domain";

const USERS: User[] = [
  {
    id: "u1",
    name: "Alice Admin",
    email: "alice@test.com",
    avatarUrl: "https://gravatar.com/avatar/abc",
    roles: ["admin"],
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
  {
    id: "u2",
    name: "Bob Viewer",
    email: "bob@test.com",
    avatarUrl: "https://gravatar.com/avatar/def",
    roles: ["viewer"],
    createdAt: new Date("2026-05-10"),
    updatedAt: new Date("2026-05-10"),
  },
];

describe("UsersTable", () => {
  it("renderiza filas con nombre y email", () => {
    render(
      <UsersTable users={USERS} currentUserId="other-id" canWrite={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("muestra roles como badges", () => {
    render(
      <UsersTable users={USERS} currentUserId="other-id" canWrite={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("viewer")).toBeInTheDocument();
  });

  it("no muestra acciones cuando canWrite es false", () => {
    render(
      <UsersTable users={USERS} currentUserId="other-id" canWrite={false} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.queryByTitle("Editar usuario")).not.toBeInTheDocument();
  });

  it("deshabilita acciones de la fila propia", () => {
    render(
      <UsersTable users={USERS} currentUserId="u1" canWrite={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    const editBtn = screen.getAllByTitle(/No puedes editar tu propia cuenta/)[0];
    const deleteBtn = screen.getAllByTitle(/No puedes eliminar tu propia cuenta/)[0];
    expect(editBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });

  it("habilita acciones para otras filas", () => {
    render(
      <UsersTable users={USERS} currentUserId="u1" canWrite={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    const editBtns = screen.getAllByTitle("Editar usuario");
    expect(editBtns[0]).not.toBeDisabled();
  });

  it("muestra esqueletos cuando isLoading es true", () => {
    const { container } = render(
      <UsersTable users={[]} currentUserId="other" canWrite={true} isLoading={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
