## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como Administrador, quiero configurar la razón social y el RFC del emisor (Agrisas) en Ajustes del ticket, para que el negocio tenga un único lugar editable donde mantener sus datos fiscales de emisión | - Given estoy en `/settings` (tab ticket) con `settings:write`, When lleno "Razón social" y "RFC" y guardo, Then el PATCH persiste ambos campos y el formulario refleja el valor guardado<br>- Given dejo un campo vacío, When guardo, Then se persiste como `null` (mismo patrón que `businessAddress`/`businessPhone` existentes)<br>- Given no toco ningún campo, When intento guardar, Then no se envía si el diff está vacío (consistente con `EmptyUpdateError` ya existente en `UpdateTicketSettingsUseCase`)<br>- Given es la primera vez que se configura (sin fila en `ticket_settings`), When consulto `GET`, Then `businessName` por defecto es `"Agrisas"` y `businessRfc` es `null` | - Sólo usuarios con `settings:write` pueden guardar (backend valida vía `SettingsController`, UI oculta botón "Guardar" sin el permiso)<br>- `settings:read` (sin `write`) puede ver el formulario pero inputs quedan `disabled`<br>- Validación de longitud en backend (`maxLength` Zod) para evitar payloads desproporcionados; sin exigir formato RFC estricto (dato informativo, no CFDI) |
| 2 | Cajero/Operador (`sales:read`) | Como Cajero, quiero ver la razón social y el RFC del emisor impresos en el ticket de venta (impreso y preview web), para entregar al cliente un comprobante con los datos fiscales completos del negocio que le vendió | - Given `ticketSettings.businessName`/`businessRfc` tienen valor, When abro `/sales/[id]/ticket` o imprimo el ticket, Then ambos aparecen en el bloque "Información del negocio", antes de la dirección, en el mismo orden en preview y en impreso<br>- Given alguno de los dos campos es `null`, When se renderiza el ticket, Then esa línea específica no se muestra (mismo patrón condicional que `businessAddress`/`businessPhone`/`businessTaxRegime`), sin romper el layout | - No se expone ningún dato adicional del emisor más allá de lo ya configurado en Settings (sin filtrar credenciales de Facturama ni RFCs de otros módulos como `waybills`)<br>- Sólo lectura: este rol no puede modificar `businessName`/`businessRfc` desde la vista de ticket |

Nota: se dividió en 2 historias porque configurar (Administrador, permiso `write`) y visualizar en el ticket (Cajero, permiso `read`) tienen criterios de aceptación y seguridad distintos — cada una es independiente y testeable por separado; ambas trazables al mismo cambio (extensión de `TicketSettings` + render en `PrintableTicket`/`TicketPreviewPage`).

## Why

El ticket de venta impreso y su preview web muestran dirección, teléfono y régimen fiscal del negocio, y hasta muestran el RFC del cliente (receptor) — pero carecen de la razón social y el RFC del emisor (Agrisas). Sin ese dato simétrico, el ticket queda incompleto como constancia de compra: el cliente no puede identificar fiscalmente a quién le compró. Hoy no existe ningún campo en `TicketSettings` para capturarlo, y el único RFC de Agrisas presente en el repo (`FACTURAMA_EMITTER_RFC` en `.env.example`) es un placeholder de pruebas usado exclusivamente por el flujo de Carta Porte (`waybills`), no el RFC fiscal real — por lo que no es reutilizable aquí sin acoplar módulos con propósitos distintos.

## What Changes

- Agregar campos `businessName` (razón social, default `"Agrisas"`) y `businessRfc` (default `null`) a la entidad `TicketSettings` y su cadena completa: dominio, puerto (`UpdateTicketSettingsData`), modelo Prisma (`ticket_settings` + migración), repositorios (`PrismaTicketSettingsRepository`, `InMemoryTicketSettingsRepository`), validación Zod en `SettingsController`, DTOs de frontend (`TicketSettingsDto`, `UpdateTicketSettingsBody`).
- Agregar inputs "Razón social" y "RFC" en `TicketSettingsForm.tsx`, en el bloque "Información del negocio", editables sólo con `settings:write`.
- Renderizar ambos campos en `PrintableTicket.tsx` (ticket impreso) y `TicketPreviewPage.tsx` (preview web), en el mismo bloque y orden en ambos, antes de la dirección — ocultando la línea si el valor es `null`.

## Capabilities

### New Capabilities
(ninguna — no se introduce un dominio nuevo)

### Modified Capabilities
- `settings-api`: `TicketSettings` gana dos campos nuevos (`businessName`, `businessRfc`) expuestos vía `GET`/`PATCH /api/v1/admin/settings/ticket`.
- `settings-ui`: el formulario de `/settings` gana inputs "Razón social" y "RFC" en el bloque "Información del negocio".
- `ticket-print-ui`: el ticket impreso (`PrintableTicket`) muestra razón social y RFC del emisor.
- `sales-ticket-preview-ui`: la vista previa del ticket (`/sales/:id/ticket`) muestra razón social y RFC del emisor.

## Impact

- **Backend**: `src/modules/settings/domain/entities/TicketSettings.ts`, `src/modules/settings/application/ports/TicketSettingsRepository.ts`, `src/modules/settings/infrastructure/repositories/{Prisma,InMemory}TicketSettingsRepository.ts`, `src/modules/settings/infrastructure/http/SettingsController.ts`, `prisma/schema.prisma` (+ migración `add_business_identity_to_ticket_settings`).
- **Frontend**: `app/(private)/settings/_logic/types/api.ts`, `app/(private)/settings/_blocks/TicketSettingsForm.tsx`, `app/(private)/sales/_blocks/PrintableTicket.tsx`, `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`.
- **Tests**: suites unitarias existentes de `settings` (use-cases, controller, repos) y `sales` (`PrintableTicket`, `TicketPreviewPage`, `TicketSettingsForm`) requieren extender fixtures/expects con los 2 campos nuevos.
- **Fuera de alcance**: `src/modules/billing/` (CFDI) y `waybills/` no se tocan — su RFC/razón social sigue viniendo de env vars de Facturama, dato independiente.
