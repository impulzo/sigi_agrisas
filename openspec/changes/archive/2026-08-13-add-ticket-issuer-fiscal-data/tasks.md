## 1. Dominio y puerto

- [x] 1.1 Agregar `businessName: string | null` y `businessRfc: string | null` a `TicketSettings` (`src/modules/settings/domain/entities/TicketSettings.ts`), y a `DEFAULT_TICKET_SETTINGS` (`businessName: "Agrisas"`, `businessRfc: null`)
- [x] 1.2 Agregar `businessName?` y `businessRfc?` a `UpdateTicketSettingsData` (`src/modules/settings/application/ports/TicketSettingsRepository.ts`)

## 2. Prisma

- [x] 2.1 Agregar columnas `businessName String? @map("business_name") @db.VarChar(200)` y `businessRfc String? @map("business_rfc") @db.VarChar(13)` al modelo `TicketSettings` en `prisma/schema.prisma`
- [x] 2.2 Generar migración: `npx prisma migrate dev --name add_business_identity_to_ticket_settings` (aplicada como `20260813000002_add_business_identity_to_ticket_settings` vía `migrate deploy` — `migrate dev` no soporta entorno no interactivo en este repo)
- [x] 2.3 `npx prisma generate`

## 3. Repositorios

- [x] 3.1 `PrismaTicketSettingsRepository.ts` — incluir `businessName`/`businessRfc` en `Row`, `toEntity`, y en las ramas `create`/`update` de `get()`/`update()`/`updateLogoUrl()`
- [x] 3.2 `InMemoryTicketSettingsRepository.ts` — incluir ambos campos en el spread de `update()`

## 4. HTTP

- [x] 4.1 `SettingsController.ts` — agregar `businessName: z.string().max(200).nullable().optional()` y `businessRfc: z.string().max(13).nullable().optional()` a `updateTicketSchema`
- [x] 4.2 (no previsto en el plan original) `UpdateTicketSettingsUseCase.ts` — agregar `businessName`/`businessRfc` a la lista `keys` que detecta update vacío (`EmptyUpdateError`); sin esto, un PATCH que sólo trajera estos dos campos era rechazado como "vacío"

## 5. Frontend — tipos y formulario

- [x] 5.1 Agregar `businessName`/`businessRfc` a `TicketSettingsDto` y `UpdateTicketSettingsBody` (`app/(private)/settings/_logic/types/api.ts`)
- [x] 5.2 `TicketSettingsForm.tsx` — agregar inputs "Razón social" (maxLength 200) y "RFC" (maxLength 13) en el bloque "Información del negocio", antes de "Dirección"; incluir en estado local, `useEffect` de sync, y `handleSave`

## 6. Frontend — render del ticket

- [x] 6.1 `PrintableTicket.tsx` — leer `businessName`/`businessRfc` de `ticketSettings`; renderizar en el bloque "Información del negocio" en orden: razón social → RFC → dirección → teléfono → régimen fiscal; cada línea condicional a valor no nulo
- [x] 6.2 `TicketPreviewPage.tsx` — mismo cambio, mismo orden, mismo bloque, para paridad exacta con `PrintableTicket.tsx`

## 7. Tests

- [x] 7.1 `tests/unit/modules/settings/application/use-cases/GetTicketSettingsUseCase.test.ts` — extender fixtures con `businessName`/`businessRfc`
- [x] 7.2 `tests/unit/modules/settings/application/use-cases/UpdateTicketSettingsUseCase.test.ts` — extender fixtures y casos de update parcial/vacío
- [x] 7.3 `tests/unit/modules/settings/infrastructure/http/SettingsController.test.ts` — casos de validación Zod (maxLength, null) para ambos campos
- [x] 7.4 `tests/unit/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository.test.ts` — extender fixtures de `Row`/`toEntity`
- [x] 7.5 `tests/unit/ui/(private)/settings/TicketSettingsForm.test.tsx` — inputs nuevos, render y submit
- [x] 7.6 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` — render condicional de razón social/RFC (presente y `null`)
- [x] 7.7 `tests/unit/ui/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.test.tsx` — mismo caso que 7.6, en la vista preview

## 8. Verificación

- [x] 8.1 `npm test -- settings` y `npm test -- sales` en verde (38/38 y 226/226)
- [x] 8.2 `npm run build` (verifica tipos de extremo a extremo) — build exitoso
- [x] 8.3 Manual: `/settings` → llenar razón social + RFC → guardar → confirmar persistencia tras reload — verificado con Playwright
- [x] 8.4 Manual: `/sales/[id]/ticket` → confirmar razón social + RFC visibles en preview y en impresión (`Ctrl+P`) — verificado con Playwright, preview e impresión emulada coinciden

## 9. Seeder de identidad fiscal (sin hardcode en código)

Corrección post-implementación: el usuario proveyó los datos fiscales reales de Agrisas (razón social, RFC, dirección, teléfono) y pidió que NO queden hardcodeados en `DEFAULT_TICKET_SETTINGS` — deben sembrarse vía seeder, como el resto del catálogo (`seed:folios`, `seed:sat-codes`, etc.), quedando editables por el admin en `/settings`.

- [x] 9.1 `TicketSettings.ts` — revertir `DEFAULT_TICKET_SETTINGS.business*` (name/rfc/address/phone/taxRegime) a `null`; el código fuente no contiene datos fiscales reales
- [x] 9.2 `prisma/seeds/ticketSettings.ts` (nuevo) — seeder idempotente: upsert de la fila singleton (`ticket-settings-singleton`) con razón social, RFC, dirección, teléfono y régimen fiscal reales; sólo toca esos 5 campos (no pisa logo/header/footer/legend/paperWidth si el admin ya los configuró)
- [x] 9.3 `package.json` — script `seed:ticket-settings`
- [x] 9.4 Ejecutar `npm run seed:ticket-settings` contra la DB de dev — fila existente actualizada
- [x] 9.5 Actualizar tests que asumían el default hardcodeado: `GetTicketSettingsUseCase.test.ts`, `SettingsController.test.ts` (default ahora `null` en los 5 campos)
- [x] 9.6 Actualizar `specs/settings-api/spec.md` y `design.md` del change con el default `null` + nota del seeder
- [x] 9.7 `npm test -- settings` (38/38) y `npm test -- sales` (226/226) en verde tras el revert
- [x] 9.8 `npm run build` exitoso; verificado en `/settings` vía Playwright que los 5 campos siguen poblados tras el seed (sesión dev-server se corrompió por correr `build` con `dev` vivo compartiendo `.next` — reiniciado limpio, no relacionado al cambio de código)
