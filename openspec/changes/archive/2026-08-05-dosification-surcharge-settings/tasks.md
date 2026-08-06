## 1. Backend — dominio de dosificaciones

- [x] 1.1 `src/modules/products/domain/services/DosificationPriceCalculator.ts`: quitado `DOSIFICATION_SURCHARGE_PCT = 7.0`; firma cambiada a `computeUnitPrice(basePrice, numParts, surchargePct)`.
- [x] 1.2 Actualizado `DosificationPriceCalculator.test.ts` con `surchargePct` explícito (caso 5% default, caso 7% custom).

## 2. Backend — módulo settings, recurso pricing (mismo patrón que ticket_settings)

- [x] 2.1 Migración Prisma aplicada: tabla `pricing_settings` (`prisma/migrations/20260806000001_add_pricing_settings/`, aplicada vía `prisma migrate deploy` — `migrate dev` detectó drift no relacionado en tablas RBAC, se evitó tocarlas).
- [x] 2.2 `PricingSettings.ts` + `DEFAULT_PRICING_SETTINGS`.
- [x] 2.3 `PricingSettingsRepository.ts` (puerto).
- [x] 2.4 `GetPricingSettingsUseCase.ts`/`UpdatePricingSettingsUseCase.ts`. Validación (`finite`, `>= 0`) vive en Zod en el controller, mismo patrón que `updateTicketSchema`.
- [x] 2.5 `PrismaPricingSettingsRepository.ts` + `InMemoryPricingSettingsRepository.ts`.
- [x] 2.6 `SettingsController.ts`: `getPricing`/`updatePricing`.
- [x] 2.7 Endpoint `app/api/v1/admin/settings/pricing/route.ts`.
- [x] 2.8 `settings/infrastructure/di/container.ts` actualizado.

## 3. Backend — conectar dosificaciones con el % configurado (3 callers reales, no solo el catálogo)

- [x] 3.1 Catálogo: `toProductDosificationDto.ts` + `List/Create/UpdateProductDosificationUseCase.ts` inyectan `PricingSettingsRepository`.
- [x] 3.2 `PosLookupService.getDosificationSurchargePct()` agregado al puerto; implementado en `PrismaPosLookupService` (reutiliza `PrismaPricingSettingsRepository`).
- [x] 3.3 `CreateSaleUseCase.ts`/`EditCompletedSaleUseCase.ts` actualizados.
- [x] 3.4 Tests de ambos use cases actualizados: mock `getDosificationSurchargePct` devuelve 7 explícito (documentado en comentario) para no romper los valores esperados existentes — el default 5% ya está cubierto en `DosificationPriceCalculator.test.ts` y en los tests de catálogo.
- [x] 3.5 Tests de `List/Create/UpdateProductDosificationUseCase` actualizados con `InMemoryPricingSettingsRepository` (default 5% y custom 8%).
- [x] 3.6 `tests/integration/modules/products/products-crud.test.ts` actualizado (10.7→10.5, wiring del nuevo repo). Ningún test de integración de `pos` sale afectado (no había valores 1.07/26.75 hardcodeados ahí, ya confirmado corriendo el módulo completo).

## 4. Frontend — sección "Precios" en /settings

- [x] 4.1 `PricingSettingsDto`/`UpdatePricingSettingsBody` agregados a `types/api.ts`.
- [x] 4.2 `getPricingSettings.ts`/`updatePricingSettings.ts`.
- [x] 4.3 `usePricingSettings.ts`/`usePricingSettingsMutations.ts`.
- [x] 4.4 `PricingSettingsForm.tsx` — input numérico, validación cliente `>= 0`, gateado por `canWrite`/`canRead`.
- [x] 4.5 `SettingsPage.tsx` reestructurado en 2 secciones ("Ticket de venta" / "Precios") bajo un único `<h1>Configuración</h1>` (no había sistema de tabs previo que reutilizar).

## 5. Specs y verificación

- [x] 5.1 `npm test` completo: 2905 tests, única excepción intermitente `products-crud.test.ts` (deadlock Postgres por paralelismo) y `quotes-conversion-edge-cases.test.ts` (colisión RFC, ya conocida de Change 1) — ambas confirmadas 100% verdes en aislamiento, no relacionadas a este change.
- [x] 5.2 `npm run build` sin errores de tipos (confirmado 2 veces, antes y después del frontend).
- [x] 5.3 Migración aplicada vía `prisma migrate deploy` (ver nota 2.1 — no `migrate dev` por drift preexistente no relacionado).
- [x] 5.4 Playwright real: `/settings` sección Precios muestra 5% default; cambiado a 8% y guardado; producto RAF (precio default $110) con dosificación nueva `numParts=4` → precio calculado `$29.70` = (110/4)×1.08, confirmando propagación inmediata sin reiniciar el servidor. Datos de prueba limpiados (dosificación desactivada, % restaurado a 5%).
- [x] 5.5 `openspec validate dosification-surcharge-settings --strict` sin errores (confirmado en cada iteración de scope).
