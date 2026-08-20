/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartialInvoiceLineRow } from "../../../../../app/(private)/billing/_blocks/PartialInvoiceLineRow";
import type { PartialLine } from "../../../../../app/(private)/billing/_logic/types/domain";

function makeLine(overrides: Partial<PartialLine> = {}): PartialLine {
  return {
    _key: "line-1",
    productId: null,
    productCode: "LIB-1",
    description: "Línea libre",
    satProductCode: "01010101",
    satUnitCode: "",
    unit: "PZA",
    quantity: 1,
    unitPrice: 100,
    priceId: null,
    priceName: null,
    discountPct: 0,
    ivaRate: 0.16,
    iepsRate: 0,
    ...overrides,
  };
}

function renderRow(props: Partial<React.ComponentProps<typeof PartialInvoiceLineRow>> = {}) {
  const onUpdate = jest.fn();
  const onRemove = jest.fn();
  const utils = render(
    <table>
      <tbody>
        <PartialInvoiceLineRow
          line={makeLine()}
          lineTotal={100}
          onUpdate={onUpdate}
          onRemove={onRemove}
          {...props}
        />
      </tbody>
    </table>
  );
  return { ...utils, onUpdate, onRemove };
}

describe("PartialInvoiceLineRow — selector de lista de precios", () => {
  it("renders the price-tier trigger for catalog lines", () => {
    renderRow({
      line: makeLine({ productId: "prod-1", priceName: "Precio público" }),
      onChangePriceTier: jest.fn(),
    });
    expect(screen.getByRole("button", { name: "Precio público" })).toBeInTheDocument();
  });

  it("calls onChangePriceTier when the trigger is clicked", async () => {
    const onChangePriceTier = jest.fn();
    renderRow({
      line: makeLine({ productId: "prod-1", priceName: "Precio público" }),
      onChangePriceTier,
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Precio público" }));
    expect(onChangePriceTier).toHaveBeenCalledTimes(1);
  });

  it("shows 'Elegir precio' placeholder when the catalog line has no priceName yet", () => {
    renderRow({
      line: makeLine({ productId: "prod-1", priceName: null }),
      onChangePriceTier: jest.fn(),
    });
    expect(screen.getByRole("button", { name: "Elegir precio" })).toBeInTheDocument();
  });

  it("does NOT render the price-tier trigger for free lines (no productId)", () => {
    renderRow({ line: makeLine({ productId: null }), onChangePriceTier: undefined });
    expect(screen.queryByRole("button", { name: /precio|elegir/i })).not.toBeInTheDocument();
  });
});

describe("PartialInvoiceLineRow — NumField clearable inputs", () => {
  it("allows clearing the price field completely while editing (no forced 0 mid-keystroke)", async () => {
    const { onUpdate } = renderRow({ line: makeLine({ unitPrice: 100 }) });
    const priceInput = screen.getByPlaceholderText("0.00");
    const user = userEvent.setup();
    await user.clear(priceInput);
    expect(priceInput).toHaveValue("");
    // onUpdate must not have been called with 0 as a side effect of clearing.
    expect(onUpdate).not.toHaveBeenCalledWith({ unitPrice: 0 });
  });

  it("normalizes an empty price field to 0 only on blur", async () => {
    const { onUpdate } = renderRow({ line: makeLine({ unitPrice: 100 }) });
    const priceInput = screen.getByPlaceholderText("0.00");
    const user = userEvent.setup();
    await user.clear(priceInput);
    await user.tab();
    expect(onUpdate).toHaveBeenCalledWith({ unitPrice: 0 });
  });

  it("allows typing a decimal quantity digit by digit without a min-clamp interrupting it", async () => {
    const { onUpdate } = renderRow({ line: makeLine({ quantity: 1 }) });
    const qtyInput = screen.getByPlaceholderText("1");
    const user = userEvent.setup();
    await user.clear(qtyInput);
    await user.type(qtyInput, "0.5");
    expect(qtyInput).toHaveValue("0.5");
    expect(onUpdate).toHaveBeenLastCalledWith({ quantity: 0.5 });
  });

  it("writing a new value works without first deleting a persistent 0", async () => {
    const { onUpdate } = renderRow({ line: makeLine({ unitPrice: 100 }) });
    const priceInput = screen.getByPlaceholderText("0.00");
    const user = userEvent.setup();
    await user.clear(priceInput);
    await user.type(priceInput, "150");
    expect(priceInput).toHaveValue("150");
    expect(onUpdate).toHaveBeenLastCalledWith({ unitPrice: 150 });
  });
});
