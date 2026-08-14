"use client";

import { Table, THead, TBody, Tr, Th, Td } from "../../../../_components/molecules/DataTable";
import type { ProviderPaymentsReportRowDto } from "../_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function money(v: string): string {
  return MX.format(Number(v));
}
function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: "UTC" });
}

export function ProviderPaymentsTable({ rows }: { rows: ProviderPaymentsReportRowDto[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-low">
      <Table>
        <THead>
          <tr>
            <Th>Folio pago</Th>
            <Th>Folio compra</Th>
            <Th>Proveedor</Th>
            <Th>Sucursal</Th>
            <Th align="right">Monto</Th>
            <Th>Estado</Th>
            <Th>Fecha</Th>
          </tr>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={7} className="text-center text-on-surface-variant">Sin pagos a proveedores</Td>
            </tr>
          ) : (
            rows.map((r) => (
              <Tr key={r.id}>
                <Td>{r.folioCode}</Td>
                <Td>{r.purchaseFolioCode}</Td>
                <Td>{r.providerName ?? "—"}</Td>
                <Td>{r.branchName ?? "—"}</Td>
                <Td align="right">{money(r.amount)}</Td>
                <Td>{r.status}</Td>
                <Td>{dateOnly(r.paidAt)}</Td>
              </Tr>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
