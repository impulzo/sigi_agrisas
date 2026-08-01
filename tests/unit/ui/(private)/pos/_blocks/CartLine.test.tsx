/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartLine } from "../../../../../../app/(private)/pos/_blocks/CartLine";
import type { CartLine as CartLineType } from "../../../../../../app/(private)/pos/_logic/types/domain";

function makeLine(overrides: Partial<CartLineType> = {}): CartLineType {
  return {
    id: "line-1",
    productId: "prod-1",
    productCode: "P001",
    productName: "Maíz blanco",
    productPriceId: "price-1",
    priceName: "Precio menudeo",
    unitPrice: 100,
    ivaRate: 0.16,
    iepsRate: 0,
    quantity: 5,
    discountPct: 0,
    lineSubtotal: 500,
    lineIva: 80,
    lineIeps: 0,
    lineTotal: 580,
    ...overrides,
  };
}

function noop() {}

describe("CartLine — input de cantidad", () => {
  it("permite borrar la cantidad con backspace sin revertir instantáneamente", async () => {
    render(
      <CartLine line={makeLine()} onUpdateQuantity={noop} onUpdateDiscount={noop} onChangeTier={noop} onRemove={noop} />
    );
    const input = screen.getByDisplayValue("5") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(input);
    expect(input.value).toBe("");
  });

  it("permite reescribir la cantidad dígito por dígito incluyendo decimales", async () => {
    render(
      <CartLine line={makeLine()} onUpdateQuantity={noop} onUpdateDiscount={noop} onChangeTier={noop} onRemove={noop} />
    );
    const input = screen.getByDisplayValue("5") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "2.5");
    expect(input.value).toBe("2.5");
  });

  it("rechaza un 4º decimal", async () => {
    render(
      <CartLine line={makeLine()} onUpdateQuantity={noop} onUpdateDiscount={noop} onChangeTier={noop} onRemove={noop} />
    );
    const input = screen.getByDisplayValue("5") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "2.5678");
    expect(input.value).toBe("2.567");
  });

  it("revierte al último valor válido si queda vacío al perder el foco", async () => {
    render(
      <CartLine line={makeLine()} onUpdateQuantity={noop} onUpdateDiscount={noop} onChangeTier={noop} onRemove={noop} />
    );
    const input = screen.getByDisplayValue("5") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(input);
    await user.tab();
    expect(input.value).toBe("5");
  });

  it("llama onUpdateQuantity con el valor parseado mientras se tipea un número válido", async () => {
    const onUpdateQuantity = jest.fn();
    render(
      <CartLine line={makeLine()} onUpdateQuantity={onUpdateQuantity} onUpdateDiscount={noop} onChangeTier={noop} onRemove={noop} />
    );
    const input = screen.getByDisplayValue("5") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "3");
    expect(onUpdateQuantity).toHaveBeenCalledWith("line-1", 3);
  });
});
