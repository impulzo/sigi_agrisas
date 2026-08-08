## 1. Datos y backend — tablas, seed y endpoints

- [x] 1.1 Crear migración `add_sat_tax_regimes_and_cfdi_uses` (tablas `sat_tax_regimes`, `sat_cfdi_uses`, espejo de `sat_product_service_codes`)
- [x] 1.2 Añadir modelos `SatTaxRegime` y `SatCfdiUse` a `prisma/schema.prisma`
- [x] 1.3 `npx prisma migrate deploy` contra Supabase + `npx prisma generate`
- [x] 1.4 Crear seed `prisma/seeds/satCatalogs.ts` con data estática CFDI 4.0 (19 régimenes, 24 usos) idempotente vía upsert, y registrar script `seed:sat-catalogs` en `package.json`
- [x] 1.5 Correr `npm run seed:sat-catalogs` y verificar conteos (19/24)

## 2. Backend — módulo sat-codes

- [x] 2.1 Ports `SatTaxRegimeRepository` y `SatCfdiUseRepository` (firma `search(query, limit)` reutilizando tipo `SatCode`)
- [x] 2.2 Use cases `SearchSatTaxRegimesUseCase` y `SearchSatCfdiUsesUseCase`
- [x] 2.3 Repos Prisma `PrismaSatTaxRegimeRepository` y `PrismaSatCfdiUseRepository` (misma lógica que productos, nuevas tablas)
- [x] 2.4 Repos InMemory `InMemorySatTaxRegimeRepository` y `InMemorySatCfdiUseRepository`
- [x] 2.5 Controllers `SatTaxRegimesController` y `SatCfdiUsesController` (schema search min 2 chars)
- [x] 2.6 Extender `src/modules/sat-codes/infrastructure/di/container.ts` con los dos controllers
- [x] 2.7 Rutas `app/api/v1/admin/sat-codes/regimen-fiscal/route.ts` y `.../uso-cfdi/route.ts`

## 3. Backend — relajar regex cfdiUse

- [x] 3.1 `CustomersController`: regex `cfdiUse` → `^[A-Z]{1,2}\d{2}$` (create + update)
- [x] 3.2 Actualizar tests existentes de clientes que asuman el regex anterior si rompen

## 4. Frontend — hook y combobox

- [x] 4.1 Crear `app/_hooks/useSatCatalogSearch.ts` (parametrizado por catálogo, debounce 300 ms, min 2 chars)
- [x] 4.2 Crear `app/_components/molecules/SatCatalogCombobox/SatCatalogCombobox.tsx` (molecule compartido; selección forzada, filtra por nombre, guarda código, revierte texto libre al blur) y consumirlo desde `CustomerEditModal`

## 5. Frontend — modal de clientes

- [x] 5.1 Reemplazar inputs de `taxRegime` y `cfdiUse` por `SatCatalogCombobox` en `CustomerEditModal` (crear y editar)
- [x] 5.2 Sincronizar schema zod cliente (`_logic/schemas/customer.schema.ts`): `cfdiUse` → `^[A-Z]{1,2}\d{2}$` y ajustar maxLength

## 6. Tests

- [x] 6.1 Unit: `SearchSatTaxRegimesUseCase` y `SearchSatCfdiUsesUseCase` (in-memory)
- [x] 6.2 Unit: controllers `SatTaxRegimesController` y `SatCfdiUsesController`
- [x] 6.3 Integración: `GET /sat-codes/regimen-fiscal` y `GET /sat-codes/uso-cfdi` (búsqueda por código/descripción, min 2 chars, tope 20)
- [x] 6.4 Unit: `SatCatalogCombobox` (filtra, selecciona, revierte texto libre, carga en crear/editar)
- [x] 6.5 Unit: `CustomerEditModal` — catálogos cargan en ambos modos, selección guarda código
- [x] 6.6 Unit: schema zod cliente acepta `CP01`/`CN01`
- [x] 6.7 Correr suite completa (`npm test`), lint y build

## 7. Verificación UI (playwright)

- [x] 7.1 Levantar dev server con DB sembrada y verificar comboboxes en crear/editar cliente (búsqueda por nombre, guardado de código, rechazo de texto libre)

## 8. Catálogos SAT en el alta rápida de cliente desde ventas

- [x] 8.1 `CustomerQuickAddModal` (POS/Cotizaciones/Facturación): reemplazar los inputs de texto de `taxRegime`/`cfdiUse` por `SatCatalogCombobox` en la sección "Datos fiscales (opcionales)"
- [x] 8.2 `pos/_logic/schemas/customerQuickAdd.schema.ts`: relajar regex `cfdiUse` → `^[A-Z]{1,2}\d{2}$` (acepta `CP01`/`CN01`)
- [x] 8.3 Tests: `CustomerQuickAddModal` (comboboxes cargan, selección guarda código, `CP01` aceptado) + schema quick-add (`customerQuickAdd.schema.test.ts`)
- [x] 8.4 Mover test del combobox a `tests/unit/ui/_components/molecules/SatCatalogCombobox.test.tsx` (tras promoción a molecule compartido)
- [x] 8.5 Actualizar specs (`customers-ui`, `proposal.md`) y verificar: `npx tsc --noEmit`, `npm test` (filtrado), build
