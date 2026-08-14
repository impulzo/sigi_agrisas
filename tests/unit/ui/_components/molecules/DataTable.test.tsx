import React from "react";
import { render, screen } from "@testing-library/react";
import { Table, THead, TBody, Tr, Th, Td } from "../../../../../app/_components/molecules/DataTable";

describe("DataTable", () => {
  it("renders a full table with header and body rows", () => {
    render(
      <Table>
        <THead>
          <tr>
            <Th>Folio</Th>
            <Th align="right">Total</Th>
          </tr>
        </THead>
        <TBody>
          <Tr>
            <Td>VNT-000001</Td>
            <Td align="right">100.00</Td>
          </Tr>
        </TBody>
      </Table>
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Folio")).toBeInTheDocument();
    expect(screen.getByText("VNT-000001")).toBeInTheDocument();
  });

  it("Th applies the standard header typography classes", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th>Folio</Th>
          </tr>
        </thead>
      </table>
    );
    const th = screen.getByText("Folio");
    expect(th.className).toContain("text-label-sm");
    expect(th.className).toContain("uppercase");
  });

  it("align=right applies text-right and tabular-nums to Th and Td", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td align="right">100.00</Td>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText("Total").className).toContain("tabular-nums");
    expect(screen.getByText("100.00").className).toContain("text-right");
  });

  it("Td defaults to left alignment without tabular-nums", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Td>Cliente A</Td>
          </tr>
        </tbody>
      </table>
    );
    const td = screen.getByText("Cliente A");
    expect(td.className).not.toContain("text-right");
    expect(td.className).not.toContain("tabular-nums");
  });

  it("Table applies the standard body typography", () => {
    const { container } = render(<Table />);
    expect(container.querySelector("table")?.className).toContain("text-body-sm");
  });
});
