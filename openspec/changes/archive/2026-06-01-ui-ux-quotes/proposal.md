## Why

El backend de cotizaciones (`add-quotes-crud`, 2026-06-01) ya expone `/api/v1/admin/quotes` con todo el ciclo de vida (`draft → authorized → converted | cancelled | expired`), branch scoping, snapshot por línea, conversión idempotente a venta y enlace bidireccional `quote.convertedSaleId ↔ sale.quoteId`. Sin embargo, el panel no tiene ninguna pantalla para crear, listar, autorizar, cancelar o convertir cotizaciones. Los vendedores no pueden capturar una propuesta antes de cerrarla y la regla "convertir cotización a venta" tampoco tiene cómo dispararse desde la UI.

Además, la regla operativa del cliente exige que **desde el POS** se pueda elegir "Cotizar" sin abandonar el flujo que ya conoce el cajero: misma búsqueda de productos, mismo carrito con tier/descuento, misma selección de cliente — pero el botón final emite una cotización (`POST /api/v1/admin/quotes`) en lugar de una venta. Hoy el POS sólo finaliza ventas.

Este change implementa **la capa de UI completa de cotizaciones** sobre el backend ya desplegado y añade la rama "Cotizar" en el POS, incorporando el diseño Stitch *"Facturación y Cotizaciones - Agrisas"* (proyecto `5227157529282603342`, pantalla `03b348783f7b46f0ac6f88aaef19a649`) — tabla densa con `Status Chips`, columnas `Fecha / Cliente / Tipo / Total / Estado / Acciones`, y el toolbar con búsqueda + filtros que ya se aplica al resto del panel.

## What Changes

- Nueva ruta privada `/quotes` — listado paginado de cotizaciones con filtros (sucursal, estado `draft|authorized|converted|cancelled|expired`, rango de fechas `from/to`, búsqueda por `folio_code`/folio_number/customer.name/customer.rfc con debounce de 300 ms y mínimo 2 chars). Badge de estado y columnas `Folio / Cliente / Vendedor / Sucursal / Total / Estado / Vencimiento / Fecha`. Gateada por `quotes:read`.
- Nueva ruta privada `/quotes/new` — pantalla de emisión de cotización con el mismo layout split-pane catálogo/carrito del POS (reutiliza `ProductCatalogPanel`, `CartLinesList`, `CartTotals`, `CustomerPicker`, `CustomerQuickAddModal`, `PriceTierPicker`). El panel derecho ofrece selectores de sucursal/folio/cliente, un campo opcional `expiresAt` (date-picker `>= mañana`) y `notes`. Botón principal "Crear cotización" (estado `draft`). Gateada por `quotes:create`.
- Nueva ruta privada `/quotes/[id]` — detalle de cotización con header (folio, estado, total destacado, `isExpired` banner cuando aplica), tabla de items con snapshots, datos del cliente/sucursal/vendedor, expiración, notas, y acciones contextuales según estado:
  - `draft` → "Autorizar" (perm `quotes:authorize`), "Editar" (perm `quotes:write`), "Cancelar" (perm `quotes:cancel`).
  - `authorized` → "Convertir a venta" (perm `quotes:convert`), "Cancelar" (perm `quotes:cancel`); deshabilitadas con tooltip si `isExpired === true`.
  - `converted` → "Ver venta generada" (link a `/sales/[convertedSaleId]`); el resto se ocultan.
  - `cancelled` → banner con `cancellationReason`; el resto se ocultan.
- Nueva ruta privada `/quotes/[id]/edit` — edición de cotización **sólo en `draft`** (rechaza con 409 visual y redirige al detalle si el estado cambió en otra pestaña). Reusa el editor del POS con los items y notas vigentes; submit → `PATCH /api/v1/admin/quotes/:id`. Folio/branch/customer bloqueados visualmente (el backend los ignora).
- Modal `AuthorizeQuoteModal` con `notes?` opcional (max 1000 chars) y `ConfirmDialog`. Maneja 409 (estado distinto a `draft` o expirado) mostrando un toast y refrescando el detalle.
- Modal `CancelQuoteModal` con `reason?` opcional (max 500 chars) y `ConfirmDialog`. Maneja 409 "already cancelled" mostrando estado actual; 409 con `saleId` (cotización ya convertida) muestra link al flujo de cancelación de venta `/sales/[saleId]`.
- Modal `ConvertQuoteModal` con selectores obligatorios de `paymentMethodId` y `folioId` (fiscal — **distinto** del folio de la cotización), `notes?` opcional que sobrescribe la nota de la cotización. Tras éxito 200 navega a `/sales/[saleId]`. Maneja 409 expired / 400 fiscal folio inactivo / 400 payment method inactivo con mensajes inline.
- **Rama "Cotizar" en el POS**: el `PosHeader` añade un `Tabs`/`SegmentedButton` "Venta · Cotización"; el panel del carrito muestra "Crear cotización" en lugar de "Finalizar venta" cuando el modo es `quote`. Mismos validadores, mismo cálculo de totales (`computeTotalsClient`), pero el submit usa el nuevo servicio `createQuote`. Sin `paymentMethodId` requerido (cotización no lo pide); aparece campo `expiresAt` opcional. Tras éxito redirige a `/quotes/[id]` (no muestra modal de venta confirmada). Visible sólo si `can("quotes:create") === true`.
- NavigationRail: añade item `quotes` (`/quotes`, icono `request_quote`, label `Cotizaciones`, `requires: "quotes:read"`) entre `sales` e `inventory`.

## Capabilities

### New Capabilities

- `quotes-ui`: pantallas `/quotes` (lista paginada con filtros + badge de estado), `/quotes/new` (emisión con catálogo/carrito), `/quotes/[id]` (detalle + acciones autorizar/editar/cancelar/convertir), `/quotes/[id]/edit` (editor sólo en `draft`), y la **rama "Cotizar" del POS** que reutiliza el carrito y enruta a `POST /quotes`. Respeta branch scoping (sin `?branchId=` para non-bypass se filtra por sucursal del usuario; los selectores ocultan opciones fuera del scope).

### Modified Capabilities

- `panel-shell`: añadir item `quotes` (`/quotes`, icono `request_quote`, label `Cotizaciones`, `requires: "quotes:read"`) entre `sales` e `inventory`. Todos los demás items quedan idénticos.

## Impact

- **Rutas nuevas**: `app/(private)/quotes/page.tsx`, `app/(private)/quotes/new/page.tsx`, `app/(private)/quotes/[id]/page.tsx`, `app/(private)/quotes/[id]/edit/page.tsx`.
- **Componentes nuevos**: `app/(private)/quotes/_blocks/`, `app/(private)/quotes/_logic/`.
- **POS modificado**: `app/(private)/pos/_blocks/PosPage.tsx` y `_blocks/PosHeader.tsx` reciben prop `mode: "sale" | "quote"`; `_blocks/CartPanel.tsx` cambia el CTA y muestra `expiresAt` cuando `mode === "quote"`; nuevo hook `useQuoteSubmission` en `app/(private)/pos/_logic/hooks/` (paralelo a `useSaleSubmission`); nuevo servicio `createQuote` en `app/(private)/pos/_logic/services/` o (mejor) extraído a un módulo compartido.
- **NavigationRail**: `items.ts` recibe el nuevo entry `quotes`.
- **Iconos**: registrar `request_quote`, `task_alt`, `swap_horiz` en `app/_components/atoms/Icon/icons.ts` si no existen.
- **Sin cambios en backend**: el módulo `quotes` está completo y testeado (archivado en `add-quotes-crud`, 2026-06-01).
- **Sin cambios en `useCurrentUser` ni `useHeadquarters`**: las cotizaciones no requieren guard de matriz — basta `quotes:*` + branch scoping ya existente.
- **Dependencias reutilizadas**: `authFetch`, `useCurrentUser`, `useDebounce`, `useBranchesOptions`, `computeTotalsClient`, `formatMxCurrency`, `Combobox`, `Badge`, `Skeleton`, `Spinner`, `Switch`, `ConfirmDialog`, `EmptyState`, `SearchInput`, `FormField`, `Card`, `Chip`, `CatalogShell`, `CatalogToolbar`, `CatalogPagination`. Cero átomos nuevos.
- **Diseño**: Material 3 + tokens "Agro-Systemic Design" — `primary #0d631b` para acciones positivas (Autorizar, Convertir), `secondary-container` para Cotizar/Crear cotización (siguiendo el Stitch `03b348783f7b46f0ac6f88aaef19a649`), `tertiary-fixed` para chip "Quote" en tablas mixtas, badges de estado con punto coloreado (estilo del Stitch: `Paid → bg-primary-fixed-dim`, `Pending → bg-secondary-container`, `Draft → bg-surface-container-high`, `Expired → bg-error-container`, `Converted → bg-primary-container`, `Cancelled → bg-surface-container-highest`). Tabla densa con `tabular-nums` para totales.
