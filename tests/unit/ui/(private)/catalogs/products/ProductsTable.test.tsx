import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import { ProductsTable } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductsTable";
import type { Product } from "../../../../../../app/(private)/catalogs/products/_logic/types/domain";

const PRODUCTS: Product[] = [
  {
    id: "p1",
    code: "PROD_01",
    name: "Maíz Blanco",
    unit: "kg",
    satProductCode: null,
    departmentId: "d1",
    departmentName: "Agrícola",
    ivaRate: 0.16,
    iepsRate: null,
    isActive: true,
    createdAt: new Date("2026-05-01"),
    updatedAt: new Date("2026-05-01"),
  },
  {
    id: "p2",
    code: "PROD_02",
    name: "Fertilizante",
    unit: "lt",
    satProductCode: null,
    departmentId: "d1",
    departmentName: "Agrícola",
    ivaRate: null,
    iepsRate: 0.08,
    isActive: false,
    createdAt: new Date("2026-05-10"),
    updatedAt: new Date("2026-05-10"),
  },
];

describe("ProductsTable", () => {
  it("renderiza código, nombre y departamento", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("PROD_01")).toBeInTheDocument();
    expect(screen.getByText("Maíz Blanco")).toBeInTheDocument();
    expect(screen.getAllByText("Agrícola").length).toBeGreaterThanOrEqual(1);
  });

  it("formatea IVA como porcentaje (0.16 → '16%')", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getByText("16%")).toBeInTheDocument();
  });

  it("muestra '—' cuando ivaRate o iepsRate es null", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("'Gestionar' siempre visible con products:read", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getAllByText("Gestionar").length).toBe(2);
  });

  it("oculta botones Editar/Desactivar cuando canWrite=false", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.queryByTitle("Editar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Desactivar")).not.toBeInTheDocument();
  });

  it("muestra botones Editar y Desactivar/Reactivar cuando canWrite=true", () => {
    render(
      <ProductsTable
        items={PRODUCTS}
        canWrite={true}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    expect(screen.getAllByTitle("Editar").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTitle("Desactivar")).toBeInTheDocument();
    expect(screen.getByTitle("Reactivar")).toBeInTheDocument();
  });

  it("link Gestionar apunta a /catalogs/products/:id", () => {
    render(
      <ProductsTable
        items={[PRODUCTS[0]]}
        canWrite={false}
        onEdit={jest.fn()}
        onManage={jest.fn()}
        onDelete={jest.fn()}
        onReactivate={jest.fn()}
      />
    );
    const link = screen.getByText("Gestionar").closest("a")!;
    expect(link).toHaveAttribute("href", "/catalogs/products/p1");
  });
});
