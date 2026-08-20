import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  DepartmentPriceListResponseDto,
  DepartmentPriceListDepartmentDto,
  DepartmentProductDto,
} from "../../application/dto/DepartmentPriceListResponseDto";
import { priceColumnNames } from "../../domain/services/priceColumnNames";
import { pdfStyles as s } from "./pdfStyles";
import { formatDate } from "@/shared/infrastructure/formatters/formatDate";

function money(v: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(v));
}

function ProductRow({ product, priceCols }: { product: DepartmentProductDto; priceCols: string[] }) {
  return (
    <View style={s.tableRow}>
      <Text style={s.cell}>{product.code}</Text>
      <Text style={s.cellWide}>{product.name}</Text>
      <Text style={s.cellNarrow}>{product.unitDescription ?? product.unit}</Text>
      <Text style={s.cellNarrow}>{product.stockQuantity}</Text>
      <Text style={s.cellNarrow}>{product.acquisitionPrice ? money(product.acquisitionPrice) : "—"}</Text>
      {priceCols.map((name) => {
        const price = product.prices.find((p) => p.name === name);
        return (
          <Text key={name} style={s.cell}>
            {price ? money(price.price) : "—"}
          </Text>
        );
      })}
    </View>
  );
}

function DeptSection({ dept }: { dept: DepartmentPriceListDepartmentDto }) {
  const priceCols = priceColumnNames([dept]);
  return (
    <View style={s.section}>
      <Text style={s.branchTitle}>
        {dept.departmentCode} — {dept.departmentName}
      </Text>
      {dept.products.length === 0 ? (
        <Text style={s.emptyMessage}>Sin productos</Text>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={s.cell}>Código</Text>
            <Text style={s.cellWide}>Producto</Text>
            <Text style={s.cellNarrow}>Unidad</Text>
            <Text style={s.cellNarrow}>Stock</Text>
            <Text style={s.cellNarrow}>Costo Adq.</Text>
            {priceCols.map((name) => (
              <Text key={name} style={s.cell}>{name}</Text>
            ))}
          </View>
          {dept.products.map((product) => (
            <ProductRow key={product.productId} product={product} priceCols={priceCols} />
          ))}
        </>
      )}
      <View style={s.subtotal}>
        <Text style={s.cellWide}>Subtotal depto.</Text>
        <Text style={s.cell}>{dept.subtotal.productCount} productos</Text>
        <Text style={s.cell}>{dept.subtotal.priceCount} precios</Text>
        <Text style={s.cell}>Stock: {dept.subtotal.totalStock}</Text>
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
            Filtros: depto={data.filters.departmentId ?? "todos"} | sucursal={data.filters.branchId ?? "todas"}
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
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Stock total</Text>
            <Text style={s.totalsValue}>{data.totals.totalStock}</Text>
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
