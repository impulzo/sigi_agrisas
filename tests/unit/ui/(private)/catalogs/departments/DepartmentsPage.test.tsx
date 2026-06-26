import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartments", () => ({ useDepartments: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartmentMutations", () => ({ useDepartmentMutations: jest.fn() }));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useDepartmentsModule from "../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartments";
import * as useDepartmentMutationsModule from "../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartmentMutations";
import { DepartmentsPage } from "../../../../../../app/(private)/catalogs/departments/_blocks/DepartmentsPage";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

const mockCan = jest.fn();

const defaultMutations = {
  isSaving: false,
  mutationError: null,
  clearError: jest.fn(),
  createOne: jest.fn(),
  updateOne: jest.fn(),
  softDeleteOne: jest.fn(),
  reactivateOne: jest.fn(),
};

const defaultDepartments = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};

describe("DepartmentsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentUser as jest.Mock).mockReturnValue({
      userId: "admin-id",
      email: "admin@test.com",
      roles: ["admin"],
      isLoading: false,
      can: mockCan,
      refresh: jest.fn(),
    });
    jest.spyOn(useDepartmentsModule, "useDepartments").mockReturnValue(defaultDepartments);
    jest.spyOn(useDepartmentMutationsModule, "useDepartmentMutations").mockReturnValue(defaultMutations);
  });

  it("muestra skeletons cuando canRead='loading'", () => {
    mockCan.mockReturnValue("loading");
    const { container } = render(<DepartmentsPage />);
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("muestra Sin acceso cuando canRead=false", () => {
    mockCan.mockReturnValue(false);
    render(<DepartmentsPage />);
    expect(screen.getByText("Sin acceso a este catálogo")).toBeInTheDocument();
  });

  it("muestra el contenido cuando canRead=true y no hay items", () => {
    mockCan.mockReturnValue(true);
    render(<DepartmentsPage />);
    expect(screen.getByText("Departamentos")).toBeInTheDocument();
  });

  it("muestra tabla cuando canRead=true y hay items", () => {
    mockCan.mockReturnValue(true);
    jest.spyOn(useDepartmentsModule, "useDepartments").mockReturnValue({
      items: [
        {
          id: "d1",
          code: "VENTAS",
          name: "Ventas",
          description: null,
          isActive: true,
          providerId: null,
          providerName: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<DepartmentsPage />);
    expect(screen.getByText("Ventas")).toBeInTheDocument();
  });

  it("botón Nuevo NO visible cuando canWrite=false", () => {
    mockCan.mockImplementation((p: string) => p === "departments:read" ? true : false);
    render(<DepartmentsPage />);
    expect(screen.queryByRole("button", { name: /nuevo/i })).not.toBeInTheDocument();
  });

  it("botón Nuevo VISIBLE cuando canWrite=true", () => {
    mockCan.mockReturnValue(true);
    render(<DepartmentsPage />);
    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
  });

  it("botón Nuevo abre el modal", async () => {
    mockCan.mockReturnValue(true);
    const clearError = jest.fn();
    jest.spyOn(useDepartmentMutationsModule, "useDepartmentMutations").mockReturnValue({
      ...defaultMutations,
      clearError,
    });
    render(<DepartmentsPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: /nuevo/i }));
    expect(clearError).toHaveBeenCalled();
  });
});
