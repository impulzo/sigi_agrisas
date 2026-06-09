import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UsersPagination } from "../../../../../app/(private)/users/_blocks/UsersPagination";

describe("UsersPagination", () => {
  function setup(overrides: Partial<React.ComponentProps<typeof UsersPagination>> = {}) {
    const props = {
      page: 1,
      pageSize: 20,
      total: 42,
      count: 20,
      onPageChange: jest.fn(),
      onPageSizeChange: jest.fn(),
      ...overrides,
    };
    render(<UsersPagination {...props} />);
    return props;
  }

  it("muestra indicador correcto en primera página", () => {
    setup({ page: 1, count: 20, total: 42 });
    expect(screen.getByText("Mostrando 1–20 de 42 usuarios")).toBeInTheDocument();
  });

  it("deshabilita Anterior en página 1", () => {
    setup({ page: 1 });
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
  });

  it("deshabilita Siguiente en última página", () => {
    setup({ page: 3, count: 2, total: 42 });
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();
  });

  it("habilita Anterior cuando page > 1", () => {
    setup({ page: 2 });
    expect(screen.getByLabelText("Página anterior")).not.toBeDisabled();
  });

  it("habilita Siguiente cuando hay más páginas", () => {
    setup({ page: 1, count: 20, total: 42 });
    expect(screen.getByLabelText("Página siguiente")).not.toBeDisabled();
  });

  it("llama onPageChange con página-1 al hacer clic en Anterior", () => {
    const { onPageChange } = setup({ page: 3 });
    fireEvent.click(screen.getByLabelText("Página anterior"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("llama onPageChange con página+1 al hacer clic en Siguiente", () => {
    const { onPageChange } = setup({ page: 1, count: 20, total: 42 });
    fireEvent.click(screen.getByLabelText("Página siguiente"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("llama onPageSizeChange al cambiar selector", () => {
    const { onPageSizeChange } = setup();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
