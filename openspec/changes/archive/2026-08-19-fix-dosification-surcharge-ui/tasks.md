## 1. Fix — propagar dosificationSurchargePct

- [x] 1.1 `app/(private)/quotes/_blocks/QuoteCreatePage.tsx`: importar `usePricingSettingsOptions` de `app/_hooks/usePricingSettingsOptions.ts`, obtener `dosificationSurchargePct` y pasarlo a `useCart(dosificationSurchargePct)` en línea 35, replicando el patrón de `app/(private)/pos/_blocks/PosPage.tsx:48,59`.
- [x] 1.2 `app/(private)/quotes/_blocks/QuoteEditPage.tsx`: mismo cambio en línea 41.
- [x] 1.3 `app/(private)/sales/_blocks/EditSalePage.tsx`: mismo cambio en línea 61.

## 2. Tests

- [x] 2.1 `tests/unit/ui/(private)/quotes/_blocks/QuoteCreatePage.test.tsx`: creado; verifica que `useCart` recibe el `dosificationSurchargePct` mockeado (7) de `usePricingSettingsOptions`.
- [x] 2.2 `tests/unit/ui/(private)/quotes/_blocks/QuoteEditPage.test.tsx`: extendido con el mismo caso.
- [x] 2.3 `tests/unit/ui/(private)/sales/_blocks/EditSalePage.padding.test.tsx`: extendido con el mismo caso.
- [x] 2.4 Confirmado: caso `surchargePct=0` de `computeTotalsClient.test.ts:112` sigue en verde (sin regresión en líneas sin dosificación/cantidad entera).

## 3. Verificación

- [x] 3.1 `npm test` — 3311/3311 tests en verde. Una suite de integración (`tests/integration/modules/products/products-crud.test.ts`) no pudo correr por un `FK constraint violated (inventory_movements_product_id_fkey)` al hacer cleanup contra la BD real de Supabase — estado preexistente de datos huérfanos de la feature de trazabilidad de lote/caducidad (`a29a43a`), no relacionado con este cambio (3 archivos frontend, sin tocar backend/BD).
- [x] 3.2 `npm run build` — sin errores de tipos (corrido bajo Node 20.20.2; el entorno local por defecto usa Node 18.0.0, que Next.js rechaza por versión mínima — issue de entorno preexistente, no introducido por este cambio).
- [x] 3.3 Manual (Playwright, 2026-08-19): ejecutado contra dev DB seedeada ad-hoc (producto TESTPROD, precio General $100, stock Matriz).
  - `/quotes/new`: línea qty=0.5 → UI muestra Total **$52.50**; `GET /quotes/:id` post-creación persiste **$52.50**. ✅ Coincide.
  - `/quotes/[id]/edit` (misma cotización, `draft`): bug de doble recargo encontrado y corregido en `QuoteEditPage.tsx:76-78` — `basePrice` ahora revierte el recargo (`item.unitPrice / (1 + dosificationSurchargePct / 100)`) antes de pasarlo a `addLine`, para que `useCart`/`computeTotalsClient` lo recargue una sola vez. UI y `GET /quotes/:id` ahora coinciden en **$52.50**. ✅ Cumple el Scenario "Edición de cotización con línea fraccionaria refleja el recargo vigente" de `specs/pos-ui/spec.md`.
  - `/sales/[id]/edit` (venta HQ vía `branches:access_all`): el carrito NO precarga los items existentes de la venta (gap preexistente, no introducido por este cambio — `EditSalePage.tsx` sólo restaura `paymentMethodId`/`customerId`/`notes`, nunca `lines`). Al re-agregar el producto manualmente (mismo flujo que POS, precio de catálogo fresco, sin snapshot), UI muestra Total **$52.50**; PATCH persiste **$52.50**. ✅ Coincide (no exhibe el bug de doble recargo porque no pasa por el path de snapshot).
  - Bug adicional no relacionado encontrado en el mismo flujo: `editSaleSchema` en `SalesController.ts:82` tiene `customerId: z.string().uuid().optional()` (sin `.nullable()`), pero `EditSalePage` envía `customerId: null` cuando la venta no tiene cliente → PATCH 400 `"Expected string, received null"`, reportado en UI como "Network error" genérico. Bloquea guardar ediciones de ventas sin cliente. Pre-existente, fuera de alcance de este cambio.
