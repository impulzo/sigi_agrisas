/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/_hooks/useSatCodesSearch");

import { useSatCodesSearch } from "../../../../../../app/_hooks/useSatCodesSearch";
import { SatCodeCombobox } from "../../../../../../app/(private)/catalogs/products/_blocks/SatCodeCombobox";

const mockUseSatCodesSearch = useSatCodesSearch as jest.MockedFunction<typeof useSatCodesSearch>;

describe("SatCodeCombobox", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra sugerencias al escribir y foco", () => {
    mockUseSatCodesSearch.mockReturnValue({
      options: [{ code: "10191501", description: "Fertilizantes nitrogenados" }],
      isLoading: false,
    });

    render(<SatCodeCombobox value="" onChange={jest.fn()} />);
    fireEvent.focus(screen.getByPlaceholderText(/Buscar código o descripción SAT/i));

    expect(screen.getByText(/10191501/)).toBeInTheDocument();
    expect(screen.getByText(/Fertilizantes nitrogenados/)).toBeInTheDocument();
  });

  it("seleccionar una sugerencia completa el campo con el código", () => {
    mockUseSatCodesSearch.mockReturnValue({
      options: [{ code: "10191501", description: "Fertilizantes nitrogenados" }],
      isLoading: false,
    });
    const onChange = jest.fn();

    render(<SatCodeCombobox value="" onChange={onChange} />);
    fireEvent.focus(screen.getByPlaceholderText(/Buscar código o descripción SAT/i));
    fireEvent.click(screen.getByText(/Fertilizantes nitrogenados/));

    expect(onChange).toHaveBeenCalledWith("10191501");
  });

  it("permite escribir texto (búsqueda por descripción) sin filtrar letras", () => {
    mockUseSatCodesSearch.mockReturnValue({ options: [], isLoading: false });
    const onChange = jest.fn();

    render(<SatCodeCombobox value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/Buscar código o descripción SAT/i);
    fireEvent.change(input, { target: { value: "fertilizante" } });

    expect(onChange).toHaveBeenCalledWith("fertilizante");
    expect(input).toHaveValue("fertilizante");
  });

  it("acepta valor manual de 8 dígitos sin match en la lista", () => {
    mockUseSatCodesSearch.mockReturnValue({ options: [], isLoading: false });
    const onChange = jest.fn();

    render(<SatCodeCombobox value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/Buscar código o descripción SAT/i);
    fireEvent.change(input, { target: { value: "99999999" } });

    expect(onChange).toHaveBeenCalledWith("99999999");
  });
});
