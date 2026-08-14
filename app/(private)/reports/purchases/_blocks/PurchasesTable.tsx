"use client";

import { Table, THead, TBody, Tr, Th, Td } from "../../../../_components/molecules/DataTable";
import type { PurchasesReportRowDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function money(v: string): string {
  return MX.format(Number(v));
}
function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC" });
}

export function PurchasesTable({ rows }: { rows: PurchasesReportRowDto[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-low">
      <Table>
        <THead>
          <tr>
            <Th>Folio</Th>
            <Th>Proveedor</Th>
            <Th>Sucursal</Th>
            <Th align="right">Subtotal</Th>
            <Th align="right">Impuestos</Th>
            <Th align="right">Total</Th>
            <Th align="right">Pagado</Th>
            <Th>Estado pago</Th>
            <Th>Estado</Th>
            <Th>Fecha</Th>
          </tr>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={10} className="text-center text-on-surface-variant">Sin compras</Td>
            </tr>
          ) : (
            rows.map((r) => (
              <Tr key={r.id}>
                <Td>{r.folioCode}</Td>
                <Td>{r.providerName ?? "—"}</Td>
                <Td>{r.branchName ?? "—"}</Td>
                <Td align="right">{money(r.subtotal)}</Td>
                <Td align="right">{money(r.taxTotal)}</Td>
                <Td align="right">{money(r.total)}</Td>
                <Td align="right">{money(r.paidAmount)}</Td>
                <Td>{r.paymentStatus}</Td>
                <Td>{r.status}</Td>
                <Td>{dateOnly(r.purchasedAt)}</Td>
              </Tr>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
