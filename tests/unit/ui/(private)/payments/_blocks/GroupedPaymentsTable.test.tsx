/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GroupedPaymentsTable } from "../../../../../../app/(private)/payments/_blocks/GroupedPaymentsTable";
import { groupPaymentsBySale, GroupablePayment } from "../../../../../../app/(private)/payments/_logic/lib/groupPaymentsBySale";

interface Row extends GroupablePayment {
  amount: number;
}

function makeItems(): Row[] {
  return [
    { id: "p1", saleId: "s1", saleFolioCode: "VNT-000001", customerName: "Cliente A", saleTotal: 1000, saleDueAmount: 700, salePaymentStatus: "partial", amount: 300 },
    { id: "p2", saleId: "s1", saleFolioCode: "VNT-000001", customerName: "Cliente A", saleTotal: 1000, saleDueAmount: 700, salePaymentStatus: "partial", amount: 200 },
  ];
}

describe("GroupedPaymentsTable", () => {
  it("muestra la fila de skeleton mientras carga", () => {
    const { container } = render(
      <GroupedPaymentsTable<Row>
        groups={[]}
        isLoading
        columnCount={3}
        headerRow={<tr />}
        renderPaymentRow={() => null}
      />
    );
    expect(container.querySelectorAll("table")).toHaveLength(0);
  });

  it("no renderiza nada cuando no hay grupos", () => {
    const { container } = render(
      <GroupedPaymentsTable<Row>
        groups={[]}
        isLoading={false}
        columnCount={3}
        headerRow={<tr />}
        renderPaymentRow={() => null}
      />
    );
    expect(container.querySelectorAll("table")).toHaveLength(0);
  });

  it("renderiza la fila padre del ticket colapsada por default", () => {
    const groups = groupPaymentsBySale(makeItems());
    render(
      <GroupedPaymentsTable<Row>
        groups={groups}
        isLoading={false}
        columnCount={3}
        headerRow={<tr><th>Col</th></tr>}
        renderPaymentRow={(p) => <tr key={p.id}><td>{p.id}</td></tr>}
      />
    );
    expect(screen.getByText("VNT-000001")).toBeInTheDocument();
    expect(screen.getByText("2 abonos")).toBeInTheDocument();
    expect(screen.queryByText("p1")).not.toBeInTheDocument();
  });

  it("expande el grupo al hacer click y muestra sus abonos", () => {
    const groups = groupPaymentsBySale(makeItems());
    render(
      <GroupedPaymentsTable<Row>
        groups={groups}
        isLoading={false}
        columnCount={3}
        headerRow={<tr><th>Col</th></tr>}
        renderPaymentRow={(p) => <tr key={p.id}><td>{p.id}</td></tr>}
      />
    );
    fireEvent.click(screen.getByText("VNT-000001"));
    expect(screen.getByText("p1")).toBeInTheDocument();
    expect(screen.getByText("p2")).toBeInTheDocument();
  });
});
