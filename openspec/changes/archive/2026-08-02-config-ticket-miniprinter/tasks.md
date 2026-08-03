## 1. Schema + migración + RBAC

- [x] 1.1 `prisma/schema.prisma` — nuevo modelo `TicketSettings` (`id`, `logoUrl String? @map("logo_url")`, `headerText String? @map("header_text")`, `footerText String? @map("footer_text")`, `paperWidth String @default("80mm") @map("paper_width") @db.VarChar(4)`, `createdAt`, `updatedAt`, `@@map("ticket_settings")`).
- [x] 1.2 Migración generada vía `prisma migrate diff` filtrada a la tabla nueva (mismo flujo que changes anteriores), `prisma migrate deploy` + `prisma generate`.
- [x] 1.3 `prisma/seed.ts` — agrega `settings:read`/`settings:write` al array `PERMISSIONS`, grants: admin ambos, operator+viewer sólo `settings:read`. Verificado idempotente (`npm run seed` dos veces, sin duplicados en BD). **Bug preexistente encontrado y corregido durante el apply**: el seed usaba el `PrismaClient` por defecto (pooler PgBouncer `DATABASE_URL`, modo transacción) para una transacción interactiva larga (~150+ round trips); con los 2 permisos nuevos el conteo de round trips cruzó el límite y PgBouncer cerraba la sesión a mitad de transacción (`P2028 Transaction not found`). Corregido apuntando el `PrismaClient` del seed a `DIRECT_URL` (conexión directa, no pooled) — cambio aislado a `prisma/seed.ts`, no afecta el cliente Prisma compartido de la app (`src/shared/infrastructure/prisma/client.ts`). También se subió el timeout de la transacción de 30000ms a 60000ms como margen adicional.

## 2. Backend — módulo `settings` (dominio + aplicación)

- [x] 2.1 `src/modules/settings/domain/entities/TicketSettings.ts` — interfaz `TicketSettings` + `PaperWidth`, `DEFAULT_TICKET_SETTINGS` const.
- [x] 2.2 `src/modules/settings/domain/errors/{InvalidImageFormatError,ImageTooLargeError}.ts` — clases independientes propias del módulo (no importadas de `products`, evita acoplar módulos).
- [x] 2.3 `src/modules/settings/application/ports/TicketSettingsRepository.ts` — `get(): Promise<TicketSettings>` (retorna defaults si no hay fila), `update(data: UpdateTicketSettingsData): Promise<TicketSettings>`, `updateLogoUrl(url: string | null): Promise<TicketSettings>`.
- [x] 2.4 `src/modules/settings/application/ports/TicketLogoStorage.ts` — puerto análogo a `ProductImageStoragePort`.
- [x] 2.5 `GetTicketSettingsUseCase.ts`, `UpdateTicketSettingsUseCase.ts` (rechaza body vacío con `EmptyUpdateError`; validación de enum `paperWidth` se hace en el controller vía Zod, no aquí), `UploadTicketLogoUseCase.ts` (calca `UploadProductImageUseCase`), `DeleteTicketLogoUseCase.ts` (no-op si ya es null).

## 3. Backend — infraestructura + HTTP

- [x] 3.1 `src/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository.ts` — `get()` usa `findFirst()` + fallback a defaults; `update()`/`updateLogoUrl()` usan `upsert` con `id` fijo (`"ticket-settings-singleton"`).
- [x] 3.2 `src/modules/settings/infrastructure/services/SupabaseTicketLogoStorage.ts` — calca `SupabaseProductImageStorage.ts`: bucket `"ticket-logo"`, path `settings/ticket-logo/${randomUUID()}.${ext}`.
- [x] 3.3 `src/modules/settings/infrastructure/http/SettingsController.ts` — `getTicket`, `updateTicket` (Zod: `headerText`/`footerText` opcionales max 500, `paperWidth` enum), `uploadLogo`, `deleteLogo`. Guard de permisos movido a `route.ts` (patrón `tax-rates`, más simple sin branch scoping) en vez de dentro del controller.
- [x] 3.4 `app/api/v1/admin/settings/ticket/route.ts` (`GET`/`PATCH`), `app/api/v1/admin/settings/ticket/logo/route.ts` (`POST`/`DELETE`) — `requirePermission` + delegan al controller.
- [x] 3.5 `src/modules/settings/infrastructure/di/container.ts` — instancia repo/storage/use cases/controller, exporta `settingsController`.
- [x] 3.6 `InMemoryTicketSettingsRepository.ts` + `InMemoryTicketLogoStorage.ts` para tests unitarios de use cases.

## 4. Frontend — `/settings` (historia 1)

- [x] 4.1 `app/(private)/settings/_logic/types/api.ts` (`TicketSettingsDto`, `UpdateTicketSettingsBody`), `_logic/errors.ts` (`TicketLogoTooLargeError`, `TicketLogoInvalidFormatError`), `_logic/services/{getTicketSettings,updateTicketSettings,uploadTicketLogo,deleteTicketLogo}.ts`. `uploadTicketLogo`/`deleteTicketLogo` aceptan un primer parámetro `id` ignorado — para calzar exactamente con la firma `uploadFn(id, file)`/`deleteFn(id)` que ya espera `ImageUploadField` sin modificar ese componente compartido (la config de ticket es singleton, sin id real).
- [x] 4.2 `app/(private)/settings/_logic/hooks/useTicketSettings.ts` (fetch + refresh) y `useTicketSettingsMutations.ts` (update con loading/error states).
- [x] 4.3 `app/(private)/settings/_blocks/TicketSettingsForm.tsx` — usa `ImageUploadField` existente para el logo, `<textarea>` para header/footer (500 chars), radio buttons para `paperWidth`. Inputs deshabilitados sin `settings:write`.
- [x] 4.4 `app/(private)/settings/_blocks/SettingsPage.tsx` (nuevo) + `page.tsx` reemplaza el placeholder — gate `settings:read` (EmptyState "Sin acceso" si falta).

## 5. Frontend — impresión de ticket (historia 2)

- [x] 5.1 `app/(private)/sales/_blocks/PrintableTicket.tsx` (nuevo) — componente puro, recibe `sale: SaleDetail` + `ticketSettings: TicketSettingsDto | null` como props; renderiza folio/fecha/cajero/sucursal/items/totales + logo/header/footer; `hidden print:block` (Tailwind) + `<style>` con `@media print { width: <paperWidth> }` inline (paperWidth es dinámico, no puede ir en una clase Tailwind estática). Si `ticketSettings` es `null` o `logoUrl` es `null`, omite esas secciones sin roto.
- [x] 5.2 `app/(private)/sales/_blocks/SaleDetailPage.tsx` — botón "Imprimir ticket" junto a los existentes, llama `window.print()` directo; `ticketSettings` se hace fetch UNA vez en `useEffect` al montar (no en el click) para que `PrintableTicket` ya esté en el DOM con los datos correctos cuando se abre el diálogo de impresión; fetch envuelto en catch que degrada a `null` sin bloquear el flujo. Import cross-módulo de `settings/_logic/services/getTicketSettings` — mismo patrón ya usado en el proyecto (`SaleInvoicesSection` de `billing` importado en `sales`).

## 6. Tests

- [x] 6.1 `tests/unit/modules/settings/application/use-cases/GetTicketSettingsUseCase.test.ts` — defaults sin fila, valores reales con fila.
- [x] 6.2 `tests/unit/modules/settings/application/use-cases/UpdateTicketSettingsUseCase.test.ts` — actualiza parcial, rechaza vacío (`EmptyUpdateError`), crea fila si no existe, no duplica fila en segunda escritura. (Validación de `paperWidth` enum vive en el controller vía Zod, no en el use case — cubierto en 6.4.)
- [x] 6.3 `tests/unit/modules/settings/application/use-cases/UploadTicketLogoUseCase.test.ts` (incluye `DeleteTicketLogoUseCase` en el mismo archivo) — formato inválido, tamaño excedido, reemplazo borra el anterior best-effort, delete no-op si ya es null.
- [x] 6.4 `tests/unit/modules/settings/infrastructure/http/SettingsController.test.ts` — 200/400 en los 4 métodos del controller (403 se prueba a nivel de `route.ts`/`requirePermission`, no del controller — mismo patrón que `tax-rates`, el guard vive fuera del controller). 4/4 suites, 18/18 tests verdes.
- [x] 6.5 N/A — no existe ningún test unitario que haga asserts sobre el conteo exacto de `PERMISSIONS`/grants del seed (confirmado por búsqueda); la verificación real de idempotencia + grants correctos se hizo en vivo contra BD real en la tarea 1.3.
- [x] 6.6 `tests/unit/ui/(private)/settings/TicketSettingsForm.test.tsx` — editable con `canWrite=true`, deshabilitado sin él, `update()` recibe los valores editados. 3/3 verde.
- [x] 6.7 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` — omite logo si `null`, lo muestra si existe, renderiza datos de venta con ambos anchos de papel, no revienta con `ticketSettings=null` (fallback a 80mm). 4/4 verde.

## 7. Verificación

- [x] 7.1 `npm run build` OK. Ruta `/settings` compila real (2.67kB, ya no placeholder).
- [x] 7.2 `npx jest` verde — módulos `settings`/`rbac` (19/19 suites, 73/73 tests), UI `(private)/sales` completo (12/12 suites, 72/72 tests), UI `settings` (2/2 suites). **Regresión encontrada y corregida durante el apply**: `PrintableTicket` se renderiza siempre en el DOM (oculto sólo vía CSS `@media print`, que JSDOM no evalúa), duplicando texto de montos que un test preexistente de `SaleDetailPage.test.tsx` buscaba con `getByText("$16.00")` sin ámbito — colisionó con el nuevo renglón "Impuestos" del ticket imprimible que casualmente coincidía con el `taxTotal` default del fixture de test. Corregido agregando `data-testid="sale-totals"` al contenedor visible de totales y escopando esa aserción específica con `within(...)` — cambio mínimo, no se tocó la lógica de impresión.
- [x] 7.3 Smoke real (Playwright, BD real, dev server reiniciado tras el build):
  - Bucket `ticket-logo` creado en Supabase Storage (vía SQL `insert into storage.buckets`, mismo esquema público que `product-images`) ✓
  - `/settings` real: header text, footer text y `paperWidth=58mm` guardados y persistidos tras recargar la página ✓
  - **Subida de logo bloqueada por gap de entorno preexistente, no de este change**: `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_URL` (server-side) no están definidas en `.env.local` de este entorno — sólo existen las variantes `NEXT_PUBLIC_*`. Esto afecta IGUAL a la subida de imagen de producto ya existente (mismo patrón, mismas env vars) — confirmado no es una regresión de este change. La clave de servicio es sensible y no está disponible vía las herramientas de este agente; reportado al usuario aparte. Cobertura de la lógica de subida ya garantizada por los 6 tests unitarios de `UploadTicketLogoUseCase`/`DeleteTicketLogoUseCase` con storage in-memory.
  - Botón "Imprimir ticket" visible en venta con `status='cancelled'` (confirma "disponible sin importar el estado") ✓
  - Contenido del `PrintableTicket` verificado por inspección directa del DOM (sin disparar el diálogo nativo `window.print()`, evitado deliberadamente por ser un diálogo bloqueante): `width: 58mm` aplicado correctamente en el `@media print` inyectado, header/footer configurados se muestran, folio/fecha/cajero/sucursal/línea de producto/subtotal/impuestos/total exactos, logo omitido limpiamente (`hasImg: false`) sin roto al no haber ninguno subido — confirma el escenario "Missing logo does not break the layout" ✓
