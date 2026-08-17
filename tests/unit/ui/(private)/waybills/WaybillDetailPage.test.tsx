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

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/waybills/_logic/hooks/useWaybillDetail");
jest.mock("../../../../../app/(private)/waybills/_logic/hooks/useWaybillMutations", () => ({
  useWaybillMutations: () => ({
    isSaving: false,
    isDownloading: false,
    mutationError: null,
    clearError: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn(),
  }),
}));
jest.mock("../../../../../app/_hooks/useBranchesOptions", () => ({
  useBranchesOptions: () => ({ options: [], isLoading: false }),
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import * as useWaybillDetailModule from "../../../../../app/(private)/waybills/_logic/hooks/useWaybillDetail";
import { WaybillDetailPage } from "../../../../../app/(private)/waybills/_blocks/WaybillDetailPage";
import { WaybillNotFoundError, WaybillReadForbiddenError } from "../../../../../app/(private)/waybills/_logic/errors";

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

const ADDRESS = {
  street: "Calle 1",
  exteriorNumber: "100",
  interiorNumber: null,
  neighborhood: "Centro",
  municipality: "Hermosillo",
  state: "SON",
  country: "MEX",
  zipCode: "83000",
};

function makeDetail(overrides = {}) {
  return {
    id: VALID_UUID,
    folioCode: "TS-000001",
    originBranchId: "b1",
    destinationBranchId: null,
    destinationCustomerId: "c1",
    destinationCustomerName: "Cliente Uno",
    destinationCustomerCode: "CLI001",
    saleId: "s1",
    type: "carta_porte" as const,
    status: "completed" as const,
    notes: null,
    originAddress: ADDRESS,
    destinationAddress: ADDRESS,
    vehiclePlate: "ABC1234",
    vehicleConfig: "C2",
    vehiclePermitType: "TPAF01",
    vehiclePermitNumber: "SCT-1",
    insuranceCompany: "Aseguradora SA",
    insurancePolicy: "POL-1",
    driverName: "Juan Perez",
    driverRfc: null,
    driverLicenseNumber: "LIC-1",
    distanceKm: 50,
    departureAt: NOW,
    arrivalAt: NOW,
    cfdiUuid: "UUID-FAKE-1",
    facturamaCfdiId: "cfdi-1",
    xmlUrl: null,
    pdfUrl: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    creatorId: "u1",
    createdAt: NOW,
    updatedAt: NOW,
    items: [],
    ...overrides,
  };
}

describe("WaybillDetailPage — UUID inválido", () => {
  beforeEach(() => jest.clearAllMocks());

  it("UUID inválido → EmptyState 'ID inválido' sin invocar hook", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id="no-es-uuid" />);
    expect(screen.getByText("ID inválido")).toBeInTheDocument();
    expect(useWaybillDetailModule.useWaybillDetail).toHaveBeenCalledWith("__skip__");
  });
});

describe("WaybillDetailPage — happy path", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renderiza el folioCode en el header", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: makeDetail(),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.getByText("TS-000001")).toBeInTheDocument();
  });
});

describe("WaybillDetailPage — errores", () => {
  beforeEach(() => jest.clearAllMocks());

  it("WaybillNotFoundError → EmptyState 'Traspaso no encontrado'", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: null,
      isLoading: false,
      error: new WaybillNotFoundError(),
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.getByText("Traspaso no encontrado")).toBeInTheDocument();
  });

  it("WaybillReadForbiddenError → EmptyState 'No tienes acceso'", () => {
    setupCurrentUser(() => false);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: null,
      isLoading: false,
      error: new WaybillReadForbiddenError(),
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.getByText("No tienes acceso a este traspaso")).toBeInTheDocument();
  });
});

describe("WaybillDetailPage — botón cancelar (gated por permiso y estado)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin permiso waybills:cancel → botón 'Cancelar traspaso' no aparece", () => {
    setupCurrentUser((p) => p !== "waybills:cancel");
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: makeDetail({ status: "completed" }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.queryByRole("button", { name: /Cancelar traspaso/i })).not.toBeInTheDocument();
  });

  it("con permiso waybills:cancel y status=completed → botón aparece", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: makeDetail({ status: "completed" }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.getByRole("button", { name: /Cancelar traspaso/i })).toBeInTheDocument();
  });

  it("status=cancelled → botón Cancelar no aparece aunque tenga permiso", () => {
    setupCurrentUser(() => true);
    jest.spyOn(useWaybillDetailModule, "useWaybillDetail").mockReturnValue({
      waybill: makeDetail({ status: "cancelled", cancelledAt: NOW, cancellationReason: "Error de captura" }),
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    render(<WaybillDetailPage id={VALID_UUID} />);
    expect(screen.queryByRole("button", { name: /Cancelar traspaso/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Error de captura/i)).toBeInTheDocument();
  });
});
