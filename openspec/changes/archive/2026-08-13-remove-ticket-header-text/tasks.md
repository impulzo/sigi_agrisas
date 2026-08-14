## 1. Backend — dominio y puerto

- [x] 1.1 `TicketSettings.ts` — quitar `headerText` de la interfaz `TicketSettings` y de `DEFAULT_TICKET_SETTINGS`
- [x] 1.2 `TicketSettingsRepository.ts` — quitar `headerText` de `UpdateTicketSettingsData`

## 2. Backend — Prisma y migración

- [x] 2.1 `prisma/schema.prisma` — quitar la línea `headerText String? @map("header_text")` del modelo `TicketSettings`
- [x] 2.2 Generar migración: `npx prisma migrate dev --name remove_header_text_from_ticket_settings` (DROP COLUMN `header_text`) — aplicada como `20260814000001_remove_header_text_from_ticket_settings` vía `migrate deploy` (migración escrita a mano + `prisma migrate deploy`, ya que `migrate dev` no soporta entorno no interactivo en este repo y además arrastraba cambios de PK no relacionados en otras tablas). Se confirmó con el usuario antes de aplicar: la fila singleton tenía `header_text = "Agrisas · Av. Principal 123 · Tel. 555-1234"` (dato real, perdido tras el DROP)
- [x] 2.3 `npx prisma generate`

## 3. Backend — repositorios

- [x] 3.1 `PrismaTicketSettingsRepository.ts` — quitar `headerText` de `Row`, `toEntity`, y de las ramas `create`/`update` de `update()` y `updateLogoUrl()`
- [x] 3.2 `InMemoryTicketSettingsRepository.ts` — quitar `headerText` del spread de `update()`

## 4. Backend — controller

- [x] 4.1 `SettingsController.ts` — quitar `headerText: z.string().max(500).nullable().optional()` de `updateTicketSchema`
- [x] 4.2 `UpdateTicketSettingsUseCase.ts` — quitar `"headerText"` del array `keys` que detecta update vacío (`EmptyUpdateError`)

## 5. Frontend — tipos y form

- [x] 5.1 `app/(private)/settings/_logic/types/api.ts` — quitar `headerText` de `TicketSettingsDto` y `UpdateTicketSettingsBody`
- [x] 5.2 `TicketSettingsForm.tsx` — quitar el bloque de input "Texto de encabezado" (estado local `headerText`, línea del `useEffect` de sync, línea del `handleSave`)

## 6. Frontend — vistas de ticket

- [x] 6.1 `PrintableTicket.tsx` — quitar el párrafo `{ticketSettings?.headerText && (...)}` (queda: logo → hr → bloque "Información del negocio")
- [x] 6.2 `TicketPreviewPage.tsx` — quitar el párrafo `{ticketSettings?.headerText ? (...) : (...)}` incluyendo el fallback `"Centro Agrícola Integral"` (queda: logo → bloque "Información del negocio", sin slot intermedio)

## 7. Tests

- [x] 7.1 `tests/unit/modules/settings/application/use-cases/GetTicketSettingsUseCase.test.ts` — quitar `headerText` de fixtures/expects
- [x] 7.2 `tests/unit/modules/settings/application/use-cases/UpdateTicketSettingsUseCase.test.ts` — quitar `headerText` de fixtures y casos de update parcial/vacío
- [x] 7.3 `tests/unit/modules/settings/infrastructure/http/SettingsController.test.ts` — quitar casos de validación Zod de `headerText`; agregar caso de "headerText en el body es ignorado silenciosamente"
- [x] 7.4 `tests/unit/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository.test.ts` — quitar `headerText` de fixtures de `Row`/`toEntity`
- [x] 7.5 `tests/unit/ui/(private)/settings/TicketSettingsForm.test.tsx` — quitar aserciones sobre el input "Texto de encabezado"
- [x] 7.6 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` — quitar aserciones de render de `headerText`
- [x] 7.7 `tests/unit/ui/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.test.tsx` — quitar aserciones de render de `headerText` y del fallback `"Centro Agrícola Integral"`

## 8. Verificación

- [x] 8.1 `npm test -- settings` en verde (39/39)
- [x] 8.2 `npm test -- sales` en verde (228/228)
- [x] 8.3 `npm run build` exitoso (verifica tipos de extremo a extremo)
- [x] 8.4 Manual: `/settings` → confirmado que no aparece el campo "Texto de encabezado" — verificado con Playwright
- [x] 8.5 Manual: `/sales/[id]/ticket` → confirmado que el bloque de datos del negocio aparece inmediatamente bajo el logo, sin texto de encabezado ni fallback "Centro Agrícola Integral" — verificado en preview (screenshot) y en impresión (`.printable-ticket` DOM) con Playwright
