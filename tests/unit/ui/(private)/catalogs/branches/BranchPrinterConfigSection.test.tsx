/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../../app/(private)/catalogs/branches/_logic/hooks/usePrinterConfig");
jest.mock("../../../../../../app/(private)/catalogs/branches/_logic/hooks/usePrinterConfigMutations");

import { useCurrentUser } from "../../../../../../app/_hooks/useCurrentUser";
import { usePrinterConfig } from "../../../../../../app/(private)/catalogs/branches/_logic/hooks/usePrinterConfig";
import { usePrinterConfigMutations } from "../../../../../../app/(private)/catalogs/branches/_logic/hooks/usePrinterConfigMutations";
import { BranchPrinterConfigSection } from "../../../../../../app/(private)/catalogs/branches/_blocks/BranchPrinterConfigSection";
import type { PrinterConfigDto } from "../../../../../../app/(private)/catalogs/branches/_logic/types/api";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUsePrinterConfig = usePrinterConfig as jest.MockedFunction<typeof usePrinterConfig>;
const mockUsePrinterConfigMutations = usePrinterConfigMutations as jest.MockedFunction<typeof usePrinterConfigMutations>;

const BASE_CONFIG: PrinterConfigDto = {
  printMode: "browser",
  agentUrl: null,
  printerHost: null,
  printerPort: null,
};

function setupCurrentUser(overrides: { canRead?: boolean | "loading"; canWrite?: boolean | "loading" } = {}) {
  const { canRead = true, canWrite = true } = overrides;
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "admin@example.com",
    roles: ["admin"],
    branchId: null,
    isLoading: false,
    can: jest.fn((p: string) => {
      if (p === "settings:read") return canRead;
      if (p === "settings:write") return canWrite;
      return false;
    }),
    refresh: jest.fn(),
  });
}

function setupPrinterConfig(config: PrinterConfigDto = BASE_CONFIG, isLoading = false, error: Error | null = null) {
  mockUsePrinterConfig.mockReturnValue({ config, isLoading, error, refresh: jest.fn() });
}

function setupMutations(save = jest.fn()) {
  mockUsePrinterConfigMutations.mockReturnValue({
    isSaving: false,
    mutationError: null,
    clearError: jest.fn(),
    save,
  });
  return save;
}

describe("BranchPrinterConfigSection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no renderiza nada sin permiso settings:read", () => {
    setupCurrentUser({ canRead: false });
    setupPrinterConfig();
    setupMutations();
    const { container } = render(<BranchPrinterConfigSection branchId="b1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el formulario con settings:read", () => {
    setupCurrentUser();
    setupPrinterConfig();
    setupMutations();
    render(<BranchPrinterConfigSection branchId="b1" />);
    expect(screen.getByText("Impresión")).toBeInTheDocument();
    expect(screen.getByLabelText("Modo de impresión")).toBeInTheDocument();
  });

  it("deshabilita los campos ESC/POS cuando printMode es 'browser'", () => {
    setupCurrentUser();
    setupPrinterConfig();
    setupMutations();
    render(<BranchPrinterConfigSection branchId="b1" />);
    expect(screen.getByLabelText("URL del agente local")).toBeDisabled();
    expect(screen.getByLabelText("Host de la impresora")).toBeDisabled();
    expect(screen.getByLabelText("Puerto de la impresora")).toBeDisabled();
  });

  it("bloquea el guardado si printMode='escpos' sin agentUrl/printerHost", () => {
    setupCurrentUser();
    setupPrinterConfig(BASE_CONFIG);
    const save = setupMutations();
    render(<BranchPrinterConfigSection branchId="b1" />);

    fireEvent.change(screen.getByLabelText("Modo de impresión"), { target: { value: "escpos" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar configuración de impresión/i }));

    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/requiere agentUrl y printerHost/i)).toBeInTheDocument();
  });

  it("guarda solo el diff cuando la configuración es válida", () => {
    setupCurrentUser();
    setupPrinterConfig(BASE_CONFIG);
    const save = setupMutations();
    render(<BranchPrinterConfigSection branchId="b1" />);

    fireEvent.change(screen.getByLabelText("Modo de impresión"), { target: { value: "escpos" } });
    fireEvent.change(screen.getByLabelText("URL del agente local"), { target: { value: "http://localhost:9101" } });
    fireEvent.change(screen.getByLabelText("Host de la impresora"), { target: { value: "192.168.1.50" } });
    fireEvent.change(screen.getByLabelText("Puerto de la impresora"), { target: { value: "9100" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar configuración de impresión/i }));

    expect(save).toHaveBeenCalledWith("b1", {
      printMode: "escpos",
      agentUrl: "http://localhost:9101",
      printerHost: "192.168.1.50",
      printerPort: 9100,
    });
  });

  it("deshabilita el submit con settings:read pero sin settings:write", () => {
    setupCurrentUser({ canRead: true, canWrite: false });
    setupPrinterConfig();
    setupMutations();
    render(<BranchPrinterConfigSection branchId="b1" />);
    expect(screen.queryByRole("button", { name: /Guardar configuración de impresión/i })).not.toBeInTheDocument();
  });
});
