## Context

Ver `proposal.md` (sección Why). `TicketSettings` es un singleton (`src/modules/settings/`) con cadena hexagonal completa: entidad de dominio → puerto → repositorios (`Prisma`/`InMemory`) → controller HTTP con Zod → DTO de frontend consumido por `TicketSettingsForm.tsx`, `PrintableTicket.tsx` y `TicketPreviewPage.tsx`. `headerText` es un `string | null` sin más reglas de negocio que un `maxLength(500)` — mismo tratamiento que `footerText`/`legendText`, ninguno de los cuales se toca en este change.

## Goals / Non-Goals

**Goals:**
- Eliminar `headerText` de la cadena completa: entidad, puerto, columna Prisma (con migración `DROP COLUMN`), repos, Zod, DTOs frontend, form, y las 2 vistas de ticket (Historia #1).
- Quitar el párrafo `headerText` y el fallback `"Centro Agrícola Integral"` de `TicketPreviewPage.tsx`, y el párrafo equivalente en `PrintableTicket.tsx`, dejando que el bloque "Información del negocio" ocupe el espacio inmediatamente bajo el logo (Historia #2).

**Non-Goals:**
- No se toca `footerText` ni `legendText` — siguen existiendo igual que hoy.
- No se migra/preserva el valor de `header_text` ya persistido — se acepta su pérdida (ver Riesgos).
- No se agrega un mecanismo de "campo obsoleto pero tolerado" (deprecation shim) — el campo se retira de una vez en todas las capas, consistente con la regla del proyecto de no usar shims de compatibilidad hacia atrás cuando se puede simplemente cambiar el código.

## Decisions

**1. Zod: quitar la clave `headerText` del schema, sin agregar rechazo explícito.**
`z.object({...})` sin `.strict()` descarta (`strip`) claves no declaradas por default — comportamiento ya vigente en `updateTicketSchema` para cualquier clave desconocida. Un cliente viejo que aún envíe `{"headerText": "..."}` en el PATCH no rompe la petición: la clave se ignora, el resto del body se procesa normal. Alternativa (rechazar con 400 si `headerText` está presente) se descartó — agregar complejidad para detectar un campo legado no aporta valor; el approach silencioso es el default de Zod, cero código extra. Responde a Historia #1, AC2.

**2. Migración Prisma `DROP COLUMN header_text` — sin backfill, sin preservar el dato.**
La tabla `ticket_settings` es un singleton (≤1 fila). El usuario confirmó (vía "continua" tras la pregunta bloqueante de user-stories) proceder sin exigir backup explícito antes del DROP — se documenta el riesgo abajo en vez de bloquear el proposal. En un entorno de desarrollo esto es trivial (`prisma migrate dev`); si se llegara a aplicar contra producción con datos reales en `header_text`, esa fila se pierde de forma irreversible sin restore de backup.

**3. `TicketPreviewPage.tsx`: el fallback `"Centro Agrícola Integral"` se elimina junto con `headerText`, no se reemplaza por otro texto.**
Ese fallback nunca fue un requirement documentado (no aparecía en `sales-ticket-preview-ui/spec.md` como escenario propio, sólo como detalle de implementación); existía como placeholder de marca cuando no había `headerText`. Con `businessName`/`businessRfc`/etc. ya cubriendo la identidad del negocio, mantener un tagline adicional sin fuente de datos (`headerText` ya no existe) sería un string hardcodeado sin justificación — se retira. Alternativa considerada: reemplazarlo por un texto fijo distinto — rechazada, el usuario no pidió agregar un tagline nuevo, sólo quitar el encabezado.

**4. Orden final del bloque "logo → información del negocio" en ambas vistas.**
Antes: logo → (headerText opcional) → hr → info negocio (impreso) / logo → (headerText opcional o fallback) → info negocio (preview). Después: logo → hr → info negocio (impreso) / logo → info negocio (preview). El bloque de info del negocio ya maneja el caso "todos los campos null" con su propio guard condicional (`{(businessName || businessRfc || ...) && (...)}` en preview; renderizado línea por línea en impreso) — sin necesidad de un placeholder adicional cuando no hay datos. Responde a Historia #2, AC1.

## Riesgos / Trade-offs

- **[Riesgo]** Pérdida de datos: cualquier `header_text` ya guardado en la fila singleton se pierde al aplicar `DROP COLUMN header_text`, sin posibilidad de recuperación salvo restore de backup de la base de datos. **Mitigación**: ninguna a nivel de código — es una decisión de producto (headerText es redundante, se acepta perder el valor). Antes de correr `prisma migrate deploy` contra la base de datos de producción, confirmar explícitamente con el usuario que no hay un valor de `header_text` en uso que se quiera conservar manualmente (copiar a `businessName` u otro campo) antes del DROP.
- **[Riesgo]** Cualquier cliente HTTP externo (si existiera, fuera del propio frontend del panel) que dependa de `headerText` en la respuesta de `GET /settings/ticket` deja de recibirlo. **Mitigación**: el único consumidor conocido de este endpoint es el frontend de este mismo repo (`TicketSettingsForm.tsx`, `PrintableTicket.tsx`, `TicketPreviewPage.tsx`), todos actualizados en este mismo change — sin consumidores externos documentados.
