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

import { useTicketSettingsMutations } from "../../../../../app/(private)/settings/_logic/hooks/useTicketSettingsMutations";
import { TicketSettingsForm } from "../../../../../app/(private)/settings/_blocks/TicketSettingsForm";
import type { TicketSettingsDto } from "../../../../../app/(private)/settings/_logic/types/api";

const mockUseMutations = useTicketSettingsMutations as jest.MockedFunction<typeof useTicketSettingsMutations>;

const settings: TicketSettingsDto = {
  logoUrl: null,
  headerText: "Mi Negocio",
  footerText: "Gracias",
  paperWidth: "80mm",
  businessAddress: "Ocotlan de Morelos, Oaxaca. CP 71520",
  businessPhone: "951 292 80 86",
  businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
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
  beforeEach(() => jest.clearAllMocks());

  it("shows editable inputs when canWrite is true", () => {
    setup();
    render(<TicketSettingsForm settings={settings} canWrite={true} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/texto de encabezado/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/dirección/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/teléfono/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/régimen fiscal/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/leyenda del ticket/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
  });

  it("disables inputs and hides the save button when canWrite is false", () => {
    setup();
    render(<TicketSettingsForm settings={settings} canWrite={false} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/texto de encabezado/i)).toBeDisabled();
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
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ footerText: "Vuelva pronto", paperWidth: "80mm", businessPhone: "951 000 00 00" })
    );
  });
});
