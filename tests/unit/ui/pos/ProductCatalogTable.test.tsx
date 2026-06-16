/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCatalogTable } from "../../../../app/(private)/pos/_blocks/ProductCatalogTable";
import type { ProductDto } from "../../../../app/(private)/pos/_logic/types/api";

const makeProduct = (n: number): ProductDto => ({
  id: `prod-${n}`,
  code: `P00${n}`,
  name: `Producto ${n}`,
  ivaRate: 0.16,
  iepsRate: null,
  isActive: true,
  departmentId: "dept-1",
  departmentName: `Depto ${n}`,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const items = [makeProduct(1), makeProduct(2), makeProduct(3)];

describe("ProductCatalogTable", () => {
  it("renders product rows", () => {
    render(
      <ProductCatalogTable
        items={items} total={3} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={jest.fn()} onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.getByText("Producto 2")).toBeInTheDocument();
  });

  it("shows spinner when loading", () => {
    render(
      <ProductCatalogTable
        items={[]} total={0} page={1} pageSize={20}
        isLoading={true} error={null}
        onAddProduct={jest.fn()} onPageChange={jest.fn()}
      />
    );
    expect(document.querySelector("[class*=animate]") || document.querySelector("svg")).toBeTruthy();
  });

  it("shows empty message when no items", () => {
    render(
      <ProductCatalogTable
        items={[]} total={0} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={jest.fn()} onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText(/sin productos/i)).toBeInTheDocument();
  });

  it("calls onAddProduct when row is clicked", async () => {
    const onAdd = jest.fn();
    const user = userEvent.setup();
    render(
      <ProductCatalogTable
        items={items} total={3} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={onAdd} onPageChange={jest.fn()}
      />
    );
    await user.click(screen.getByText("Producto 1").closest("tr")!);
    expect(onAdd).toHaveBeenCalledWith(items[0]);
  });

  it("shows pagination when totalPages > 1", () => {
    render(
      <ProductCatalogTable
        items={items} total={30} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={jest.fn()} onPageChange={jest.fn()}
      />
    );
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("does not show pagination when items fit one page", () => {
    render(
      <ProductCatalogTable
        items={items} total={3} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={jest.fn()} onPageChange={jest.fn()}
      />
    );
    expect(screen.queryByText(/\//)).toBeNull();
  });

  it("calls onPageChange when next button clicked", async () => {
    const onPageChange = jest.fn();
    const user = userEvent.setup();
    render(
      <ProductCatalogTable
        items={items} total={40} page={1} pageSize={20}
        isLoading={false} error={null}
        onAddProduct={jest.fn()} onPageChange={onPageChange}
      />
    );
    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons[buttons.length - 1];
    await user.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
