import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StockAdjustModal } from "../../../../../app/(private)/inventory/_blocks/StockAdjustModal";
import type { InventoryItem } from "../../../../../app/(private)/inventory/_logic/types/domain";

const ITEM: InventoryItem = {
  id: "i1",
  branchId: "b1",
  productId: "p1",
  productCode: "PROD_01",
  productName: "Maíz Blanco",
  quantity: 100,
  reservedQuantity: 10,
  reorderPoint: 20,
  updatedAt: new Date("2026-05-20"),
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("StockAdjustModal", () => {
  it("muestra el stock actual junto a la etiqueta 'Stock actual'", () => {
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError={null}
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Stock actual")).toBeInTheDocument();
    expect(screen.getAllByText("100").length).toBeGreaterThanOrEqual(1);
  });

  it("preview 'Stock resultante' se actualiza al escribir delta", async () => {
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError={null}
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText(/Ej. 25/);
    await userEvent.type(input, "25");
    expect(screen.getByText("125")).toBeInTheDocument();
  });

  it("botón Aplicar deshabilitado cuando delta es 0", async () => {
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError={null}
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const btn = screen.getByRole("button", { name: /Aplicar ajuste/ });
    expect(btn).toBeDisabled();
  });

  it("botón Aplicar se habilita cuando delta es válido y no-cero", async () => {
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError={null}
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const input = screen.getByPlaceholderText(/Ej. 25/);
    await userEvent.type(input, "10");
    const btn = screen.getByRole("button", { name: /Aplicar ajuste/ });
    expect(btn).not.toBeDisabled();
  });

  it("muestra el error de ajuste cuando adjustError no es null", () => {
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError="El ajuste dejaría el stock en negativo."
        onAdjust={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("El ajuste dejaría el stock en negativo.")).toBeInTheDocument();
  });

  it("llama onAdjust con delta y reason al hacer submit", async () => {
    const onAdjust = jest.fn();
    render(
      <StockAdjustModal
        open
        item={ITEM}
        isSaving={false}
        adjustError={null}
        onAdjust={onAdjust}
        onClose={jest.fn()}
      />
    );
    await userEvent.type(screen.getByPlaceholderText(/Ej. 25/), "15");
    await userEvent.type(screen.getByPlaceholderText(/Recepción de compra/), "Compra");
    await userEvent.click(screen.getByRole("button", { name: /Aplicar ajuste/ }));
    expect(onAdjust).toHaveBeenCalledWith(15, "Compra");
  });
});
