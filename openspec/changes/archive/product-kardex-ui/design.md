## Context

### ProductDetailPage — estructura actual

```
app/(private)/catalogs/products/_blocks/ProductDetailPage.tsx
├── useState<Tab>("general")  → "general" | "prices" | "dosifications"
├── Tab buttons (inline)
└── Condicionales:
    {tab === "general"        && <ProductGeneralTab    product={...} />}
    {tab === "prices"         && <ProductPricesTab     productId={...} canWrite={...} />}
    {tab === "dosifications"  && <ProductDosificationsTab productId={...} canWrite={...} />}
```

La nueva tab `"kardex"` se añade al final del array `tabs` y como condicional extra.

### Servicios existentes reutilizables

- `app/(private)/catalogs/_blocks/CatalogPagination.tsx` — paginación estándar.
- `app/(private)/catalogs/_blocks/CatalogEmpty.tsx` — estado vacío.
- `app/(private)/catalogs/_blocks/CatalogError.tsx` — estado de error.
- `app/_hooks/useHeadquarters.ts` — obtiene la sucursal matriz (para saber si mostrar el filtro de sucursales).
- `app/_hooks/useCurrentUser.ts` — `can("branches:access_all")` para mostrar/ocultar filtro de sucursal.

### Convenciones del módulo

- `_logic/hooks/` — hooks acoplados al feature (fetch, estado, navegación).
- `_logic/services/` — encapsulan `fetch`, normalizan errores, aceptan `fetchImpl?`.
- `_logic/types/` — DTOs de API (`api.ts`) y tipos de dominio frontend (`domain.ts`).
- No hay `useState` en `ProductKardexTab`; toda la lógica en `useProductKardex`.

## Goals / Non-Goals

**Goals:**
- Mostrar Kardex completo del producto dentro del detalle existente, sin navegación extra.
- Filtrar por sucursal (solo admin con `branches:access_all`) y rango de fechas.
- Diferenciar visualmente venta vs. devolución con badges de color.
- Linking a la venta (`/sales/[saleId]`) desde cualquier tipo de ítem.

**Non-Goals:**
- Exportación CSV/PDF (change futuro).
- Gráfica de evolución de ventas.
- Ordenación manual por columna (siempre fecha DESC desde backend).
- Filtro de estado (venta/devolución/cancelado — quedan excluidos por defecto en backend).

## Decisions

### 1. Tab integrada vs. página separada

**Decisión**: 4ta tab en `ProductDetailPage`, no ruta nueva `/catalogs/products/[id]/kardex`.

**Por qué**: El usuario ya está en el detalle del producto; navegar a otra ruta rompe el contexto. Los 3 tabs existentes comparten el `product` object cargado por el padre; el Kardex sólo necesita `productId`, que ya está disponible.

**Alternativa descartada**: ruta `/kardex` separada. Rechazado: duplica la cabecera del producto, añade una URL más al sitemap sin ganancia funcional.

### 2. Filtro de sucursales — sólo con bypass

**Decisión**: el dropdown de sucursal sólo se renderiza cuando `can("branches:access_all") === true`. Sin bypass, el hook pasa `branchId` implícito (viene del branch scoping del backend).

**Por qué**: operadores sólo ven su sucursal; mostrarles el dropdown es confuso y el backend rechazaría peticiones a otras sucursales de todos modos. Consistente con el patrón de `/sales`.

### 3. Fechas — inputs `<input type="date">` nativos

**Decisión**: dos inputs de fecha native HTML sin dependencia externa. `from` y `to` se envían como ISO date string (`YYYY-MM-DD`); el backend los interpreta como `>= from 00:00 UTC` y `<= to 23:59:59 UTC` (esto ya lo hace la query SQL existente con `<=` sobre `created_at`).

**Alternativa descartada**: `react-datepicker`. Rechazado: dependencia extra; para un filtro sencillo los inputs nativos son suficientes y accesibles.

## Estructura de archivos

```
app/(private)/catalogs/products/
├── _blocks/
│   ├── ProductDetailPage.tsx        (MODIFICAR — añadir tab "kardex")
│   └── ProductKardexTab.tsx         (NUEVO)
└── _logic/
    ├── hooks/
    │   └── useProductKardex.ts      (NUEVO)
    ├── services/
    │   └── getProductKardex.ts      (NUEVO)
    └── types/
        └── kardex.ts                (NUEVO)
```

## API del servicio

```typescript
// _logic/services/getProductKardex.ts
export interface GetProductKardexParams {
  productId: string;
  page: number;
  pageSize: number;
  branchId?: string;
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
  fetchImpl?: typeof fetch;
}

export async function getProductKardex(params: GetProductKardexParams): Promise<KardexPageDto>
```

Llama a `GET /api/v1/admin/products/:productId/kardex` con `authFetch`. Lanza `UnauthenticatedError` (401), `ForbiddenError` (403). Normaliza errores HTTP a `Error`.

## Hook

```typescript
// _logic/hooks/useProductKardex.ts
export function useProductKardex(productId: string) {
  const [page, setPage] = useState(1);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [data, setData] = useState<KardexPageDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { /* fetch */ }, [productId, page, branchId, from, to]);

  return { data, isLoading, error, page, setPage, branchId, setBranchId, from, setFrom, to, setTo };
}
```

## Tipos

```typescript
// _logic/types/kardex.ts
export interface KardexSaleItem {
  type: 'sale';
  date: string;
  branchId: string;
  branchName: string;
  folioCode: string;
  saleId: string;
  saleItemId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  saleStatus: 'completed' | 'edited';
}

export interface KardexReturnItem {
  type: 'return';
  date: string;
  branchId: string;
  branchName: string;
  returnId: string;
  returnItemId: string;
  saleId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  returnStatus: 'completed';
}

export type KardexItem = KardexSaleItem | KardexReturnItem;

export interface KardexPageDto {
  productId: string;
  productCode: string;
  productName: string;
  items: KardexItem[];
  total: number;
  page: number;
  pageSize: number;
}
```

## Layout de `ProductKardexTab`

```
┌──────────────────────────────────────────────────────┐
│  Filtros:  [Sucursal ▼] [Desde ____-__-__] [Hasta]   │  ← solo branchId si bypass
├──────────────────────────────────────────────────────┤
│  Tipo    │ Fecha      │ Folio/Ref │ Sucursal │ Cant. │ P.Unit │ Total │ Estado │
├──────────┼────────────┼──────────-┼──────────┼───────┼────────┼───────┼────────┤
│ [Venta]  │ 15/06/2026 │ TK-0042   │ Matriz   │ 5.00  │ 120.00 │696.00 │ ✓      │
│ [Devol.] │ 16/06/2026 │ —         │ Matriz   │ 1.00  │ 120.00 │139.20 │ ✓      │
└──────────────────────────────────────────────────────┘
              [ < 1 2 3 … > ]
```

Badge "Venta": `bg-primary-container text-on-primary-container rounded px-2 py-0.5 text-xs`.
Badge "Devolución": `bg-error-container text-on-error-container rounded px-2 py-0.5 text-xs`.
Folio es `<Link href="/sales/[saleId]">` para ambos tipos (sale y return comparten `saleId`).
Cantidad formateada a 2 decimales. Precios con `formatCurrency`.

## Integración en `ProductDetailPage`

```typescript
type Tab = "general" | "prices" | "dosifications" | "kardex";  // añadir "kardex"

const tabs = [
  { id: "general",        label: "General" },
  { id: "prices",         label: "Precios" },
  { id: "dosifications",  label: "Dosificaciones" },
  { id: "kardex",         label: "Kardex" },   // NUEVO
];

// En el render:
{tab === "kardex" && <ProductKardexTab productId={product.id} />}
```
