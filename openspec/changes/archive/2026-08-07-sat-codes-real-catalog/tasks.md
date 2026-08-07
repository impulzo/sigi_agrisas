## 1. Seed — catálogo real `c_ClaveProdServ`

- [x] 1.1 `prisma/seeds/data/sat-codes.tsv`: data file del catálogo real (52,513 filas, `code\t description`, UTF-8) generado desde `phpcfdi/resources-sat-catalogs` (`cfdi_40_productos_servicios.sql`).
- [x] 1.2 `prisma/seeds/lib/satCatalog.ts`: `SatCatalogEntry`, `SAT_CATALOG_SOURCE` (URL, fecha, conteo, SHA-256 fuente y TSV), `sha256()`, `verifySatCatalogChecksum()`, `parseSatCatalogTsv()` (valida `^\d{8}$`, desc no vacía, sin duplicados), `loadSatCatalog()` (lee TSV, verifica checksum, valida rowCount).
- [x] 1.3 `prisma/seeds/satCodes.ts`: reescrito a resync total idempotente (`deleteMany` + `createMany` en lotes de 5,000, en `prisma.$transaction` con `maxWait`/`timeout` ampliados para el pooler), con resumen de corrida y procedencia en la salida.

## 2. UI — combobox SAT en crear/editar producto

- [x] 2.1 `ProductEditModal.tsx`: reemplazar el input de texto libre de `satProductCode` por `SatCodeCombobox` (mismo componente que usa `ProductGeneralTab`). Conservar validación `^\d{8}$`, diff en edit y envío de `null` al limpiar.

## 3. Tests

- [x] 3.1 Unit `tests/unit/modules/seeds/satCatalog.test.ts`: `parseSatCatalogTsv` (código inválido, desc vacía, duplicado, línea sin tab), `verifySatCatalogChecksum` (mismatch aborta), conteo/checksum del TSV real embebido.
- [x] 3.2 UI (jsdom) en el test canónico `tests/unit/ui/(private)/catalogs/products/ProductEditModal.test.tsx`: describe `combobox Cód. SAT (catálogo real)` — sugerencias `code — description`, selección completa el código, pre-fill en edit, captura manual de 8 dígitos válidos, limpiar envía `satProductCode: null`. El input de `satProductCode` del test de validación se migró a `SatCodeCombobox` (textbox index 3).
- [x] 3.2b Unit hook `tests/unit/ui/_hooks/useSatCodesSearch.test.ts` (nuevo): `<2 chars` no llama al endpoint ni expone opciones; `>=2 chars` consulta `?search=` tras el debounce de 300ms; encoding de query; tolera error de red; re-dispara por cambio de query.
- [x] 3.3 E2E Playwright (`tests/e2e/admin-products-inventory.spec.ts`): combobox SAT visible en modal de crear; filtro por código y por nombre muestra sugerencias del catálogo real; seleccionar sugerencia completa el código. Fix de infra en `tests/e2e/helpers.ts` (login aterriza en `/pos`, no `/dashboard`).

## 4. Verificación

- [x] 4.1 `npm test` (módulo sat-codes + seeds + UI nuevo sin regresiones; las 2 suites de integración que fallan —`products-crud`, `quotes-conversion-edge-cases`— son fallas de estado de la BD dev preexistentes, no relacionadas). UI: 1497 tests pasan.
- [x] 4.2 `npm run build` sin errores de tipos.
- [x] 4.3 `npm run seed:sat-codes` contra la BD dev (resync 56 → 52,513).
- [x] 4.4 Playwright e2e real (server dev en 3001): 11 passed / 6 skipped en `admin-products-inventory.spec.ts`.
- [x] 4.5 `openspec validate sat-codes-real-catalog --strict` sin errores.
