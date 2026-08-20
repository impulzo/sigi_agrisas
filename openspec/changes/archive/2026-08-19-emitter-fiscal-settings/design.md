## Context

`FacturamaRestGateway` existe hoy en dos módulos independientes — `src/modules/billing/infrastructure/services/FacturamaRestGateway.ts` (facturas) y `src/modules/waybills/infrastructure/services/FacturamaRestGateway.ts` (Carta Porte) — cada uno con su propio constructor que lee `FACTURAMA_EMITTER_RFC`/`_NAME`/`_FISCAL_REGIME`/`_ZIP_CODE` de `process.env` y falla fast al boot si faltan (sólo cuando `FACTURAMA_MOCK=false`). Ambos construyen su nodo `Emisor` con esos 4 valores estáticos.

Ya existe `POST/GET /api/v1/admin/billing/csd` (`billing/application/use-cases/{UploadCsdUseCase,GetCsdStatusUseCase}.ts`, `billingController.uploadCsd/getCsdStatus`) que sube CSD a Facturama vía `FacturamaGateway.uploadCsd({rfc, certificateBase64, privateKeyBase64, privateKeyPassword})`. El comentario explícito en `UploadCsdUseCase.ts` — "Secrets are forwarded to Facturama and never persisted locally" — es correcto para el material criptográfico, pero hoy también deja sin persistir el RFC (que no es secreto), y no captura razón social/régimen/CP en absoluto. Facturama tampoco los devuelve en la respuesta de `/api/Csd` (sólo `ExpirationDate`) — confirmado leyendo `FacturamaRestGateway.uploadCsd` en `billing`.

Responde a la Historia de Usuario de `proposal.md` (ambas filas).

## Goals / Non-Goals

**Goals:**
- Capturar RFC + razón social + régimen fiscal + CP del emisor en la misma pantalla donde ya se sube el CSD, persistiéndolos en BD (Historia #1).
- Ambos `FacturamaRestGateway` (billing y waybills) resuelven el emisor desde esa fuente en vez de `process.env` (Historia #2).
- Modo mock (`FACTURAMA_MOCK=true`, default) sigue funcionando sin requerir estos datos poblados — no se toca el `FakeFacturamaGateway` de ningún módulo.

**Non-Goals:**
- No se cambia el `Receiver` del CFDI en ningún módulo — sigue siendo lo que ya recibe cada gateway (el emisor mismo en waybills' Traslado, el cliente en billing's Ingreso) — este change sólo toca cómo se resuelve el `Emisor`.
- No se elimina `FACTURAMA_USER`/`FACTURAMA_PASSWORD`/`FACTURAMA_BASE_URL` de env — son credenciales de la integración (autenticación HTTP contra la API de Facturama), no datos fiscales del emisor; permanecen sin cambio.
- No se valida contra el SAT que el RFC/régimen/CP capturados sean reales o coincidan con el CSD subido — Facturama ya valida el CSD en sí (`uploadCsd` falla si el certificado no es válido); los 3 campos adicionales (razón social, régimen, CP) son captura manual de confianza en el admin, igual que hoy son captura manual vía `.env`.
- No se migran automáticamente los valores actuales de `.env` a la tabla nueva — la tabla nace vacía; el admin debe volver a capturarlos una vez desde `/billing` tras el deploy (documentado en Migration Plan).

## Decisions

**D1 — Tabla nueva `EmitterFiscalSettings`, singleton, mismo patrón que `TicketSettings`.**
```prisma
model EmitterFiscalSettings {
  id           String   @id @default("singleton")
  rfc          String?  @db.VarChar(13)
  legalName    String?  @db.VarChar(200)
  fiscalRegime String?  @db.VarChar(3)
  zipCode      String?  @db.VarChar(5)
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("emitter_fiscal_settings")
}
```
Fila única (`id="singleton"`), todas nullable hasta la primera captura — mismo patrón de `TicketSettings`/`PricingSettings`/`InventoryNotificationSettings` (`get-or-default`, `upsert` sobre el id fijo).

**D2 — Repositorio vive en `src/shared/infrastructure/`, no dentro de `billing` ni `waybills`.**
Alternativas descartadas:
- Vivir dentro de `billing/` con `waybills` leyendo vía un puerto tipo `WaybillLookupService.findSale` — rechazada: el dato no es "propiedad" conceptual de facturación, es infraestructura de integración con Facturama compartida por ambos módulos, y crear un puerto cross-módulo sólo para 4 campos escalares es sobre-ingeniería.
- Vivir en `settings/` junto a `TicketSettings` — rechazada: `settings` es configuración de negocio (ticket, pricing, notificaciones) leída por casos de uso; este dato es específico de la integración Facturama, más cerca de `allocateFolio` (helper compartido de infraestructura) que de un `*SettingsRepository` de dominio.
Se sigue el precedente ya usado por `allocateFolio` (`src/shared/infrastructure/folios/allocateFolio.ts`, reusado por `PrismaSaleRepository`/`PrismaQuoteRepository`/`PrismaPaymentRepository`): un helper de infraestructura compartido, sin capa de puerto/dominio propia.
```ts
// src/shared/infrastructure/emitter/emitterFiscalSettingsStore.ts
export interface EmitterFiscalData { rfc: string; legalName: string; fiscalRegime: string; zipCode: string }
export async function getEmitterFiscalSettings(tx?: PrismaClientOrTx): Promise<Partial<EmitterFiscalData> | null>;
export async function upsertEmitterFiscalSettings(data: Partial<EmitterFiscalData>, tx?: PrismaClientOrTx): Promise<void>;
export function isEmitterFiscalDataComplete(data: Partial<EmitterFiscalData> | null): data is EmitterFiscalData;
```

**D3 — `POST /billing/csd`: persiste sólo si Facturama acepta el CSD, orden estricto.**
`UploadCsdUseCase.execute` pasa a:
1. `gateway.uploadCsd({rfc, certificateBase64, privateKeyBase64, privateKeyPassword})` — si Facturama rechaza, lanza `FacturamaCsdError`, la request termina en 422, **no se toca la tabla** (mismo comportamiento que hoy, sin cambio).
2. Si `uploadCsd` resuelve OK y el body trae `legalName`/`fiscalRegime`/`zipCode`, `upsertEmitterFiscalSettings({rfc, legalName, fiscalRegime, zipCode})`. Si el body NO trae los 3 campos opcionales (ej. sólo re-sube el CSD sin tocar los datos fiscales), no se sobreescriben los ya guardados — `upsert` parcial, mismo patrón `PATCH` ya usado por `UpdateTicketSettingsUseCase` (sólo los campos presentes se actualizan).
`csdSchema` (`BillingController.ts:93-98`) gana `legalName: z.string().max(200).optional()`, `fiscalRegime: z.string().regex(/^\d{3}$/).optional()`, `zipCode: z.string().regex(/^\d{5}$/).optional()`.

**D4 — `GET /billing/csd`: combina status de Facturama + datos persistidos.**
`GetCsdStatusUseCase.execute` pasa a devolver `{ ...facturamaStatus, legalName, fiscalRegime, zipCode }` — llama a `gateway.getCsdStatus()` (sin cambio) y a `getEmitterFiscalSettings()` en paralelo (`Promise.all`), mergea. Si `getEmitterFiscalSettings()` devuelve `null` (nunca capturado), los 3 campos van `null` en la respuesta — `CsdManagerPage.tsx` renderiza el form vacío en ese caso (sin romper si es la primera vez).

**D5 — CORRECCIÓN post-lectura de código (durante `apply`): sólo `waybills`' `FacturamaRestGateway` lee `process.env.FACTURAMA_EMITTER_*`.**
Al implementar se confirmó (grep exhaustivo, cero resultados) que `src/modules/billing/infrastructure/services/FacturamaRestGateway.ts` NUNCA leyó `FACTURAMA_EMITTER_*` ni construye un nodo `Emisor` en su `stamp()` — el payload que arma para `POST /3/cfdis` sólo lleva `Receiver` (el cliente); Facturama infiere el emisor del lado suyo, ligado al CSD ya cargado en la cuenta. La suposición original de este design ("ambos módulos leen env para el Emisor") era incorrecta para `billing`. Se corrige el alcance:
- `waybills/infrastructure/services/FacturamaRestGateway.ts` (Carta Porte, sí construye `Emisor` explícito en `buildLocationPayload`/payload de Traslado): deja de leer `process.env.FACTURAMA_EMITTER_*` en el constructor, resuelve en cada llamada de `stampTraslado`:
  ```ts
  const emitter = await getEmitterFiscalSettings();
  if (!isEmitterFiscalDataComplete(emitter)) {
    throw new EmitterFiscalDataIncompleteError();
  }
  ```
  Se elige resolver en cada llamada (no cachear en el constructor) porque el gateway ya es un singleton de larga vida en el DI container (`container.ts`) — cachear el emisor ahí congelaría el valor hasta el próximo restart, exactamente el problema que este change busca eliminar. El costo de una query extra por timbrado (operación de baja frecuencia) es aceptable.
- `billing/infrastructure/services/FacturamaRestGateway.ts`: **sin cambios** — no hay env que quitar ni fail-fast que relajar, porque nunca dependió de estos 4 campos. La captura/persistencia de Historia #1 (CSD upload) sigue teniendo valor propio (identidad fiscal del emisor consultable vía `GET /csd`, y es la fuente que SÍ consume `waybills`), independientemente de que `billing` no la use internamente.

**D6 — Error de dominio `EmitterFiscalDataIncompleteError` sólo en `waybills`, no en `billing`.**
Dado D5 corregido, sólo `waybills/domain/errors.ts` necesita esta clase — `billing`'s `stamp()` no tiene ninguna ruta que pueda lanzarla (no leer + no lanzar código muerto, regla del proyecto de no manejar escenarios que no pueden ocurrir). Se mapea sólo en `WaybillsController` (creación `carta_porte`) → HTTP 409.

## Risks / Trade-offs

- **[Riesgo]** Tras el deploy, la tabla nace vacía — cualquier timbrado (factura o Carta Porte) con `FACTURAMA_MOCK=false` fallará con `EmitterFiscalDataIncompleteError` hasta que un admin capture los datos una vez en `/billing`. → **Mitigación:** aceptado, ventana esperada y corta (una sola captura manual); el error es explícito y accionable (a diferencia de hoy, donde un `.env` mal configurado revienta el boot del proceso completo). Documentar en release notes.
- **[Riesgo]** Migrar de "env var fija" a "BD mutable en caliente" significa que un admin puede cambiar el RFC del emisor entre dos timbrados sin redeploy, lo cual es la meta pero también un vector de error operativo (RFC incorrecto capturado por accidente afecta CFDIs futuros sin que nadie lo note hasta que Facturama rechace o el SAT audite). → **Mitigación:** fuera de alcance de este change (no se pide un flujo de aprobación/auditoría); se deja como posible mejora futura si el cliente lo pide explícitamente.
- **[Riesgo]** `upsertEmitterFiscalSettings` parcial (D3) permite que un `POST /billing/csd` que sólo re-sube CSD dispare persistencia con campos previos si el llamador no manda los 3 opcionales — comportamiento correcto (no sobreescribe), pero si el cliente HTTP asume que "no mandar campo = borrar campo" (inconsistente con el resto del proyecto, que usa esa misma semántica en `PATCH` de `TicketSettings`/`customers`/`branches`) podría confundir. → **Mitigación:** ninguna adicional — es exactamente el patrón `PATCH` ya establecido en el proyecto (`CLAUDE.md`: "Campo opcional vacío envía `null`... PATCH requiere ≥1 campo"); documentado en la spec delta.

## Migration Plan

1. Migración Prisma aditiva (`EmitterFiscalSettings`) — tabla nueva vacía, sin backfill, sin downtime.
2. Deploy de backend (shared store + use cases + controller + ambos gateways) — mientras la tabla esté vacía y `FACTURAMA_MOCK=false`, timbrar (facturas y Carta Porte) fallará con `EmitterFiscalDataIncompleteError` hasta el paso 4. Si `FACTURAMA_MOCK=true` (default en dev), sin impacto.
3. Deploy de UI (`CsdManagerPage.tsx` con los 3 campos nuevos).
4. **Acción manual post-deploy (producción)**: un admin abre `/billing`, sube el CSD (o re-sube el actual si ya estaba subido) junto con razón social/régimen/CP, una sola vez.
5. `.env.example`: comentar `FACTURAMA_EMITTER_*` como deprecadas (no se leen más), sin removerlas del `.env` de nadie automáticamente — evita romper despliegues que aún no pasaron por el paso 4 de forma abrupta si alguien reintroduce lectura de env como fallback temporal (no se implementa fallback en este change, pero no se borra el env var del ejemplo para no perder el historial de qué significaba).
6. Rollback: revertir el deploy de backend/UI es seguro — la tabla nueva nullable no rompe nada si se deja de leer; no requiere rollback de datos.
