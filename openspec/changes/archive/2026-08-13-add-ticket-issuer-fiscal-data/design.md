## Context

Ver `proposal.md` (sección Why) para la motivación. `TicketSettings` es un singleton (`src/modules/settings/`) con cadena hexagonal completa: entidad de dominio → puerto → repositorios (`Prisma`/`InMemory`) → controller HTTP con Zod → DTO de frontend consumido por `TicketSettingsForm.tsx`, `PrintableTicket.tsx` y `TicketPreviewPage.tsx`. Ya existe el patrón exacto a replicar: `businessAddress`/`businessPhone`/`businessTaxRegime` — string nullable, editable en el form, renderizado condicionalmente (línea omitida si `null`) en ambas vistas del ticket.

## Goals / Non-Goals

**Goals:**
- Agregar `businessName` (razón social) y `businessRfc` a `TicketSettings`, con los datos fiscales reales de Agrisas como default, siguiendo exactamente el patrón de los 3 campos `business*` existentes (Historia #1).
- Mostrar ambos en el ticket impreso y en el preview web, en el mismo bloque "Información del negocio", mismo orden en ambas vistas (Historia #2).

**Non-Goals:**
- No se valida formato de RFC (regex `^([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})$` usado en `customers`/`providers`) — el ticket es informativo, no un CFDI; el proposal lo declara explícitamente fuera de alcance.
- No se reutiliza `FACTURAMA_EMITTER_RFC`/`FACTURAMA_EMITTER_NAME` (env vars de `waybills`) como fuente — son datos de prueba de un flujo distinto (Carta Porte), no el emisor real del ticket.
- No se toca `src/modules/billing/` (CFDI/Facturama) — su emisor es independiente.

## Decisions

**1. Campos nullable string, sin validación de formato — igual que `businessAddress`/`businessPhone`/`businessTaxRegime`.**
Alternativa considerada: validar RFC con la regex de `customers-api`. Rechazada porque el ticket es un documento informativo interno (no fiscal-CFDI); imponer regex ahí generaría fricción para el admin sin beneficio real (el RFC visible en el ticket no se valida contra el SAT en ningún flujo). Consistencia con el resto del bloque "Información del negocio" pesa más.

**2. `DEFAULT_TICKET_SETTINGS` con los 5 campos `business*` en `null` — sin datos fiscales reales en código fuente. Identidad real sembrada vía script, no hardcode.**
El usuario proveyó los datos fiscales reales de Agrisas (razón social `IVAN ENRIQUE OLIVERA RAMIREZ`, RFC `OIRI8506123Y7`, dirección `LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510`, teléfono `CEL. 951 292 80 86`) pero pidió explícitamente que NO queden como constante en el código. Esto reemplaza además el default previo de dirección/teléfono (genéricos, del change `2026-08-10-ticket-contenido-ticket`, nunca correspondieron al domicilio fiscal real, y tampoco debían vivir hardcodeados). Se agrega `prisma/seeds/ticketSettings.ts` (`npm run seed:ticket-settings`), mismo patrón que `seed:folios`/`seed:sat-codes`: upsert idempotente de la fila singleton, sólo toca los 5 campos `business*`, no pisa logo/header/footer/legend/paperWidth si ya fueron configurados. Los datos siguen editables por el admin desde `/settings` tras sembrados — el seeder fija el estado inicial, no un valor inmutable.

**3. `businessRfc` maxLength 13 (backend Zod + input `maxLength` en frontend).**
RFC de persona moral son 12 caracteres, persona física 13 — se usa el máximo (13) sin exigir el mínimo, dado que no hay validación de formato (Decisión 1).

**4. Orden de renderizado: razón social → RFC → dirección → teléfono → régimen fiscal.**
Replica el orden natural de un membrete fiscal (identidad del emisor primero, luego contacto, luego régimen) y es simétrico al bloque "Cliente" ya existente en ambas vistas (RFC → Nombre → Dirección). Se aplica igual en `PrintableTicket.tsx` y `TicketPreviewPage.tsx` para que preview e impreso coincidan (Historia #2, AC1).

**5. Migración Prisma aditiva, sin backfill.**
`business_name`/`business_rfc` nuevas columnas nullable en `ticket_settings` (tabla singleton, ≤1 fila). Sin necesidad de backfill de datos — el `get()` del repositorio ya cae a `DEFAULT_TICKET_SETTINGS` cuando no hay fila, y `update()` usa upsert con esos defaults en la rama `create`, igual que los campos existentes.

## Riesgos / Trade-offs

- **[Riesgo]** Instalación nueva (o entorno donde nunca se corrió el seeder) muestra el ticket sin razón social/RFC/dirección/teléfono del emisor — mismo hueco que motivó este change. **Mitigación**: `npm run seed:ticket-settings` es parte del setup documentado (mismo patrón que `seed:folios`); correrlo una vez puebla la identidad real, editable después desde `/settings` si cambia (cambio de domicilio fiscal, etc.).
- **[Riesgo]** Divergencia entre `PrintableTicket.tsx` y `TicketPreviewPage.tsx` si se edita solo una vista. **Mitigación**: mismo PR toca ambas, mismo orden de campos documentado en Decisión 4 y verificado en tests de ambos componentes.

## Requisitos de seguridad reflejados (Historia de Usuario)

- `settings:write` requerido para persistir `businessName`/`businessRfc` — enforced en `SettingsController.updateTicket` (ya existente, se extiende el schema Zod, no el guard).
- `settings:read` (sin `write`) puede ver el formulario con inputs `disabled` — ya lo maneja `SettingsPage.tsx` (`canRead`/`canWrite`), sin cambios de guard, solo de campos mostrados.
- Ningún dato adicional del emisor se expone más allá de lo configurado en `ticket_settings` — no se filtra RFC/credenciales de `waybills` ni de `billing` (Facturama) al DTO del ticket.
- Vista del ticket (impreso/preview) sigue gateada por `sales:read` + branch scoping existentes — sin cambios de permisos, solo de contenido renderizado.
