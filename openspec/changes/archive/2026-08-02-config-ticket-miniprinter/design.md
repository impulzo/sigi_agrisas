## Context

No existe módulo `settings` ni código de impresión en el proyecto (confirmado por exploración: cero coincidencias de `window.print`/`@media print`, `src/modules/` no tiene directorio `settings/`). Sí existe un patrón de subida de imagen ya validado en producción (`products/application/use-cases/UploadProductImageUseCase.ts` + `products/infrastructure/services/SupabaseProductImageStorage.ts`) que este change reutiliza para el logo del ticket. `useSaleDetail` (`app/(private)/sales/_logic/hooks/useSaleDetail.ts`) ya expone todos los campos necesarios para el ticket (folio, fecha, cajero, sucursal, items, totales) — no se requiere ampliar el DTO de venta. El modelo `Branch` ya tiene `address`/`phone`/`email`, pero la decisión del usuario fue plantilla GLOBAL (no por sucursal), así que esos campos de `Branch` NO se usan aquí — el encabezado es texto libre capturado en `ticket_settings`.

## Goals / Non-Goals

**Goals:**
- Permitir configurar logo/encabezado/pie/ancho de papel de forma global (historia 1).
- Imprimir un ticket desde el detalle de venta vía diálogo nativo del navegador, ajustado al ancho configurado (historia 2).

**Non-Goals:**
- Sin impresión silenciosa/automática (WebUSB, WebSerial, agente local) — explícitamente descartado por el usuario.
- Sin configuración por sucursal — un solo registro global.
- Sin plantilla enriquecida (HTML custom, múltiples plantillas) — sólo los 4 campos confirmados.
- Sin impresión de cotizaciones/devoluciones/facturas en este change — sólo ventas (`/sales/:id`). Extender a otros documentos queda para un change futuro si se pide.

## Decisions

**D1 — Tabla `ticket_settings` como singleton sin `branchId`, sin lógica de "upsert con id fijo".** El repositorio implementa `get()`/`update()` sobre "la primera fila que exista" (`findFirst()`); `update()` hace `upsert` con un `id` constante conocido (ej. `"ticket-settings-singleton"`) para garantizar que nunca haya más de una fila, sin necesitar un `CHECK`/trigger de unicidad a nivel de BD. Alternativa considerada: tabla con un solo `id` autoincremental y aplicación asume `id=1` — descartada por ser menos explícita que un id fijo legible.

**D2 — Reuso literal del patrón de imagen de producto para el logo.** Mismos límites (2MB, jpg/png/webp), misma estructura de use case (`UploadTicketLogoUseCase` calca `UploadProductImageUseCase`), mismo componente frontend `ImageUploadField` ya existente — minimiza código nuevo y mantiene consistencia. Bucket de Supabase Storage separado (`ticket-logo`) para no mezclar con `product-images`.

**D3 — `GET /settings/ticket` nunca falla con 404 aunque no exista fila.** Retorna los defaults (`logoUrl: null, headerText: null, footerText: null, paperWidth: '80mm'`) sin crear la fila — la fila sólo se crea en el primer `PATCH`/subida de logo. Evita que el botón "Imprimir ticket" (historia 2) tenga que manejar un caso 404 antes de la primera configuración.

**D4 — Impresión vía `window.print()` + CSS `@media print`, sin librería de impresión térmica.** Ver Historia de Usuario 2 — decisión explícita del usuario. El componente `PrintableTicket` se renderiza siempre en el DOM (oculto por CSS `display: none` fuera de `@media print`), evitando el costo de montar/desmontar el árbol justo antes de imprimir y los problemas de timing que eso introduciría con `window.print()`.

**D5 — El ancho de papel se traduce a CSS con un mapa fijo `{'58mm': '58mm', '80mm': '80mm'}` aplicado directamente como `width` del contenedor imprimible dentro de `@media print`.** Sin unidades intermedias (px/pt) — los navegadores manejan `mm` nativamente en contexto de impresión, evitando cálculos de conversión.

**D6 — Botón "Imprimir ticket" no requiere permiso nuevo (`sales:read` ya gatea la página).** El fetch de `GET /settings/ticket` requiere `settings:read`; para no bloquear la impresión si por alguna razón un rol tuviera `sales:read` sin `settings:read` (no debería pasar con los grants por defecto, pero es una garantía barata), el fetch de configuración se envuelve en manejo de error que degrada a "imprimir sin logo/encabezado/pie" en vez de bloquear el botón.

## Risks / Trade-offs

- **[Riesgo] El resultado visual del `window.print()` varía por navegador/driver de impresora (algunos añaden headers/footers propios del navegador — fecha, URL, número de página)** → Mitigación: fuera de control de la aplicación; documentado como limitación conocida (el usuario puede desactivar "Headers and footers" en el diálogo de impresión de Chrome, común en flujos de impresión de recibos web).
- **[Riesgo] Un logo muy grande o de proporción inadecuada puede verse mal en 58mm** → Mitigación: mismo límite de 2MB que productos evita archivos absurdos; el CSS del ticket aplica `max-width: 100%` al logo, sin recorte adicional en el backend (fuera de alcance redimensionar server-side).
- **[Riesgo] La tabla `ticket_settings` como singleton sin `branchId` es una decisión difícil de revertir si en el futuro se pide personalización por sucursal** → Mitigación: aceptado explícitamente por el usuario; si se necesita en el futuro, es una migración aditiva (agregar `branch_id` nullable, `null` = fallback global).

## Migration Plan

1. Migración Prisma: crear tabla `ticket_settings` (nueva, sin impacto en tablas existentes).
2. `prisma/seed.ts`: agregar permisos `settings:read`/`settings:write` + grants — el seed es idempotente (confirmado por convención del proyecto), seguro de re-ejecutar.
3. Bucket de Supabase Storage `ticket-logo` — crearlo manualmente en el proyecto Supabase (mismo proceso manual que se usó para `product-images`, fuera del alcance de la migración Prisma).
4. Sin cambios de configuración obligatorios para desplegar — sin fila en `ticket_settings`, el sistema opera con defaults; sin bucket creado, la subida de logo fallaría con un error claro (no bloquea el resto del flujo de impresión, que sigue funcionando sin logo).
