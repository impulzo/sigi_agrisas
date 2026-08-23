## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con permiso `quotes:read` (operador/administrador) | Como usuario con permiso `quotes:read`, quiero descargar la cotización como PDF desde su página de detalle para poder compartirla o imprimirla fuera del sistema | El equipo comercial necesita entregar la cotización al cliente en un documento formal y portable, sin depender de capturas de pantalla ni de que el cliente tenga acceso al panel | - Given una cotización en cualquier estado (`draft`, `authorized`, `converted`, `cancelled`), When el usuario hace click en "Imprimir PDF" en `QuoteActionsBar`, Then se descarga un archivo `.pdf` con folio, estado, fecha de emisión/vencimiento, datos del cliente (o "Cliente general" si no tiene), tabla de líneas con snapshots de producto/cantidad/precio/descuento/IVA/total de línea, y totales (subtotal/impuestos/total)<br>- Given una cotización sin cliente asignado (`customerId: null`), When se genera el PDF, Then el bloque de cliente muestra "Cliente general" en vez de fallar o dejar campos vacíos<br>- Given que la generación del PDF está en curso, When el usuario mira el botón, Then está deshabilitado y muestra estado de carga hasta que la descarga termina (éxito o error)<br>- Given `GET /api/v1/admin/quotes/[id]?format=pdf` con un `id` que no existe, When se invoca, Then responde 404 igual que el formato `json` actual<br>- Given `GET /api/v1/admin/quotes/[id]?format=xyz` con un formato inválido, When se invoca, Then responde 400 | - El endpoint reutiliza el guard `quotes:read` ya existente en `app/api/v1/admin/quotes/[id]/route.ts` — no se introduce ningún permiso RBAC nuevo, y el branch scoping (`enforceBranchScope`) aplica igual para `format=pdf` que para `format=json`, de modo que un usuario no-admin no pueda descargar el PDF de una cotización de otra sucursal<br>- El PDF no expone datos fuera de lo que ya expone `QuoteDetailDto` vía JSON (mismo `dto`, sólo cambia la representación) — no se agregan campos sensibles nuevos<br>- Los datos del emisor (`businessName`/`businessRfc`/`businessAddress`/`businessPhone`) se leen server-side desde `TicketSettings` vía `GetTicketSettingsUseCase`, nunca desde input del cliente, evitando que un usuario pueda falsificar el emisor del documento |

## Why

El módulo de cotizaciones cubre todo el ciclo de vida (`draft → authorized → converted | cancelled | expired`) pero no ofrece ninguna forma de entregar la cotización como documento fuera del panel. El equipo comercial necesita compartir la cotización con el cliente (correo, impresión física, WhatsApp) en un formato formal y portable, algo que hoy no existe. El proyecto ya resolvió este mismo problema para facturas (`billing`), historial de pagos (`payments`) y kardex (`inventory`) con un patrón maduro y repetido: generación server-side con `@react-pdf/renderer` + descarga de blob client-side — no hay razón para introducir una librería o flujo distinto para cotizaciones.

## What Changes

- Extiende `GET /api/v1/admin/quotes/[id]` con soporte a `?format=pdf` (default `json`), mismo patrón que `payments/history` y `inventory/kardex`. Formato inválido → 400.
- Nuevo componente `QuotePdf.tsx` (`@react-pdf/renderer`) en `src/modules/quotes/infrastructure/pdf/`, modelado en `InvoiceDocumentPdf.tsx` pero sin sello digital/UUID/cadena original/QR (eso es fiscal-CFDI, no aplica a una cotización).
- El emisor del PDF (`businessName`/`businessRfc`/`businessAddress`/`businessPhone`) se obtiene reutilizando `TicketSettings` vía `GetTicketSettingsUseCase` (módulo `settings`), inyectado en `QuotesController` siguiendo el patrón de reuso cross-módulo ya establecido en la DI de `quotes` (que ya importa `PrismaSaleRepository`/`PrismaPosLookupService` de `pos`).
- Nuevo botón "Imprimir PDF" en `QuoteActionsBar`, disponible en **todos** los estados de la cotización (incluidos `converted` y `cancelled`, que hoy retornan temprano sin mostrar acciones adicionales) — requiere reestructurar los `return` tempranos del componente.
- Nuevo servicio `downloadQuotePdf.ts` y hook `useQuoteExport.ts` en `app/(private)/quotes/_logic/`, modelados en `downloadKardexPdf.ts`/`useKardex.ts` (descarga directa de blob, sin modal de preview).

## Capabilities

### New Capabilities

_Ninguna — el cambio extiende capacidades existentes, no introduce un dominio nuevo._

### Modified Capabilities

- `quotes-api`: `GET /quotes/:id` gana el parámetro `format` (`json` por defecto, `pdf` como nuevo valor soportado); formato inválido responde 400.
- `quotes-ui`: la página de detalle de cotización (`/quotes/[id]`) gana una acción "Imprimir PDF" disponible en cualquier estado, con estado de carga durante la descarga.

## Impact

- **Backend**: `src/modules/quotes/infrastructure/http/QuotesController.ts` (nuevo branch `format=pdf` en `getById`), `src/modules/quotes/infrastructure/di/container.ts` (nueva dependencia cross-módulo `GetTicketSettingsUseCase`), nuevo `src/modules/quotes/infrastructure/pdf/{QuotePdf.tsx,pdfStyles.ts}`.
- **Frontend**: `app/(private)/quotes/_blocks/{QuoteActionsBar.tsx,QuoteDetailPage.tsx}`, nuevo `app/(private)/quotes/_logic/services/downloadQuotePdf.ts` y `app/(private)/quotes/_logic/hooks/useQuoteExport.ts`.
- **Sin cambios**: schema Prisma, migraciones, permisos RBAC (se reutiliza `quotes:read`), rutas de `app/api/v1/admin/quotes/`.
- **Dependencias**: ninguna nueva — `@react-pdf/renderer` ya es dependencia del proyecto.
