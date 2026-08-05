## 1. Historia 1 — Ocultar botón "Editar venta"

- [x] 1.1 En `app/(private)/sales/_blocks/SaleDetailPage.tsx`, agregar constante `SALE_EDIT_UI_ENABLED = false` a nivel de módulo.
- [x] 1.2 Envolver el bloque JSX del botón "Editar venta" (junto al `canEdit` existente) con `SALE_EDIT_UI_ENABLED && canEdit && ...`, sin tocar `canEditCompleted`/`isBypass`/`isInHq`/`canEdit`.
- [x] 1.3 Verificado en vivo con Playwright (navegación client-side + `document.createElement('a')` con href al edit route, ya que el botón fue removido): `/sales/:id/edit` carga correctamente ("Editar venta" title, catálogo con columna Existencias funcionando, banner "Estás editando una venta ya emitida — folio 7") — funcionalidad intacta.

## 2. Historia 2 — Existencias por producto en catálogo POS

- [x] 2.1 Backend: extender el query schema Zod de `ProductsController` (`GET /products`) con `branchId: z.string().uuid().optional()`.
- [x] 2.2 Backend: propagar `branchId` a través de `ListProductsUseCase` / `ListProductsRequest`.
- [x] 2.3 Backend: en `PrismaProductRepository.findAll`, cuando llega `branchId`, incluir `inventory` filtrado por `branchId` (relación `Product.inventory`); extraer `quantity` del registro único `(branchId, productId)`.
- [x] 2.4 Backend: agregar campo `stock: number | null` a `ProductDto` y poblarlo en `toProductDto` (`null` sin `branchId` o sin registro de inventario).
- [x] 2.5 Frontend: agregar `stock: number | null` al `ProductDto` de `app/(private)/pos/_logic/types/api.ts`.
- [x] 2.6 Frontend: mapear `stock` en `searchProducts.ts` (el `branchId` ya se envía, sólo falta que el backend lo use y el mapper lo lea).
- [x] 2.7 Frontend: agregar columna "Existencias" a `ProductCatalogTable.tsx` (header + celda); mostrar `stock ?? "—"`; resaltar en estilo de error cuando `stock <= 0`.

## 3. Historia 3 — Error al crear cotización

- [x] 3.1 Repro con Playwright (tras reinicio del dev server por el usuario, sano en `:3001`). Confirmados DOS bugs reales distintos:
  - **Bug A (edge case, UI)**: `CartPanel.tsx` invoca `canSubmitCart` sin pasar `selectedBranchId` — el submit del carrito del POS (modo Cotización) queda habilitado aunque un admin en bypass no haya elegido sucursal, enviando `branchId:""`. Confirmado en vivo: con folio+items pero sin sucursal, el botón "Crear cotización" queda `disabled`.
  - **Bug B (causa raíz real, backend, más frecuente)**: reproducido en vivo con IDs reales vía fetch directo → HTTP 500 `PrismaClientKnownRequestError` código `23502` (`not_null_violation`) en el INSERT crudo de `PrismaQuoteRepository.createWithItems`. La migración `20260626000001_make_sales_customer_optional` dice en su comentario "Make customer_id optional on sales **and quotes**" pero su SQL sólo alteró `sales` — `quotes.customer_id` seguía `NOT NULL` en la DB real (confirmado vía `information_schema.columns`), mientras `schema.prisma` (`customerId String?`) y el código (`CreateQuoteUseCase`, `PrismaQuoteRepository`, comentario explícito "Prisma client was generated before the NOT NULL constraint was dropped") ya asumían nullable. **Cualquier cotización sin cliente asignado (caso común, cliente mostrador) crasheaba con excepción no manejada** → 500/503 genérico visto por el usuario como "Network error". Esta es la causa raíz real y más frecuente del reporte "revisar error al crear cotización".
- [x] 3.2 En `app/(private)/quotes/_logic/services/createQuote.ts`, reemplazado el `throw new NetworkError()` de la rama 400 sin match por `QuoteCreateValidationError` (nuevo, en `errors.ts`) que preserva `err.error` como mensaje real.
- [x] 3.3a Fix Bug A: `canSubmitCart` ahora exige `!!selectedBranchId`; `CartPanel.tsx` y sus dos usos (`PosPage.tsx`, `EditSalePage.tsx`) actualizados para pasar la prop. Verificado en vivo.
- [x] 3.3b Fix Bug B: nueva migración `prisma/migrations/20260805000001_make_quotes_customer_optional/migration.sql` — `ALTER TABLE quotes ALTER COLUMN customer_id DROP NOT NULL` + FK `ON DELETE SET NULL` (alineado con `schema.prisma` y con el patrón de la migración hermana de `sales`). Aplicada contra la DB compartida (`prisma migrate deploy`) y `prisma generate` reejecutado. Confirmado con `information_schema.columns`: `customer_id` ahora `is_nullable: YES`.
- [x] 3.4 Verificado en vivo con Playwright end-to-end tras ambos fixes: cotización creada exitosamente sin cliente (folio COT-000002, sucursal Matriz, 1 ítem, total $127.60, "Cliente —"), redirect correcto a `/quotes/[id]`.

## 4. Historia 4 — Límite de crédito no bloqueante

- [x] 4.1 En `CreateSaleUseCase.ts`, quitar el `throw CustomerHasNoCreditLineError` y el `throw CreditLimitExceededError`; calcular flag `creditLimitExceeded` sin abortar la transacción (`false` cuando `creditLimit === null`).
- [x] 4.2 En `ConvertQuoteToSaleUseCase.ts`, aplicar la misma relajación + mismo cálculo del flag.
- [x] 4.3 Incluir `creditLimitExceeded: boolean` en la respuesta de `SalesController` (`POST /sales`, 201) y `QuotesController` (`POST /quotes/:id/convert`, 200).
- [x] 4.4 Frontend: en `app/(private)/pos/_logic/services/createSale.ts`, dejar de esperar 409 por crédito; parsear `creditLimitExceeded` del 201.
- [x] 4.5 Frontend: en el flujo de submit del POS, mostrar aviso adicional cuando `creditLimitExceeded === true` (implementado como banner en `SaleConfirmedModal.tsx`, ya que el repo no usa un sistema de toasts para este flujo — sigue el patrón existente de feedback de éxito), sin alterar el flujo normal.
- [x] 4.6 Frontend: aplicar el mismo aviso en el flujo de conversión de cotización — `ConvertQuoteModal` redirige con `?creditLimitExceeded=1`; `SaleDetailPage` lee el query param y muestra un banner descartable equivalente.

## 5. Tests

- [x] 5.1 Actualizar tests unitarios de `CreateSaleUseCase` (InMemory repos) que hoy esperan `CreditLimitExceededError`/`CustomerHasNoCreditLineError`: ahora deben esperar HTTP 201 / resultado con `creditLimitExceeded: true|false` según el caso.
- [x] 5.2 Actualizar tests unitarios equivalentes de `ConvertQuoteToSaleUseCase` (vía `QuotesController.test.ts`, único lugar donde estaba cubierto — no existía test unitario directo del use case).
- [x] 5.3 Agregar tests de `ListProductsUseCase`/`ProductsController`: con `branchId` incluye `stock` correcto; sin `branchId` → `stock: null`; sin registro de inventario → `stock: null`; `branchId` inválido → 400.
- [x] 5.4 Agregar test de `createQuote.ts` (service): 400 con mensaje no mapeado lanza error tipado con el mensaje real, no `NetworkError`; falla real de red sigue lanzando `NetworkError`.
- [x] 5.5 `npx tsc --noEmit` limpio en todos los archivos tocados por este change. `npx jest` completo: 2884/2898 tests pasan; los 14 restantes son 3 suites de integración (`sales-negative-stock`, `sales-edit-from-hq`, `products-crud`) contra la DB Supabase compartida — confirmado preexistente (falla igual con `git stash` sobre código sin tocar; las otras dos pasan en aislamiento, fallan sólo por contención de workers paralelos sobre la misma DB real). `npm run build` no se pudo ejecutar en esta sesión: el shell usa Node v18.0.0 (vía nvm) y Next.js exige ≥v18.17.0 — limitación del entorno de esta sesión, no del código; recomendar correrlo manualmente con la versión de Node correcta antes de mergear.

## 6. Verificación end-to-end (Playwright) — COMPLETA

Nota técnica: el tool `computer`/`find`/`get_page_text`/`read_page` de la extensión Chrome quedó bloqueado esperando `document_idle` indefinidamente incluso contra un dev server sano — se rodeó el bloqueo usando `javascript_tool` (ejecución JS directa en la página) para toda la interacción: fetch de datos reales, disparo de eventos React-compatibles (`input`, `change`, `mousedown`/`mouseup` para el `Combobox` de cliente — NO `click`, ya que el componente usa `onMouseDown`), y lectura de estado del DOM. `navigate` (hard nav) rompía la sesión de login (redirigía a `/auth/login`); se usó navegación client-side (`dispatchEvent(new MouseEvent('mousedown'/'click'))` sobre los `<a>` de Next Link) en su lugar, que sí preserva la sesión.

- [x] 6.1 Historia 1: confirmado en vivo — "Editar venta" NO aparece en el detalle de una venta `completed` (lista de botones no lo incluye); `/sales/:id/edit` sigue accesible por navegación directa y renderiza completo.
- [x] 6.2 Historia 2: confirmado en vivo — columna "Existencias" en el catálogo del POS; sin sucursal seleccionada (bypass admin) muestra "—" en todas las filas; con sucursal "Matriz" seleccionada muestra valores reales (`-9`, `-1`, `12`, `0`, ...); celdas con `stock <= 0` muestran clase `text-error font-medium` (resaltado confirmado vía `className`).
- [x] 6.3 Historia 3: confirmado en vivo — cotización sin cliente se crea exitosamente (antes crasheaba, ver 3.1 Bug B); con sucursal sin seleccionar el submit queda deshabilitado (Bug A). Ambos fixes verificados.
- [x] 6.4 Historia 4: confirmado en vivo — venta a crédito con total ($2,552.00) que excede el disponible del cliente (~$2,432.35) se completa con `status=201`, `paymentStatus=pending`, `creditLimitExceeded:true`, y el modal de confirmación muestra el banner "Se ha excedido el límite de crédito establecido para este cliente." junto al mensaje normal de éxito. Conversión de cotización a venta y caso "sin línea de crédito" (`creditLimit=null` → `creditLimitExceeded:false`) verificados vía backend en tests unitarios (5.1/5.2); no se repitió en vivo por no tener un segundo cliente de prueba sin línea configurada en la DB de desarrollo — cobertura suficiente entre unit tests + este repro en vivo del caso "excede límite".
