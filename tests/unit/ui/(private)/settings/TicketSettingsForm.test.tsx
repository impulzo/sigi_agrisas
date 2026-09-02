/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/(private)/settings/_logic/hooks/useTicketSettingsMutations");
jest.mock("../../../../../app/(private)/settings/_logic/services/uploadTicketLogo", () => ({
  uploadTicketLogo: jest.fn(),
}));
jest.mock("../../../../../app/(private)/settings/_logic/services/deleteTicketLogo", () => ({
  deleteTicketLogo: jest.fn(),
}));
jest.mock("../../../../../app/_hooks/useSatCatalogSearch");

import { useTicketSettingsMutations } from "../../../../../app/(private)/settings/_logic/hooks/useTicketSettingsMutations";
import { useSatCatalogSearch } from "../../../../../app/_hooks/useSatCatalogSearch";
import { TicketSettingsForm } from "../../../../../app/(private)/settings/_blocks/TicketSettingsForm";
import type { TicketSettingsDto } from "../../../../../app/(private)/settings/_logic/types/api";

const mockUseMutations = useTicketSettingsMutations as jest.MockedFunction<typeof useTicketSettingsMutations>;
const mockUseSatCatalogSearch = useSatCatalogSearch as jest.MockedFunction<typeof useSatCatalogSearch>;

const settings: TicketSettingsDto = {
  logoUrl: null,
  footerText: "Gracias",
  paperWidth: "80mm",
  businessName: "Agrisas",
  businessRfc: "AGR010101AB1",
  businessAddress: "Ocotlan de Morelos, Oaxaca. CP 71520",
  businessPhone: "951 292 80 86",
  businessEmail: null,
  businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
  businessZipCode: "71520",
  legendText: "Gracias por su compra",
};

function setup() {
  mockUseMutations.mockReturnValue({
    isSaving: false,
    mutationError: null,
    clearError: jest.fn(),
    update: jest.fn().mockResolvedValue(settings),
  });
}

describe("TicketSettingsForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSatCatalogSearch.mockReturnValue({ options: [], isLoading: false });
  });

  it("shows editable inputs when canWrite is true", () => {
    setup();
    render(<TicketSettingsForm settings={settings} canWrite={true} onChange={jest.fn()} />);

    expect(screen.queryByLabelText(/texto de encabezado/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/razón social/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/^rfc$/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/dirección/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/teléfono/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/régimen fiscal/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/leyenda del ticket/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it("disables inputs and hides the save button when canWrite is false", () => {
    setup();
    render(<TicketSettingsForm settings={settings} canWrite={false} onChange={jest.fn()} />);

    expect(screen.queryByLabelText(/texto de encabezado/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/razón social/i)).toBeDisabled();
    expect(screen.getByLabelText(/^rfc$/i)).toBeDisabled();
    expect(screen.getByLabelText(/dirección/i)).toBeDisabled();
    expect(screen.getByLabelText(/leyenda del ticket/i)).toBeDisabled();
    expect(screen.queryByRole("button", { name: /guardar cambios/i })).not.toBeInTheDocument();
  });

  it("calls update with the edited values on save", async () => {
    const update = jest.fn().mockResolvedValue(settings);
    mockUseMutations.mockReturnValue({
      isSaving: false,
      mutationError: null,
      clearError: jest.fn(),
      update,
    });
    render(<TicketSettingsForm settings={settings} canWrite={true} onChange={jest.fn()} />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/texto de pie/i));
    await user.type(screen.getByLabelText(/texto de pie/i), "Vuelva pronto");
    await user.clear(screen.getByLabelText(/teléfono/i));
    await user.type(screen.getByLabelText(/teléfono/i), "951 000 00 00");
    await user.clear(screen.getByLabelText(/^rfc$/i));
    await user.type(screen.getByLabelText(/^rfc$/i), "AGR010101XY2");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        footerText: "Vuelva pronto",
        paperWidth: "80mm",
        businessPhone: "951 000 00 00",
        businessRfc: "AGR010101XY2",
      })
    );
  });

  it("loads an existing 'code — description' businessTaxRegime as free text without error", () => {
    setup();
    render(<TicketSettingsForm settings={settings} canWrite={true} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/régimen fiscal/i)).toHaveValue(
      "612 Personas Físicas con Actividad Empresarial"
    );
  });

  it("loads a legacy bare-code businessTaxRegime as free text without error", () => {
    setup();
    render(
      <TicketSettingsForm
        settings={{ ...settings, businessTaxRegime: "612" }}
        canWrite={true}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText(/régimen fiscal/i)).toHaveValue("612");
  });

  it("selecting a régimen fiscal option saves 'code — description' to businessTaxRegime", async () => {
    const update = jest.fn().mockResolvedValue(settings);
    mockUseMutations.mockReturnValue({
      isSaving: false,
      mutationError: null,
      clearError: jest.fn(),
      update,
    });
    mockUseSatCatalogSearch.mockReturnValue({
      options: [{ code: "601", description: "General de Ley Personas Morales" }],
      isLoading: false,
    });
    render(<TicketSettingsForm settings={settings} canWrite={true} onChange={jest.fn()} />);

    const user = userEvent.setup();
    const input = screen.getByLabelText(/régimen fiscal/i);
    await user.clear(input);
    await user.type(input, "601");
    await user.click(
      screen.getByRole("button", { name: /601.*General de Ley Personas Morales/ })
    );
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ businessTaxRegime: "601 — General de Ley Personas Morales" })
    );
  });
});
