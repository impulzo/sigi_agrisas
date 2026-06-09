import React from "react";
import { render, screen } from "@testing-library/react";
import { InventoryTable } from "../../../../../app/(private)/inventory/_blocks/InventoryTable";
import type { InventoryItem } from "../../../../../app/(private)/inventory/_logic/types/domain";

const ITEMS: InventoryItem[] = [
  {
    id: "i1",
    branchId: "b1",
    productId: "p1",
    productCode: "PROD_01",
    productName: "Maíz Blanco",
    quantity: 100,
    reservedQuantity: 10,
    reorderPoint: 20,
    updatedAt: new Date("2026-05-20"),
  },
  {
    id: "i2",
    branchId: "b1",
    productId: "p2",
    productCode: "PROD_02",
    productName: "Fertilizante",
    quantity: 5,
    reservedQuantity: 0,
    reorderPoint: 50,
    updatedAt: new Date("2026-05-20"),
  },
];

describe("InventoryTable", () => {
  it("renderiza código y nombre de producto", () => {
    render(
      <InventoryTable items={ITEMS} canWrite={false} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    expect(screen.getByText("PROD_01")).toBeInTheDocument();
    expect(screen.getByText("Maíz Blanco")).toBeInTheDocument();
  });

  it("calcula 'Disponible' como cantidad - reservado", () => {
    render(
      <InventoryTable items={[ITEMS[0]]} canWrite={false} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    expect(screen.getByText("90")).toBeInTheDocument();
  });

  it("fila low-stock (quantity < reorderPoint) tiene fondo de error", () => {
    const { container } = render(
      <InventoryTable items={ITEMS} canWrite={false} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0].className).not.toContain("bg-error-container");
    expect(rows[1].className).toContain("bg-error-container");
  });

  it("oculta columna Acciones cuando canWrite=false", () => {
    render(
      <InventoryTable items={ITEMS} canWrite={false} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    expect(screen.queryByTitle("Ajustar stock")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Editar registro")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Quitar de sucursal")).not.toBeInTheDocument();
  });

  it("muestra botones de acción cuando canWrite=true", () => {
    render(
      <InventoryTable items={ITEMS} canWrite={true} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    expect(screen.getAllByTitle("Editar registro").length).toBe(2);
    expect(screen.getAllByTitle("Quitar de sucursal").length).toBe(2);
  });

  it("disponible negativo se colorea con text-error", () => {
    const negativeItem: InventoryItem = {
      ...ITEMS[0],
      id: "i3",
      productId: "p3",
      quantity: 5,
      reservedQuantity: 10,
    };
    const { container } = render(
      <InventoryTable items={[negativeItem]} canWrite={false} onAdjust={jest.fn()} onEdit={jest.fn()} onRemove={jest.fn()} />
    );
    const cells = container.querySelectorAll("td");
    const availableCell = Array.from(cells).find((c) => c.textContent === "-5");
    expect(availableCell?.className).toContain("text-error");
  });
});
