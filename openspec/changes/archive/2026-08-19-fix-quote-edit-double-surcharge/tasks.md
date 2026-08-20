## 1. Fix — no re-recargar el snapshot ya recargado

- [x] 1.1 `app/(private)/pos/_logic/lib/computeTotalsClient.ts`: exportar `isFractionalQuantity` (hoy privada, línea 13) para reutilizarla en `QuoteEditPage.tsx` sin triplicar la implementación.
- [x] 1.2 `app/(private)/quotes/_blocks/QuoteEditPage.tsx:72-80`: al construir `fakePrice.price`, para líneas con `isFractionalQuantity(item.quantity)` true, usar `item.unitPrice / (1 + dosificationSurchargePct / 100)` en vez de `item.unitPrice` directo — revierte el recargo ya aplicado en el snapshot para que `useCart`/`computeTotalsClient` lo vuelva a aplicar una sola vez con el `dosificationSurchargePct` vigente. Para líneas de cantidad entera, sin cambio (`fakePrice.price = item.unitPrice`, ya correcto).
- [x] 1.3 Confirmar que `handleSubmit` (línea ~136-148) sigue sin enviar `unitPrice` en el `PATCH` — no requiere cambio, sólo verificación de que el fix no lo introduce por error.

## 2. Tests

- [x] 2.1 `tests/unit/ui/(private)/quotes/_blocks/QuoteEditPage.test.tsx`: nuevo caso — mockear `useQuoteDetail` con un item de cantidad fraccionaria cuyo `unitPrice` ya incluye el recargo (p. ej. `quantity: 0.5`, `unitPrice: 105` para base `100` y `dosificationSurchargePct` mockeado en `7`), y verificar que el `price` pasado a `addLine`/`useCart` corresponde al precio base revertido (`105 / 1.07`), no a `105` directo.
- [x] 2.2 Mismo archivo: caso de regresión — línea de cantidad entera (`quantity: 2`) conserva `fakePrice.price = item.unitPrice` sin modificar (sin división).
- [x] 2.3 Confirmar que `computeTotalsClient.test.ts` sigue en verde sin cambios (la función pura no se modifica, sólo se exporta un helper adicional).

## 3. Verificación

- [x] 3.1 `npm test` — 3422/3423 en verde en la corrida completa; `RolesPage.test.tsx` falló por leakage de fake timers entre archivos (flake de aislamiento, no relacionado a este cambio — confirmado en verde 6/6 corriendo el archivo solo).
- [x] 3.2 `npm run build` — sin errores de tipos (corrido bajo Node 20.20.2, ver nota de entorno en `fix-dosification-surcharge-ui/tasks.md:3.2`).
- [x] 3.3 Manual (Playwright, 2026-08-19): reabierta la misma cotización `draft` sembrada en `fix-dosification-surcharge-ui` (línea `qty=0.5`, `unitPrice=105` snapshot, `dosificationSurchargePct=5%` vigente). Antes del fix: UI mostraba $55.13. Después del fix: UI muestra **$52.50** al cargar, coincide exacto con `GET /api/v1/admin/quotes/:id` (`total: 52.5`). Guardado sin modificar nada → `PATCH` persiste `total: 52.5` sin cambio. Confirmado: ya no duplica el recargo.
