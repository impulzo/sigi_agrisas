/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/returns/_logic/hooks/useReturnDetail");
jest.mock("../../../../../../app/(private)/returns/_logic/hooks/useReturnMutations", () => ({
  useReturnMutations: () => ({ isSaving: false, mutationError: null, clearError: jest.fn(), cancel: jest.fn(), create: jest.fn() }),
}));

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import * as useReturnDetailModule from "../../../../../../app/(private)/returns/_logic/hooks/useReturnDetail";
import { ReturnDetailPage } from "../../../../../../app/(private)/returns/_blocks/ReturnDetailPage";
import {
  ReturnNotFoundError,
  ReturnReadForbiddenError,
} from "../../../../../../app/(private)/returns/_logic/errors";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

function setupCurrentUser(can: (p: string) => boolean | "loading") {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: false,
    can,
    refresh: jest.fn(),
  });
}

const NOW = new Date("2026-06-01T10:00:00Z");
const VALID_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function makeDetail(overrides = {}) {
  return {
    id: VALID_UUID,
    saleId: "s1",
    branchId: "b1",
    creatorId: "u1",
    status: "completed" as const,
    reason: "Producto dañado",
    refundTotal: 200,
    returnedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    items: [],
    ...overrides,
  };
}

describe("ReturnDetailPage — UUID inválido", () => {
  beforeEach(() => jest.clearAllMocks());

  it("UUID inválido → EmptyState 'ID inválido' sin invocar hook", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id="no-es-uuid" />);
    expect(screen.getByText("ID inválido")).toBeInTheDocument();
    // El hook se invoca con "__skip__" en lugar del UUID
    expect(useReturnDetailModule.useReturnDetail).toHaveBeenCalledWith("__skip__");
  });
});

describe("ReturnDetailPage — happy path", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renderiza el ID corto del return en el header", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: makeDetail(),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    // Últimos 6 chars del UUID: "EEEEEE"
    expect(screen.getByText(/Devolución #EEEEEE/i)).toBeInTheDocument();
  });

  it("muestra el refundTotal formateado", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: makeDetail(),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });
});

describe("ReturnDetailPage — errores", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ReturnNotFoundError → EmptyState 'Devolución no encontrada'", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: null,
      isLoading: false,
      error: new ReturnNotFoundError(),
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.getByText("Devolución no encontrada")).toBeInTheDocument();
  });

  it("ReturnReadForbiddenError → EmptyState 'No tienes acceso'", () => {
    setupCurrentUser(() => false);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: null,
      isLoading: false,
      error: new ReturnReadForbiddenError(),
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.getByText("No tienes acceso a esta devolución")).toBeInTheDocument();
  });
});

describe("ReturnDetailPage — botón cancelar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin permiso returns:cancel → botón 'Cancelar' no aparece", () => {
    setupCurrentUser((p) => p !== "returns:cancel");
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: makeDetail({ status: "completed" }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.queryByRole("button", { name: /Cancelar devolución/i })).not.toBeInTheDocument();
  });

  it("con permiso returns:cancel y status=completed → botón aparece", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: makeDetail({ status: "completed" }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.getByRole("button", { name: /Cancelar devolución/i })).toBeInTheDocument();
  });

  it("status=cancelled → botón Cancelar no aparece aunque tenga permiso", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useReturnDetailModule, "useReturnDetail").mockReturnValue({
      returnDetail: makeDetail({ status: "cancelled", cancelledAt: NOW }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<ReturnDetailPage id={VALID_UUID} />);
    expect(screen.queryByRole("button", { name: /Cancelar devolución/i })).not.toBeInTheDocument();
  });
});
