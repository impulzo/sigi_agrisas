/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/(private)/billing/_logic/hooks/useCsdManager");

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { useCsdManager } from "../../../../../app/(private)/billing/_logic/hooks/useCsdManager";
import { CsdManagerPage } from "../../../../../app/(private)/billing/_blocks/CsdManagerPage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseCsdManager = useCsdManager as jest.MockedFunction<typeof useCsdManager>;

function setupUser() {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId: null,
    isLoading: false,
    can: jest.fn(() => true),
    refresh: jest.fn(),
  });
}

function setupCsd(overrides: Partial<ReturnType<typeof useCsdManager>> = {}) {
  const upload = jest.fn().mockResolvedValue(null);
  mockUseCsdManager.mockReturnValue({
    status: null,
    isLoading: false,
    statusError: null,
    isUploading: false,
    uploadError: null,
    uploadSuccess: false,
    clearUploadError: jest.fn(),
    upload,
    refreshStatus: jest.fn(),
    ...overrides,
  });
  return upload;
}

describe("CsdManagerPage — fiscal data fields", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the 4 new fiscal fields", () => {
    setupUser();
    setupCsd();
    render(<CsdManagerPage />);
    expect(screen.getByLabelText(/Razón social/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Régimen fiscal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código postal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument();
  });

  it("pre-fills the fields from a previously persisted status", () => {
    setupUser();
    setupCsd({
      status: { rfc: "XAXX010101000", legalName: "Agrisas", fiscalRegime: "601", zipCode: "83000", address: "Calle Falsa 123" },
    });
    render(<CsdManagerPage />);
    expect(screen.getByLabelText(/RFC del CSD/i)).toHaveValue("XAXX010101000");
    expect(screen.getByLabelText(/Razón social/i)).toHaveValue("Agrisas");
    expect(screen.getByLabelText(/Régimen fiscal/i)).toHaveValue("601");
    expect(screen.getByLabelText(/Código postal/i)).toHaveValue("83000");
    expect(screen.getByLabelText(/Dirección/i)).toHaveValue("Calle Falsa 123");
  });

  it("sends the 4 fiscal fields on submit", async () => {
    const user = userEvent.setup();
    setupUser();
    const upload = setupCsd();
    render(<CsdManagerPage />);

    await user.type(screen.getByLabelText(/RFC del CSD/i), "XAXX010101000");
    await user.type(screen.getByLabelText(/Razón social/i), "Agrisas");
    await user.type(screen.getByLabelText(/Régimen fiscal/i), "601");
    await user.type(screen.getByLabelText(/Código postal/i), "83000");
    await user.type(screen.getByLabelText(/Dirección/i), "Calle Falsa 123");
    await user.type(screen.getByLabelText(/Contraseña de la llave/i), "secret");

    const cerInput = screen.getByLabelText(/Certificado \(\.cer\)/i) as HTMLInputElement;
    const keyInput = screen.getByLabelText(/Llave privada \(\.key\)/i) as HTMLInputElement;
    const cerFile = new File(["cert"], "cert.cer");
    const keyFile = new File(["key"], "key.key");
    await user.upload(cerInput, cerFile);
    await user.upload(keyInput, keyFile);

    await user.click(screen.getByRole("button", { name: /Cargar CSD/i }));

    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        rfc: "XAXX010101000",
        legalName: "Agrisas",
        fiscalRegime: "601",
        zipCode: "83000",
        address: "Calle Falsa 123",
        password: "secret",
      })
    );
  });
});
