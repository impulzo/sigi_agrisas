## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como Administrador, quiero que el formulario de Ajustes del ticket ya no muestre el campo "Texto de encabezado", para no mantener un campo redundante ahora que "Razón social" y "RFC" cumplen esa función bajo el logo | - Given estoy en `/settings` (tab ticket), When cargo el formulario, Then no aparece ningún input/textarea "Texto de encabezado"<br>- Given hago un PATCH a `/api/v1/admin/settings/ticket` con `headerText` en el body, When el backend valida, Then Zod lo ignora silenciosamente (comportamiento default de `z.object`, sin declarar la clave) — no rompe la petición ni exige 400 explícito<br>- Given ya existía una fila en `ticket_settings` con `header_text` poblado, When se aplica la migración `DROP COLUMN header_text`, Then ese valor se pierde de forma irreversible (riesgo aceptado y documentado en design.md) | - Sólo `settings:write` puede modificar el formulario (sin cambio respecto al guard actual)<br>- La migración DROP COLUMN es destructiva y no reversible sin restore de backup |
| 2 | Cajero/Operador (`sales:read`) | Como Cajero, quiero que el ticket impreso y el preview web ya no muestren una línea de "texto de encabezado" separada, para que el bloque de datos del negocio (razón social, RFC, dirección, teléfono, régimen) aparezca inmediatamente bajo el logo sin un texto libre redundante entre medio | - Given abro `/sales/[id]/ticket` o imprimo el ticket, When se renderiza, Then no existe ningún párrafo de `headerText` entre el logo y el bloque "Información del negocio"<br>- Given `TicketPreviewPage.tsx` hoy muestra el fallback `"Centro Agrícola Integral"` cuando `headerText` es `null`, When se quita el campo, Then ese fallback también desaparece — el logo pasa directo al bloque de datos del negocio | - No se expone ningún dato adicional del emisor más allá de lo ya cubierto por `businessName`/`businessRfc`/`businessAddress`/`businessPhone`/`businessTaxRegime`<br>- Sólo lectura: este rol no gestiona el contenido del ticket |

Nota: se dividió en 2 historias porque el cambio de formulario/API/DB (Administrador) y el cambio de render en las 2 vistas de ticket (Cajero) tienen criterios de aceptación y archivos afectados distintos — mismo patrón usado en `add-ticket-issuer-fiscal-data`.

## Why

El change previo `add-ticket-issuer-fiscal-data` agregó `businessName` (razón social) y `businessRfc` al bloque "Información del negocio" del ticket, renderizado justo debajo del logo. Ese bloque ahora cumple exactamente la función que `headerText` (texto libre) cumplía antes de forma menos estructurada: identificar al negocio bajo el logo. Mantener ambos campos es redundante — confunde al administrador sobre cuál usar y duplica una misma sección del ticket con dos fuentes de texto. Se retira `headerText` para dejar una única fuente de verdad para la identidad del emisor.

## What Changes

- **BREAKING**: eliminar el campo `headerText` de `TicketSettings` en toda la cadena: entidad de dominio, puerto (`UpdateTicketSettingsData`), modelo Prisma (columna `header_text`, migración `DROP COLUMN`), repositorios (`Prisma`/`InMemory`), validación Zod en `SettingsController`, DTOs de frontend (`TicketSettingsDto`, `UpdateTicketSettingsBody`).
- Quitar el input "Texto de encabezado" de `TicketSettingsForm.tsx` (estado local, `useEffect` de sync, `handleSave`).
- Quitar el párrafo que renderiza `headerText` en `PrintableTicket.tsx` y en `TicketPreviewPage.tsx`, incluyendo el fallback `"Centro Agrícola Integral"` de esta última — el bloque "Información del negocio" pasa a ocupar ese espacio inmediatamente bajo el logo.
- Actualizar specs `settings-api`, `settings-ui`, `ticket-print-ui`, `sales-ticket-preview-ui` para reflejar la ausencia de `headerText`.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `settings-api`: `GET`/`PATCH /api/v1/admin/settings/ticket` dejan de exponer/aceptar `headerText`.
- `settings-ui`: el formulario de `/settings` ya no incluye el campo "Texto de encabezado".
- `ticket-print-ui`: el ticket impreso (`PrintableTicket`) ya no renderiza `headerText`.
- `sales-ticket-preview-ui`: la vista previa del ticket (`/sales/:id/ticket`) ya no renderiza `headerText` ni su fallback `"Centro Agrícola Integral"`.

## Impact

- **Backend**: `src/modules/settings/domain/entities/TicketSettings.ts`, `src/modules/settings/application/ports/TicketSettingsRepository.ts`, `src/modules/settings/infrastructure/repositories/{Prisma,InMemory}TicketSettingsRepository.ts`, `src/modules/settings/infrastructure/http/SettingsController.ts`, `prisma/schema.prisma` (+ migración `DROP COLUMN header_text`).
- **Frontend**: `app/(private)/settings/_logic/types/api.ts`, `app/(private)/settings/_blocks/TicketSettingsForm.tsx`, `app/(private)/sales/_blocks/PrintableTicket.tsx`, `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`.
- **Tests**: suites unitarias existentes de `settings` (use-cases, controller, repos) y `sales` (`PrintableTicket`, `TicketPreviewPage`, `TicketSettingsForm`) requieren quitar fixtures/expects de `headerText`.
- **Datos**: cualquier `header_text` ya persistido en la fila singleton de `ticket_settings` se pierde al aplicar la migración (riesgo aceptado, ver design.md).
- **Fuera de alcance**: `footerText` y `legendText` no se tocan.
