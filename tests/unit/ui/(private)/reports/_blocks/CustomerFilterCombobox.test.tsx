/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch");

import { useCustomerSearch } from "../../../../../../app/(private)/payments/_logic/hooks/useCustomerSearch";
import { CustomerFilterCombobox } from "../../../../../../app/(private)/reports/_blocks/CustomerFilterCombobox";

const mockUseCustomerSearch = useCustomerSearch as jest.MockedFunction<typeof useCustomerSearch>;

const customers = [
  { id: "c1", code: "CUST001", name: "Cliente Uno" },
  { id: "c2", code: "CUST002", name: "Cliente Dos" },
];

beforeEach(() => {
  mockUseCustomerSearch.mockReturnValue({ items: customers, total: 2, isLoading: false, error: null, refresh: jest.fn() });
});

describe("CustomerFilterCombobox — opción 'Todos los clientes'", () => {
  it("muestra 'Todos los clientes' como primera opción sin búsqueda activa", () => {
    render(<CustomerFilterCombobox value="" onChange={jest.fn()} />);

    fireEvent.focus(screen.getByPlaceholderText("Buscar cliente…"));

    const options = screen.getAllByRole("button");
    expect(options[0]).toHaveTextContent("Todos los clientes");
    expect(options).toHaveLength(3); // sentinel + 2 clientes
  });

  it("muestra 'Todos los clientes' como valor seleccionado cuando value=''", () => {
    render(<CustomerFilterCombobox value="" onChange={jest.fn()} />);

    expect(screen.getByDisplayValue("Todos los clientes")).toBeInTheDocument();
  });

  it("no mezcla 'Todos los clientes' con resultados de una búsqueda activa", () => {
    render(<CustomerFilterCombobox value="" onChange={jest.fn()} />);

    const input = screen.getByPlaceholderText("Buscar cliente…");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Uno" } });

    const options = screen.getAllByRole("button");
    expect(options.map((o) => o.textContent)).not.toContain("Todos los clientes");
  });
});
