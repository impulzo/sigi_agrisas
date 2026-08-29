## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Sistema (`resolveIssuerFiscalData`, invocado por `StampInvoiceUseCase` y `GetEmitterFiscalSettingsUseCase`) | Como el sistema que resuelve el emisor fiscal en cascada, quiero extraer sólo el código SAT numérico de `TicketSettings.businessTaxRegime` (formato `"<código> — <descripción>"`, texto libre pensado para el ticket impreso) en vez de usarlo tal cual, para que el 3er nivel de la cascada nunca intente persistir un valor que exceda `Invoice.issuerFiscalRegime` (`VarChar(4)`) | - Given `EmitterFiscalSettings.fiscalRegime` es `null` y `TicketSettings.businessTaxRegime = "612 — Personas Físicas con Actividad Empresarial"`, When se resuelve el 3er nivel de `fiscalRegime`, Then el valor resuelto es `"612"` (sólo el prefijo antes de `" — "`), no el string completo.<br>- Given `businessTaxRegime` no sigue el formato `"<código> — <descripción>"` (dato legado sin separador, o vacío), When se resuelve, Then se usa el string completo si cabe en 4 caracteres, o `null` si excede el límite — nunca se lanza una excepción no controlada ni se deja pasar un valor que rompa la escritura en BD.<br>- Given un timbrado (`StampInvoiceUseCase.stampFromSale`/`stampStandalone`) con este escenario (settings vacío, sólo ticket poblado), When se ejecuta `createStamped`, Then la factura se crea exitosamente (sin `PrismaClientKnownRequestError P2000`) con `issuerFiscalRegime="612"`.<br>- Given el endpoint ligero `GET /billing/emitter-fiscal-settings` (usado por la vista previa/prefactura) y el timbrado real resuelven el mismo `TicketSettings.businessTaxRegime`, When se comparan sus resultados, Then ambos devuelven el mismo código parseado — prefactura y factura final siguen coincidiendo (no se rompe el fix de "no inventar datos" ya vigente). | - Ningún permiso nuevo — la función es interna, ya gateada por `billing:write` (endpoint) y por el flujo de timbrado (`billing:write`/`sales:create`, sin cambio).<br>- El parseo es puro y local (regex/`split`), sin I/O adicional ni exposición de datos nuevos — sigue leyendo únicamente las 3 fuentes ya autorizadas (CSD, `EmitterFiscalSettings`, `TicketSettings`).<br>- No se "inventa" un código SAT — si no hay un código parseable, el campo queda `null` (UI ya renderiza "—"), consistente con el criterio "nunca inventar datos" ya establecido en el spec vigente para este mismo servicio. |

## Why

El commit `3b0beed` (esta misma rama, esta madrugada) agregó `TicketSettings` como 3er nivel de la cascada de resolución del emisor fiscal (`resolveIssuerFiscalData`), con la intención explícita de nunca inventar datos y usar la fuente real más cercana disponible (`Configuración > Ticket de venta`). Pero ese cambio asumió que `TicketSettings.businessTaxRegime` es un código SAT corto, cuando en realidad es un campo de texto libre (`VarChar(120)`) que el formulario de ticket guarda como `"<código> — <descripción>"` (ej. `"612 — Personas Físicas con Actividad Empresarial"`) para impresión legible. Al persistir ese string completo en `Invoice.issuerFiscalRegime` (`VarChar(4)`, pensado para un código SAT puro), Prisma lanza `P2000` ("value too long for the column's type") y el timbrado completo falla con 500 — reproducido en vivo contra la BD real de este entorno (settings de CSD vacíos, sólo ticket poblado, que es exactamente el estado actual de esta instalación). Esto es la causa raíz del bug reportado: no es sólo un mismatch visual entre el PDF final y la prefactura, es una falla dura de timbrado en el escenario más común (admin que sólo ha configurado el ticket de venta, no el CSD manager).

## What Changes

- `resolveIssuerFiscalData` (`src/modules/billing/application/services/resolveIssuerFiscalData.ts`): al resolver el 3er nivel de `fiscalRegime`, parsea sólo el prefijo de código SAT de `ticket.businessTaxRegime` (split en `" — "`, primer segmento) en vez de usar el string completo. Si no hay separador y el string completo no cabe en 4 caracteres, el campo queda `null` — no se trunca a ciegas ni se inventa un código.
- Sin cambios en las otras 2 fuentes de la cascada (CSD en vivo, `EmitterFiscalSettings`) ni en los demás campos del 3er nivel (`rfc`, `legalName`, `address` desde `ticket.businessRfc`/`businessName`/`businessAddress`) — esos ya caben en sus columnas respectivas.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `billing-api`: el requirement de resolución en cascada del emisor fiscal (agregado en la Ronda 3 de `breakdown-invoice-issuer-receiver-data`, ya archivado) gana la regla de parseo del código SAT desde `TicketSettings.businessTaxRegime` — el nivel 3 ya no usa el string completo para `fiscalRegime`.

## Impact

- `src/modules/billing/application/services/resolveIssuerFiscalData.ts`
- `openspec/specs/billing-api/spec.md`
- Tests unitarios existentes de `resolveIssuerFiscalData`/`StampInvoiceUseCase`/`GetEmitterFiscalSettingsUseCase` (agregar caso de regresión con `businessTaxRegime` en formato `"<código> — <descripción>"`)
