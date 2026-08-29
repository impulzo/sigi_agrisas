## 1. Implementación del parseo

- [x] 1.1 En `src/modules/billing/application/services/resolveIssuerFiscalData.ts`, agregar una función pura `extractSatCodeFromTicketRegime(businessTaxRegime: string | null): string | null` que extrae el prefijo numérico inicial (3-4 dígitos seguidos de espacio o fin de string, regex `/^(\d{3,4})(?:\s|$)/`) — cubre tanto `"<código> — <descripción>"` (formato del form, `SatCatalogCombobox`) como `"<código> <descripción>"` (formato real sembrado en `prisma/seeds/ticketSettings.ts`, sin em-dash). Sin coincidencia → `null`. Documentado con comentario corto sobre el límite 4 (referencia a `Invoice.issuerFiscalRegime VarChar(4)` en `prisma/schema.prisma`, sin importar Prisma). Nota: diseño original (split fijo en `" — "`) se descartó al verificar contra datos reales — ver `design.md` § Decisiones.
- [x] 1.2 Reemplazar el uso directo de `ticket?.businessTaxRegime` en el cálculo de `fiscalRegime` (línea del `return` de `resolveIssuerFiscalData`) por `extractSatCodeFromTicketRegime(ticket?.businessTaxRegime ?? null)`.
- [x] 1.3 Verificar que `rfc`/`legalName`/`address` (mismos 3 campos del nivel 3) no cambian — siguen usando `ticket?.businessRfc`/`ticket?.businessName`/`ticket?.businessAddress` tal cual.

## 2. Tests de regresión

- [x] 2.1 Test unitario de `extractSatCodeFromTicketRegime`: `"612 — Personas Físicas con Actividad Empresarial"` y `"612 Personas Físicas con Actividad Empresarial"` (ambos formatos reales) → `"612"`. (`tests/unit/modules/billing/resolveIssuerFiscalData.test.ts`)
- [x] 2.2 Test unitario: string sin prefijo numérico (ej. `"Personas Físicas con Actividad Empresarial"`) → `null`.
- [x] 2.3 Test unitario: código bare que ya cabe (ej. `"601"`) → se devuelve tal cual.
- [x] 2.4 Test unitario: `businessTaxRegime = null` → `null` (sin regresión).
- [x] 2.5 Test de `StampInvoiceUseCase`: 2 casos nuevos en `tests/unit/modules/billing/StampInvoiceUseCase.test.ts` (em-dash y sin código) + fixture existente actualizado (`"612 Personas Físicas..."` → ahora espera `"612"`, no el string completo) — `InMemoryInvoiceRepository`, sin BD real.
- [x] 2.6 Test de `GetEmitterFiscalSettingsUseCase` con el mismo fixture — confirma mismo código parseado que el timbrado (consistencia prefactura/factura).

## 3. Verificación manual contra la BD real

- [x] 3.1 Con el servidor dev corriendo y la BD real de este entorno (`EmitterFiscalSettings` vacío, `TicketSettings.businessTaxRegime = "612 Personas Físicas con Actividad Empresarial"`), reproducido el `POST /api/v1/admin/invoices` (standalone) que antes revienta con `P2000` → ahora `201 Created`.
- [x] 3.2 Confirmado en la respuesta: `issuerFiscalRegime: "612"`, no el string completo.
- [x] 3.3 PDF descargado (`GET /invoices/:id/download?format=pdf`) → `200`, PDF válido de 1 página; texto extraído confirma sección "Emisor" con RFC/razón social reales.
- [x] 3.4 `GET /billing/emitter-fiscal-settings` devuelve `fiscalRegime: "612"` — mismo valor que el timbrado real; prefactura y factura coinciden.

## 4. Suite completa

- [x] 4.1 `npm test` completo: 3863 passed, 5 failed (todos en `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx`, cálculo de alto de página del ticket). Aislado con `git stash` (excluyendo sólo los 3 archivos de este change): los mismos 5 fallos preexisten sin este fix — `PrintableTicket.tsx` ya estaba modificado en el working tree por trabajo ajeno no commiteado antes de esta tarea, sin relación con `resolveIssuerFiscalData.ts`. Sin regresiones causadas por este change.
- [x] 4.2 Nota dejada: aplicar el delta de `specs/billing-api/spec.md` al spec principal es responsabilidad de `opsx:archive`, no de esta tarea — pendiente hasta indicación explícita del usuario (regla del proyecto: nunca archivar automáticamente).
