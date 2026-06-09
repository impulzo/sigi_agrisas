import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { StockReportResponseDto, StockBranchDto, StockDepartmentDto } from "../../application/dto/StockReportResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

function DeptTable({ dept }: { dept: StockDepartmentDto }) {
  return (
    <View>
      <Text style={s.departmentTitle}>{dept.departmentName} ({dept.departmentCode})</Text>
      <View style={s.tableHeader}>
        <Text style={s.cell}>Código</Text>
        <Text style={s.cellWide}>Producto</Text>
        <Text style={s.cellNarrow}>Unidad</Text>
        <Text style={s.cellNarrow}>Stock</Text>
        <Text style={s.cellNarrow}>Reservado</Text>
        <Text style={s.cellNarrow}>Disponible</Text>
        <Text style={s.cellNarrow}>Reorden</Text>
        <Text style={s.cellNarrow}>Estado</Text>
      </View>
      {dept.products.map((p, i) => (
        <View key={p.productId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
          <Text style={s.cell}>{p.code}</Text>
          <Text style={s.cellWide}>{p.name}</Text>
          <Text style={s.cellNarrow}>{p.unit}</Text>
          <Text style={s.cellNarrow}>{p.quantity}</Text>
          <Text style={s.cellNarrow}>{p.reservedQuantity}</Text>
          <Text style={s.cellNarrow}>{p.availableQuantity}</Text>
          <Text style={s.cellNarrow}>{p.reorderPoint}</Text>
          <Text style={[s.cellNarrow, p.isBelowReorder ? s.badge : {}]}>
            {p.isBelowReorder ? "Bajo" : "OK"}
          </Text>
        </View>
      ))}
      <View style={s.subtotal}>
        <Text style={s.cellWide}>Subtotal depto.</Text>
        <Text style={s.cell}>{dept.subtotal.productCount} productos</Text>
        <Text style={s.cell}>Total: {dept.subtotal.totalQuantity}</Text>
      </View>
    </View>
  );
}

function BranchSection({ branch }: { branch: StockBranchDto }) {
  return (
    <View style={s.section}>
      <Text style={s.branchTitle}>
        {branch.branchCode} — {branch.branchName}
        {branch.isHeadquarters ? "  [Matriz]" : ""}
      </Text>
      {branch.departments.map((dept) => (
        <DeptTable key={dept.departmentId} dept={dept} />
      ))}
      <View style={s.subtotal}>
        <Text style={s.cellWide}>Subtotal sucursal</Text>
        <Text style={s.cell}>{branch.subtotal.departmentCount} depts.</Text>
        <Text style={s.cell}>{branch.subtotal.productCount} productos</Text>
        <Text style={s.cell}>Total: {branch.subtotal.totalQuantity}</Text>
      </View>
    </View>
  );
}

export function InventoryStockReportPdf({ data }: { data: StockReportResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Reporte de Stock</Text>
          <Text style={s.headerMeta}>Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}</Text>
          <Text style={s.headerMeta}>
            Filtros: sucursal={data.filters.branchId ?? "todas"} | depto={data.filters.departmentId ?? "todos"} | cero stock={data.filters.includeZeroStock ? "incluido" : "excluido"}
          </Text>
        </View>

        {data.branches.length === 0 ? (
          <Text style={s.emptyMessage}>Sin datos para los filtros aplicados</Text>
        ) : (
          data.branches.map((branch) => (
            <BranchSection key={branch.branchId} branch={branch} />
          ))
        )}

        <View style={s.totals}>
          <Text>Totales globales</Text>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Sucursales</Text>
            <Text style={s.totalsValue}>{data.totals.branchCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Departamentos</Text>
            <Text style={s.totalsValue}>{data.totals.departmentCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Productos</Text>
            <Text style={s.totalsValue}>{data.totals.productCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Cantidad total</Text>
            <Text style={s.totalsValue}>{data.totals.totalQuantity}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{data.generatedBy.email}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
