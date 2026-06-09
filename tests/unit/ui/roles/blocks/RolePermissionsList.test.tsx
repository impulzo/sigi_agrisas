import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RolePermissionsList } from "../../../../../app/(private)/roles/_blocks/RolePermissionsList";

const permissions = [
  { id: "p1", key: "users:read", description: null },
  { id: "p2", key: "roles:write", description: null },
];

describe("RolePermissionsList", () => {
  it("calls onRevoke with the permission when Revocar is clicked", () => {
    const onRevoke = jest.fn();
    render(
      <RolePermissionsList permissions={permissions} onRevoke={onRevoke} isLoading={false} />
    );
    fireEvent.click(screen.getByLabelText("Revocar users:read"));
    expect(onRevoke).toHaveBeenCalledWith(permissions[0]);
  });

  it("disables buttons when disabled prop is true", () => {
    render(
      <RolePermissionsList permissions={permissions} onRevoke={jest.fn()} isLoading={false} disabled />
    );
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("renders 'read' badge for :read permissions", () => {
    render(
      <RolePermissionsList permissions={[{ id: "p1", key: "users:read", description: null }]} onRevoke={jest.fn()} isLoading={false} />
    );
    expect(screen.getByText("read")).toBeInTheDocument();
  });

  it("renders 'write' badge for :write permissions", () => {
    render(
      <RolePermissionsList permissions={[{ id: "p2", key: "roles:write", description: null }]} onRevoke={jest.fn()} isLoading={false} />
    );
    expect(screen.getByText("write")).toBeInTheDocument();
  });
});
