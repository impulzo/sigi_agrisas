import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviders", () => ({ useProviders: jest.fn() }));
jest.mock("../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviderMutations", () => ({ useProviderMutations: jest.fn() }));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useProvidersModule from "../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviders";
import * as useProviderMutationsModule from "../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviderMutations";
import { ProvidersPage } from "../../../../../../app/(private)/catalogs/providers/_blocks/ProvidersPage";
import type { Provider } from "../../../../../../app/(private)/catalogs/providers/_logic/types/domain";

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

const defaultProviders = {
  items: [] as Provider[],
  total: 0,
  isLoading: false,
    branchId: null,
  error: null as string | null,
  refresh: jest.fn(),
};

describe("ProvidersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentUser as jest.Mock).mockReturnValue({
      userId: "admin-id",
      email: "admin@test.com",
      roles: ["admin"],
      isLoading: false,
    branchId: null,
      can: mockCan,
      refresh: jest.fn(),
    });
    jest.spyOn(useProvidersModule, "useProviders").mockReturnValue(defaultProviders);
    jest.spyOn(useProviderMutationsModule, "useProviderMutations").mockReturnValue(defaultMutations);
  });

  it("shows skeletons when canRead='loading'", () => {
    mockCan.mockReturnValue("loading");
    const { container } = render(<ProvidersPage />);
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("shows 'Sin acceso' state when canRead=false", () => {
    mockCan.mockReturnValue(false);
    render(<ProvidersPage />);
    expect(screen.getByText("Sin acceso a este catálogo")).toBeInTheDocument();
  });

  it("renders header when canRead=true", () => {
    mockCan.mockReturnValue(true);
    render(<ProvidersPage />);
    expect(screen.getByText("Proveedores")).toBeInTheDocument();
  });

  it("renders the server-side search hint in the toolbar", () => {
    mockCan.mockReturnValue(true);
    render(<ProvidersPage />);
    expect(screen.getByText(/búsqueda en servidor/i)).toBeInTheDocument();
  });

  it("renders search placeholder with 'nombre, razón social o RFC'", () => {
    mockCan.mockReturnValue(true);
    render(<ProvidersPage />);
    expect(screen.getByPlaceholderText(/nombre, razón social o rfc/i)).toBeInTheDocument();
  });

  it("Nuevo button NOT visible when canWrite=false", () => {
    mockCan.mockImplementation((p: string) => (p === "providers:read" ? true : false));
    render(<ProvidersPage />);
    expect(screen.queryByRole("button", { name: /nuevo/i })).not.toBeInTheDocument();
  });

  it("Nuevo button visible when canWrite=true", () => {
    mockCan.mockReturnValue(true);
    render(<ProvidersPage />);
    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
  });

  it("clicking Nuevo opens the modal and clears errors", async () => {
    mockCan.mockReturnValue(true);
    const clearError = jest.fn();
    jest.spyOn(useProviderMutationsModule, "useProviderMutations").mockReturnValue({
      ...defaultMutations,
      clearError,
    });
    render(<ProvidersPage />);
    await userEvent.setup().click(screen.getByRole("button", { name: /nuevo/i }));
    expect(clearError).toHaveBeenCalled();
  });

  it("renders the providers table when items exist", () => {
    mockCan.mockReturnValue(true);
    const sample: Provider = {
      id: "p1",
      code: "PROV_001",
      name: "Semillas ACME",
      rfc: "SAC120101A12",
      legalName: null,
      taxRegime: null,
      cfdiUse: null,
      taxZipCode: null,
      email: null,
      phone: null,
      address: null,
      contactName: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    jest.spyOn(useProvidersModule, "useProviders").mockReturnValue({
      ...defaultProviders,
      items: [sample],
      total: 1,
    });
    render(<ProvidersPage />);
    expect(screen.getByText("Semillas ACME")).toBeInTheDocument();
    expect(screen.getByText("SAC120101A12")).toBeInTheDocument();
  });
});
