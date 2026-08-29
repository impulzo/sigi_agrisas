## Context

Ver `proposal.md` - `## Why` para la motivación completa. Resumen técnico: `resolveIssuerFiscalData` (`src/modules/billing/application/services/resolveIssuerFiscalData.ts`) trata `ticket.businessTaxRegime` como si fuera un código SAT corto, pero el form de `TicketSettingsForm.tsx` lo guarda como `"<código> — <descripción>"` vía `SatCatalogCombobox` (línea 143: `` `${code} — ${description}`.slice(0, 120) ``). El destino de ese valor, `Invoice.issuerFiscalRegime`, es `VarChar(4)` en `prisma/schema.prisma`. Reproducido en vivo: `POST /api/v1/admin/invoices` (standalone, DB real de este entorno) revienta con `PrismaClientKnownRequestError P2000` en `PrismaInvoiceRepository.createStamped`.

## Goals / Non-Goals

**Goals:**
- Que el 3er nivel de la cascada (fila 1 de la Historia de Usuario) resuelva `fiscalRegime` a un código que quepa en `Invoice.issuerFiscalRegime` (`VarChar(4)`), parseado del formato real de `businessTaxRegime`.
- Mantener el criterio ya vigente "nunca inventar datos": si no hay código parseable, `null`, no truncar a ciegas ni sustituir un valor sintético.
- Que el parseo sea el mismo en los dos consumidores de `resolveIssuerFiscalData` (`StampInvoiceUseCase` y `GetEmitterFiscalSettingsUseCase`) — ya lo es, por ser una función compartida; el fix vive en un solo lugar.

**Non-Goals:**
- No se toca el formato de captura de `TicketSettings.businessTaxRegime` en `TicketSettingsForm.tsx`/`SatCatalogCombobox` — sigue guardando `"<código> — <descripción>"` para el ticket impreso; ese formato es correcto para su propósito original.
- No se cambian los otros 2 niveles de la cascada (CSD, `EmitterFiscalSettings`) ni los otros 3 campos del nivel 3 (`rfc`, `legalName`, `address`) — ya caben en sus columnas (`VarChar(14)`/`VarChar(200)`/`Text` vs. `VarChar(13)`/`VarChar(200)`/`VarChar(300)` de origen).
- No se agrega validación de formato en `UpdateTicketSettingsUseCase` — el campo sigue siendo texto libre de cara al ticket; la responsabilidad de parsear un código SAT desde ahí es exclusiva del consumidor (`resolveIssuerFiscalData`), no del dueño del dato.

## Decisions

**Parsear en `resolveIssuerFiscalData`, no en la fuente (`TicketSettings`) ni en el destino (`Invoice`/Prisma).**
Alternativa considerada: ampliar `Invoice.issuerFiscalRegime` a `VarChar(120)` para que quepa el string completo. Rechazada — el campo es, por contrato de todo el módulo billing (ver `receiverFiscalRegime VarChar(4)` en el mismo modelo, y el resto del sistema que trata `fiscalRegime` como código SAT de 3 dígitos), un código SAT puro; guardar el label completo ahí sería inconsistente con el receptor y con cómo `resolveSatDescription`/`SatTaxRegimeRepository` ya esperan códigos para resolver la descripción en el PDF/detalle (`toInvoiceDto`, `InvoiceDocumentPdf`) — guardar el label ahí duplicaría la descripción dos veces y rompería esa resolución. El parseo en el punto de consumo es el único lugar que conoce ambos contratos (el formato de captura del ticket y el límite de columna del destino).

**Formato de parseo: regex de prefijo numérico (`^\d{3,4}(?:\s|$)`), no split fijo en `" — "`.**
Descartado durante el `apply` de este mismo change: el diseño original proponía dividir en el separador `" — "` (em dash) que usa `TicketSettingsForm.tsx` al construir el string (`` `${code} — ${description}` ``). Verificado contra datos reales (`prisma/seeds/ticketSettings.ts` y la BD real de este entorno): el valor sembrado es `"612 Personas Físicas con Actividad Empresarial"` — espacio simple, sin em dash. El split fijo habría devuelto `null` en ese caso concreto por no encontrar el separador exacto (evita el crash, pero no logra el objetivo de extraer el código cuando sí está disponible). Un regex de prefijo numérico (3-4 dígitos seguidos de espacio o fin de string) cubre ambos formatos vistos en producción (`"<código> — <descripción>"` y `"<código> <descripción>"`) sin depender de qué separador se usó al capturar. Si no hay un prefijo numérico reconocible al inicio del string, el campo queda `null` — nunca se trunca ni se inventa un valor.

**Límite de longitud centralizado como constante junto al parseo, no importado de Prisma.**
El dominio (`resolveIssuerFiscalData`) no debe depender del schema de Prisma (regla de capas del proyecto: dominio/aplicación no importa infraestructura). La constante de longitud (4) se declara localmente en el archivo, con un comentario que referencia la columna real (`Invoice.issuerFiscalRegime VarChar(4)` en `prisma/schema.prisma`) para que quede trazable sin crear un acoplamiento de import.

## Risks / Trade-offs

- **[Riesgo] Un admin captura `businessTaxRegime` a mano sin el separador `" — "` y con más de 4 caracteres (ej. sólo la descripción, sin código) → el nivel 3 no resuelve nada para `fiscalRegime`.** Mitigación: es el comportamiento ya especificado como correcto ("Nothing resolvable anywhere — field stays null, never invented") — preferible a inventar o truncar un código incorrecto que terminaría en una factura real. No se agrega heurística adicional (ej. buscar 3 dígitos en cualquier parte del string) porque el único origen real de este campo (`SatCatalogCombobox`) siempre antepone el código.
- **[Riesgo] Facturas ya timbradas antes de este fix (ver invoice `62c29180-...` de esta misma noche, timbrada minutos antes del fix de la cascada) siguen con su snapshot histórico incorrecto (`issuerLegalName: "Agrisas"` hardcodeado del bug anterior a `3b0beed`).** Mitigación: ninguna — es el comportamiento de snapshot histórico ya especificado y deseado ("exactitud histórica aunque los datos fiscales cambien después"); no se hace backfill. Fuera de alcance de este fix puntual.

## Migration Plan

Sin migración de BD ni de datos — cambio de lógica pura en `resolveIssuerFiscalData`, sin tocar el schema. Despliegue estándar (merge + deploy); rollback trivial (revertir el commit) si apareciera una regresión, sin estado que limpiar.
