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
- [ ] 3.3 Manual: en `/quotes/new`, agregar línea con cantidad fraccionaria (p. ej. `0.5`) y confirmar que el total en pantalla coincide con el total del recurso creado (`GET /api/v1/admin/quotes/:id`). Repetir en `/quotes/[id]/edit` (estado `draft`) y `/sales/[id]/edit` (venta desde sucursal HQ). — pendiente, requiere sesión de navegador/datos reales; no verificable con las herramientas de este agente sin browser automation activo.
