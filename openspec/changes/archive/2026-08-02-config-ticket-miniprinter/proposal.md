## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como administrador, quiero configurar la plantilla del ticket (logo, encabezado, pie, ancho de papel) para que los tickets impresos reflejen la identidad del negocio | Hoy no existe módulo de settings ni personalización del ticket | - Given no existe configuración previa, When se hace `GET /settings/ticket`, Then responde con valores por defecto (`logoUrl: null`, `headerText: null`, `footerText: null`, `paperWidth: '80mm'`) sin crear fila hasta el primer `PATCH`<br>- Given un admin sube un logo válido (jpg/png/webp, ≤2MB), When se sube, Then se reemplaza cualquier logo anterior (best-effort delete del anterior, mismo patrón que productos) y `logoUrl` se actualiza<br>- Given un `PATCH` con `paperWidth: '58mm'`, When se guarda, Then persiste y el siguiente `GET` lo refleja<br>- Given un formato de imagen no soportado o >2MB, When se sube, Then responde 400 (formato) o 413 (tamaño) y no modifica el logo actual<br>- Given `paperWidth` fuera del enum (`'58mm'\|'80mm'`), When se hace `PATCH`, Then responde 400 | - `GET /settings/ticket` requiere `settings:read` (admin+operator+viewer)<br>- `PATCH /settings/ticket` y la subida/borrado de logo requieren `settings:write` (sólo admin)<br>- Validación de imagen igual que productos: mimetype whitelist + límite de tamaño servidor-side, nunca solo client-side<br>- Configuración es singleton global — sin `branchId`, no hay branch scoping que aplicar |
| 2 | Cajero/Operador | Como cajero, quiero imprimir el ticket de una venta completada desde su detalle para poder entregarlo al cliente en papel térmico | No existe ningún flujo de impresión en el proyecto hoy | - Given una venta con `status` cualquiera (completed/cancelled/edited) vista en `/sales/:id`, When el usuario hace click en "Imprimir ticket", Then se renderiza la vista imprimible con folio, fecha, cajero, sucursal, items (nombre/cantidad/precio/subtotal), totales (subtotal/IVA/IEPS si aplica/total), y logo/encabezado/pie de la configuración global, y se invoca `window.print()`<br>- Given la configuración de ticket no tiene logo (`logoUrl: null`), When se imprime, Then la vista omite el espacio del logo sin dejar un hueco/broken-image<br>- Given `paperWidth: '58mm'` configurado, When se imprime, Then el CSS `@media print` ajusta el ancho del contenido a 58mm (no a 80mm)<br>- Given la vista imprimible está activa, When la página se ve en pantalla (no impresión), Then el componente permanece oculto (`display: none` fuera de `@media print`) sin alterar el layout normal del detalle de venta | - Visible con el mismo `sales:read` que ya gatea `/sales/:id` — sin permiso nuevo<br>- La vista imprimible no expone datos de otra venta ni de otro cliente — usa exclusivamente los datos ya cargados por `useSaleDetail` para esa venta<br>- El fetch de configuración de ticket (`GET /settings/ticket`) requiere `settings:read` — si el cajero no lo tiene, el botón de impresión debe degradar con gracia (imprime sin logo/encabezado en vez de fallar) dado que `viewer` también tiene `settings:read` por defecto pero conviene no romper el flujo si faltara |

Nota: se dividieron en 2 historias porque cubren capas independientes y testeables por separado — historia 1 es el módulo de configuración (backend+settings admin UI), historia 2 es el consumo/impresión (solo lectura + `window.print`). Ambas se implementan en el mismo change dado que la historia 2 depende de la 1 para el logo/encabezado/pie.

## Why

Feedback de producción #37 ("config mini-printer / printer") — confirmado que no existe hoy: no hay módulo `settings` (sólo un placeholder en `/settings`), ni una sola línea de código de impresión (`window.print`/`@media print`) en todo el proyecto (`app/`, `src/` — cero coincidencias). El usuario confirmó, vía preguntas de aclaración, 3 decisiones que acotan el alcance: (1) impresión vía diálogo nativo del navegador con CSS `@media print` angosto, NO WebUSB/WebSerial ni agente local — evita instalar software adicional en cada terminal POS y funciona con cualquier impresora térmica que ya tenga driver del sistema operativo instalado; (2) plantilla configurable con logo + encabezado + pie + ancho de papel; (3) configuración GLOBAL única para todo el negocio, no por sucursal. El logo reusa el patrón exacto ya validado en producción para imágenes de producto (`UploadProductImageUseCase`/`SupabaseProductImageStorage`, límite 2MB, jpg/png/webp).

## What Changes

- Nuevo módulo hexagonal `src/modules/settings/` — agregado `TicketSettings` (domain), `GetTicketSettingsUseCase`/`UpdateTicketSettingsUseCase`/`UploadTicketLogoUseCase` (application), `PrismaTicketSettingsRepository` + `SupabaseTicketLogoStorage` (infrastructure, ambos siguiendo el patrón exacto de `products/infrastructure/services/SupabaseProductImageStorage.ts`).
- **Migración**: nueva tabla `ticket_settings` — singleton (una sola fila esperada, sin FK a `branches`), columnas `id`, `logo_url TEXT NULL`, `header_text TEXT NULL`, `footer_text TEXT NULL`, `paper_width VARCHAR(4) NOT NULL DEFAULT '80mm'` (CHECK `IN ('58mm','80mm')`), `created_at`, `updated_at`.
- Endpoints nuevos: `GET /api/v1/admin/settings/ticket` (`settings:read`), `PATCH /api/v1/admin/settings/ticket` (`settings:write`), `POST /api/v1/admin/settings/ticket/logo` + `DELETE /api/v1/admin/settings/ticket/logo` (`settings:write`).
- **RBAC**: nuevos permisos `settings:read` (grant: admin, operator, viewer) y `settings:write` (grant: admin) agregados a `prisma/seed.ts`, siguiendo el patrón `^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$` ya usado por el resto del catálogo de permisos.
- `app/(private)/settings/page.tsx` — reemplaza el placeholder actual por un formulario real: subida/borrado de logo (reusa `ImageUploadField` ya existente), campos de texto para encabezado/pie, selector de ancho de papel. Gateado por `settings:write` para editar (optimista durante loading, oculto/solo-lectura sin el permiso).
- `app/(private)/sales/_blocks/` — nuevo componente `PrintableTicket.tsx` (oculto en pantalla, visible sólo en `@media print`, ajustado al `paperWidth` configurado) + botón "Imprimir ticket" en `SaleDetailPage.tsx` junto a los botones de acción existentes, que llama `window.print()`.

## Capabilities

### New Capabilities
- `settings-api`: módulo backend de configuración global del negocio, cubriendo por ahora únicamente la plantilla del ticket (logo/encabezado/pie/ancho de papel) — diseñado como singleton extensible a futuras configuraciones globales.
- `settings-ui`: pantalla `/settings` (reemplaza el placeholder) para administrar la plantilla del ticket.
- `ticket-print-ui`: botón "Imprimir ticket" + vista imprimible en el detalle de venta (`/sales/:id`), consumiendo `settings-api` para el logo/encabezado/pie.

### Modified Capabilities
- `rbac`: agrega los permisos `settings:read`/`settings:write` y sus grants por rol.

## Impact

- `prisma/schema.prisma` + migración nueva — tabla `ticket_settings`
- `src/modules/settings/` (nuevo módulo completo: domain/application/infrastructure/di)
- `app/api/v1/admin/settings/ticket/route.ts`, `app/api/v1/admin/settings/ticket/logo/route.ts` (nuevos)
- `prisma/seed.ts` — +2 permisos, grants por rol
- `app/(private)/settings/page.tsx`, `app/(private)/settings/_blocks/` (nuevo), `app/(private)/settings/_logic/` (nuevo)
- `app/(private)/sales/_blocks/PrintableTicket.tsx` (nuevo), `app/(private)/sales/_blocks/SaleDetailPage.tsx` (+botón)
- Tests: unit de los 3 use cases de settings, `SupabaseTicketLogoStorage` (mismo patrón que el de productos), controller, y del componente `PrintableTicket`/botón de impresión en UI
