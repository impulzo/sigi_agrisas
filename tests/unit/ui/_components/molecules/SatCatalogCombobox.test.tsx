/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../app/_hooks/useSatCatalogSearch");

import { useSatCatalogSearch } from "../../../../../app/_hooks/useSatCatalogSearch";
import { SatCatalogCombobox } from "../../../../../app/_components/molecules/SatCatalogCombobox/SatCatalogCombobox";

const mockUseSatCatalogSearch = useSatCatalogSearch as jest.MockedFunction<typeof useSatCatalogSearch>;

const REGIME_OPTIONS = [
  { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
];

const USE_OPTIONS = [
  { code: "G03", description: "Gastos en general." },
  { code: "CP01", description: "Pagos" },
];

function renderRegime(value = "") {
  return render(
    <SatCatalogCombobox
      catalog="regimen-fiscal"
      id="customer-taxRegime"
      value={value}
      onChange={jest.fn()}
      placeholder="601"
    />
  );
}

describe("SatCatalogCombobox", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra sugerencias al escribir y foco", () => {
    mockUseSatCatalogSearch.mockReturnValue({ options: REGIME_OPTIONS, isLoading: false });

    renderRegime();
    const input = screen.getByPlaceholderText("601");
    fireEvent.focus(input);

    expect(screen.getByText(/612/)).toBeInTheDocument();
    expect(screen.getByText(/Personas Físicas/)).toBeInTheDocument();
  });

  it("seleccionar una sugerencia completa el campo con el código y muestra su descripción", () => {
    mockUseSatCatalogSearch.mockReturnValue({ options: REGIME_OPTIONS, isLoading: false });
    const onChange = jest.fn();

    render(
      <SatCatalogCombobox
        catalog="regimen-fiscal"
        id="customer-taxRegime"
        value=""
        onChange={onChange}
        placeholder="601"
      />
    );
    const input = screen.getByPlaceholderText("601");
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText(/Personas Físicas/));

    expect(onChange).toHaveBeenCalledWith(
      "612",
      "Personas Físicas con Actividades Empresariales y Profesionales"
    );
    expect(screen.getByText(/Personas Físicas/)).toBeInTheDocument();
  });

  it("vaciar el campo notifica onChange con string vacío", () => {
    mockUseSatCatalogSearch.mockReturnValue({ options: [], isLoading: false });
    const onChange = jest.fn();

    render(
      <SatCatalogCombobox
        catalog="regimen-fiscal"
        id="customer-taxRegime"
        value="601"
        onChange={onChange}
        placeholder="601"
      />
    );
    const input = screen.getByPlaceholderText("601");
    fireEvent.change(input, { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("muestra códigos de 4 caracteres (CP01) para uso CFDI", () => {
    mockUseSatCatalogSearch.mockReturnValue({ options: USE_OPTIONS, isLoading: false });
    const onChange = jest.fn();

    render(
      <SatCatalogCombobox
        catalog="uso-cfdi"
        id="customer-cfdiUse"
        value=""
        onChange={onChange}
        placeholder="G03"
      />
    );
    const input = screen.getByPlaceholderText("G03");
    fireEvent.focus(input);
    fireEvent.mouseDown(screen.getByText(/Pagos/));

    expect(onChange).toHaveBeenCalledWith("CP01", "Pagos");
  });
});
