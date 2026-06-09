import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranches", () => ({ useBranches: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranchMutations", () => ({ useBranchMutations: jest.fn() }));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useBranchesModule from "../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranches";
import * as useBranchMutationsModule from "../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranchMutations";
import { BranchesPage } from "../../../../../../app/(private)/catalogs/branches/_blocks/BranchesPage";

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

const defaultBranches = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
};

describe("BranchesPage", () => {
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
    jest.spyOn(useBranchesModule, "useBranches").mockReturnValue(defaultBranches);
    jest.spyOn(useBranchMutationsModule, "useBranchMutations").mockReturnValue(defaultMutations);
  });

  it("muestra skeletons cuando canRead='loading'", () => {
    mockCan.mockReturnValue("loading");
    const { container } = render(<BranchesPage />);
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("muestra Sin acceso cuando canRead=false", () => {
    mockCan.mockReturnValue(false);
    render(<BranchesPage />);
    expect(screen.getByText("Sin acceso a este catálogo")).toBeInTheDocument();
  });

  it("muestra el contenido cuando canRead=true y no hay items", () => {
    mockCan.mockReturnValue(true);
    render(<BranchesPage />);
    expect(screen.getByText("Sucursales")).toBeInTheDocument();
  });

  it("muestra tabla cuando canRead=true y hay items", () => {
    mockCan.mockReturnValue(true);
    jest.spyOn(useBranchesModule, "useBranches").mockReturnValue({
      items: [
        {
          id: "b1",
          code: "CDMX_01",
          name: "Ciudad de México",
          address: null,
          phone: null,
          email: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<BranchesPage />);
    expect(screen.getByText("Ciudad de México")).toBeInTheDocument();
  });

  it("botón Nuevo NO visible cuando canWrite=false", () => {
    mockCan.mockImplementation((p: string) => p === "branches:read" ? true : false);
    render(<BranchesPage />);
    expect(screen.queryByRole("button", { name: /nuevo/i })).not.toBeInTheDocument();
  });

  it("botón Nuevo VISIBLE cuando canWrite=true", () => {
    mockCan.mockReturnValue(true);
    render(<BranchesPage />);
    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
  });

  it("botón Nuevo abre el modal", async () => {
    mockCan.mockReturnValue(true);
    const clearError = jest.fn();
    jest.spyOn(useBranchMutationsModule, "useBranchMutations").mockReturnValue({
      ...defaultMutations,
      clearError,
    });
    render(<BranchesPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: /nuevo/i }));
    expect(clearError).toHaveBeenCalled();
  });
});
