## Context

`DepartmentPriceListResponseDto` (`src/modules/reports/application/dto/DepartmentPriceListResponseDto.ts`) ya trae toda la data necesaria: `departments[].products[].prices[]` con `{ priceId, name, price, minQuantity, discountPct, isDefault }`. La UI (`InventoryPriceStockTable.tsx:18-28`) ya deriva el set de nombres de lista de precio y pivota; los exports no. Responde a la única fila de la Historia de Usuario en `proposal.md`.

## Goals / Non-Goals

**Goals:**
- PDF y XLSX muestran una fila por producto con columnas dinámicas por lista de precio, igual que la UI.
- Columnas de precio sin ancho fijo en el PDF, para que departamentos con muchas listas no desborden la página.
- Cero cambios de API/DTO/permisos.

**Non-Goals:**
- No se toca `InventoryPriceStockTable.tsx` — ya está correcto, es la fuente de verdad del comportamiento esperado.
- No se conserva en el pivote el detalle de `minQuantity`/`discountPct`/`isDefault` por precio — la UI tampoco los muestra en su tabla pivotada (solo el monto); los exports igualan la UI, no agregan detalle que la UI no tiene. Ese detalle sigue disponible vía `?format=json`.
- No se introduce paginación horizontal ni "columnas truncadas + ver más" — fuera de alcance para un reporte interno.

## Decisions

**D1 — Servicio de dominio compartido para PDF+XLSX, sin tocar la copia de la UI.**
`priceColumnNames()` se extrae a `src/modules/reports/domain/services/priceColumnNames.ts` (función pura: recibe `DepartmentPriceListDepartmentDto[]`, devuelve `string[]` ordenado con `localeCompare("es-MX")` — mismo criterio que la UI). La reusan `DepartmentPriceListReportPdf.tsx` y `buildDepartmentPriceListWorkbook.ts` (ambos ya viven en `src/modules/reports/infrastructure/`, mismo módulo backend — sin problema de capas).

La copia ya existente en `InventoryPriceStockTable.tsx:18` **se mantiene sin tocar, duplicada**. El proyecto ya establece esta convención explícitamente: `computeTotalsClient.ts` documenta "port puro del `SaleTotalsCalculator`... No depende de `src/modules/` (Prisma) en cliente". Hacer que `app/` importe de `src/modules/reports/domain/` rompería esa separación cliente/servidor por un helper de 10 líneas — la duplicación acotada es la opción consistente con el resto del código, no una desviación.

**D2 — PDF: layout `flex: 1` en columnas de precio, sin ancho fijo (`cellNarrow`/width numérico).**
Alternativa descartada: calcular un ancho fijo por columna (`availableWidth / N`) con un tope de columnas y fallback al layout anidado actual para departamentos con demasiadas listas. Rechazada por complejidad — dos rutas de render distintas para un caso límite improbable. `flex: 1` dentro de una `View` con `flexDirection: "row"` (mismo patrón que `tableHeader`/`tableRow` en `pdfStyles.ts`) hace que react-pdf reparta el ancho disponible entre todas las columnas de precio automáticamente: con pocas listas las columnas son anchas, con muchas se angostan, pero **nunca desbordan la página** porque flexbox no permite que la suma de flex exceda el contenedor. Cero código de "modo overflow" necesario.

**D3 — XLSX: una fila por producto, valor `"—"` (no celda vacía) cuando el producto no tiene esa lista.**
Consistente con el resto de los exports XLSX del proyecto (ej. `buildDepartmentPriceListWorkbook.ts` actual ya usa `"—"` para "Sin listas de precio"), y con el AC de la Historia de Usuario que pide explícitamente ese símbolo.

**D4 — Encabezado de columnas dinámico por departamento (Global también).**
En la vista "Global" (sin `departmentId`), cada departamento puede tener un set distinto de listas de precio. El pivote se calcula **por departamento**, no globalmente — cada sección de departamento en el PDF/XLSX tiene sus propias columnas dinámicas, igual que la UI (`priceColumnNames(departments)` en la UI en realidad calcula sobre TODOS los departamentos pasados — mismo criterio se replica aquí para consistencia exacta con lo ya visible en pantalla).

## Risks / Trade-offs

- **[Riesgo]** Con `flex: 1`, un departamento con muchísimas listas de precio (ej. 20+) podría volver el texto de cada celda demasiado angosto para ser legible en PDF. → **Mitigación:** aceptado — es un caso extremo no observado en los datos reales del cliente (departamentos típicos tienen 2-5 listas de precio); si ocurre, el JSON sigue disponible con el detalle completo. No se sobre-diseña para un caso hipotético.
- **[Riesgo]** XLSX pierde columnas `Cant. Mín`/`% Descto`/`Default` que el formato anterior sí tenía. → **Mitigación:** decisión explícita (D-Non-Goals) — el pedido del cliente es "precios en columnas" igual que la UI, que tampoco muestra ese detalle. Trade-off aceptado a favor de paridad UI↔export.

## Migration Plan

No aplica — cambio de solo presentación en 2 exports backend, sin migración de datos, DTO, ni flag de despliegue.
