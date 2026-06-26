/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceTierPicker } from "../../../../../../app/(private)/pos/_blocks/PriceTierPicker";
import type { ProductDto, ProductPriceDto } from "../../../../../../app/(private)/pos/_logic/types/api";

HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

const product: ProductDto = {
  id: "prod-1",
  code: "P001",
  name: "Maíz blanco",
  ivaRate: 0.16,
  iepsRate: 0,
  isActive: true,
  departmentId: "dep-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prices: ProductPriceDto[] = [
  { id: "price-1", productId: "prod-1", name: "Precio menudeo", price: 100, minQuantity: 1, discountPct: 0, isDefault: true },
  { id: "price-2", productId: "prod-1", name: "Precio mayoreo", price: 80, minQuantity: 10, discountPct: 0, isDefault: false },
];

describe("PriceTierPicker", () => {
  it("renderiza el nombre del producto", () => {
    render(
      <PriceTierPicker
        product={product}
        prices={prices}
        isLoading={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText("Maíz blanco")).toBeInTheDocument();
    expect(screen.getByText("P001")).toBeInTheDocument();
  });

  it("preselecciona el precio default (isDefault=true)", () => {
    render(
      <PriceTierPicker
        product={product}
        prices={prices}
        isLoading={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const menudeoBtn = screen.getByText("Precio menudeo").closest("button")!;
    expect(menudeoBtn.className).toContain("border-primary");
  });

  it("cambia la selección al hacer click en otro precio", async () => {
    render(
      <PriceTierPicker
        product={product}
        prices={prices}
        isLoading={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByText("Precio mayoreo").closest("button")!);
    const mayoreoBtn = screen.getByText("Precio mayoreo").closest("button")!;
    expect(mayoreoBtn.className).toContain("border-primary");
  });

  it("llama onConfirm con precio, cantidad y descuento al confirmar", async () => {
    const onConfirm = jest.fn();
    render(
      <PriceTierPicker
        product={product}
        prices={prices}
        isLoading={false}
        initialQuantity={2}
        initialDiscountPct={5}
        onConfirm={onConfirm}
        onClose={jest.fn()}
      />
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /Añadir al carrito/i }));
    expect(onConfirm).toHaveBeenCalledWith(prices[0], 2, 5);
  });

  it("llama onClose al hacer click en Cancelar", async () => {
    const onClose = jest.fn();
    render(
      <PriceTierPicker
        product={product}
        prices={prices}
        isLoading={false}
        onConfirm={jest.fn()}
        onClose={onClose}
      />
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("muestra spinner cuando isLoading=true", () => {
    render(
      <PriceTierPicker
        product={product}
        prices={[]}
        isLoading={true}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /Añadir al carrito/i })).not.toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay precios", () => {
    render(
      <PriceTierPicker
        product={product}
        prices={[]}
        isLoading={false}
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getByText(/no tiene precios configurados/i)).toBeInTheDocument();
  });
});
