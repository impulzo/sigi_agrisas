import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  DepartmentPriceListResponseDto,
  DepartmentPriceListDepartmentDto,
  DepartmentProductDto,
} from "../../application/dto/DepartmentPriceListResponseDto";
import { pdfStyles as s } from "./pdfStyles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" });
}

function PriceRows({ product }: { product: DepartmentProductDto }) {
  return (
    <View style={s.section}>
      <Text style={s.departmentTitle}>
        {product.code} — {product.name} ({product.unit})
      </Text>
      {product.prices.length === 0 ? (
        <View style={s.tableRow}>
          <Text style={s.cellWide}>Sin listas de precio</Text>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cellWide}>Lista</Text>
            <Text style={s.cellNarrow}>Precio</Text>
            <Text style={s.cellNarrow}>Cant. mín</Text>
            <Text style={s.cellNarrow}>% Descto</Text>
            <Text style={s.cellNarrow}>Default</Text>
          </View>
          {product.prices.map((p, i) => (
            <View key={p.priceId} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.cellWide}>{p.name}</Text>
              <Text style={s.cellNarrow}>{p.price}</Text>
              <Text style={s.cellNarrow}>{p.minQuantity}</Text>
              <Text style={s.cellNarrow}>{p.discountPct ?? "—"}</Text>
              <Text style={s.cellNarrow}>{p.isDefault ? "Sí" : "No"}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function DeptSection({ dept }: { dept: DepartmentPriceListDepartmentDto }) {
  return (
    <View style={s.section}>
      <Text style={s.branchTitle}>
        {dept.departmentCode} — {dept.departmentName}
      </Text>
      {dept.products.map((product) => (
        <PriceRows key={product.productId} product={product} />
      ))}
      <View style={s.subtotal}>
        <Text style={s.cellWide}>Subtotal depto.</Text>
        <Text style={s.cell}>{dept.subtotal.productCount} productos</Text>
        <Text style={s.cell}>{dept.subtotal.priceCount} precios</Text>
      </View>
    </View>
  );
}

export function DepartmentPriceListReportPdf({ data }: { data: DepartmentPriceListResponseDto }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerTitle}>Inventario por Departamento</Text>
          <Text style={s.headerMeta}>Generado: {formatDate(data.generatedAt)} | Por: {data.generatedBy.email}</Text>
          <Text style={s.headerMeta}>
            Filtros: depto={data.filters.departmentId ?? "todos"}
          </Text>
        </View>

        {data.departments.length === 0 ? (
          <Text style={s.emptyMessage}>Sin datos para los filtros aplicados</Text>
        ) : (
          data.departments.map((dept) => (
            <DeptSection key={dept.departmentId} dept={dept} />
          ))
        )}

        <View style={s.totals}>
          <Text>Totales globales</Text>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Departamentos</Text>
            <Text style={s.totalsValue}>{data.totals.departmentCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Productos</Text>
            <Text style={s.totalsValue}>{data.totals.productCount}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Listas de precio</Text>
            <Text style={s.totalsValue}>{data.totals.priceCount}</Text>
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
