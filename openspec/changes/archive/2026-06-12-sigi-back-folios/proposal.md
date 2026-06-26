## Why

El catálogo de folios actual creció sin gobierno: el seed RBAC inyecta `RECIBO` como folio único para abonos y los demás se crean manualmente desde la UI. El cliente entregó la lista canónica de 8 folios (`TK`, `TC`, `RB`, `COT`, `DEV`, `TS`, `AB`, `CP`) con reglas de uso por módulo (POS solo TK/TC/COT, Inventario solo TS, el resto para abonos/pagos/devoluciones). Hoy ningún módulo enforza esas reglas: el POS puede consumir un folio de devolución, el módulo de Abonos puede consumir el folio de cotización, etc. Necesitamos (a) un seed reproducible que pinte el catálogo canónico, (b) una columna `scope` que ate cada folio a su uso permitido y (c) enforcement en backend para que cada `CreateSale`/`CreateQuote`/`RegisterPayment` rechace folios con scope incompatible.

## What Changes

- **BREAKING — Schema**: agregar columna `Folio.scope` (`VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'`) con tres valores canónicos: `POS`, `INVENTORY`, `OPERATIONS`. La migración aplica el default a filas existentes para no romper la fase de cutover; el seed luego sobrescribe los valores correctos.
- **BREAKING — Catálogo de folios**: crear `prisma/seeds/folios.ts` invocable vía `npm run seed:folios`. El script:
  - Define los 8 folios canónicos con su `code`, `name`, `prefix`, `scope`, `isActive=true`.
  - Hace `upsert` por `code` de los 8 (idempotente; preserva `current_number` cuando ya existen).
  - Borra los folios NO contemplados en la lista canónica (`DELETE FROM folios WHERE code NOT IN (TK, TC, RB, COT, DEV, TS, AB, CP)`).
  - Si alguno de los folios a borrar tiene FK referencing rows (`sales`, `quotes`, `customer_payments`), el seed aborta con `exit 1` y mensaje claro indicando qué referencias hay; el operador debe limpiarlas antes de re-correr.
- **BREAKING — Seed RBAC**: remover de `prisma/seed.ts` el upsert inline de `folio RECIBO`. El seed RBAC vuelve a ocuparse solo de permisos, roles y `paymentMethod CREDITO`. Los folios pasan al nuevo seed dedicado.
- **Backend — Validación de scope en use cases**:
  - `CreateSaleUseCase` y `EditCompletedSaleUseCase` SHALL reject (`InactiveResourceError` o nuevo `FolioScopeMismatchError → 400`) si `folio.scope !== 'POS'`.
  - `CreateQuoteUseCase` y `UpdateQuoteUseCase` SHALL reject si `folio.scope !== 'POS'`.
  - `RegisterPaymentUseCase` SHALL reject si `folio.scope !== 'OPERATIONS'`.
- **Backend — Endpoint `GET /api/v1/admin/folios`**: agregar query param opcional `?scope=POS|INVENTORY|OPERATIONS` (rechaza valores fuera de la enum con 400). Cuando se omite, lista todos los folios visibles (comportamiento actual). El campo `scope` se incluye en `FolioDto`.
- **Backend — Endpoint `POST /api/v1/admin/folios`**: aceptar `scope` (requerido) y rechazar con 400 si el valor no pertenece a la enum. `PATCH` permite actualizar `scope` (el `code` sigue siendo inmutable).
- **Frontend — `useFoliosOptions`**: aceptar parámetro `scope?: FolioScope` que se reenvía como query string. Cachear por scope (clave compuesta).
- **Frontend — Default folios**:
  - `RegisterPaymentModal` cambia `code === 'RECIBO'` a `code === 'RB'` (default folio de pagos).
  - `PosPage`, `QuoteCreatePage`, `QuoteEditPage`, `ConvertQuoteModal`, `EditSalePage` invocan `useFoliosOptions({ scope: 'POS' })` para mostrar solo `TK`/`TC`/`COT`.
  - `RegisterPaymentModal` invoca `useFoliosOptions({ scope: 'OPERATIONS' })` para mostrar solo `RB`/`DEV`/`AB`/`CP`.
- **Documentación**: `CLAUDE.md` actualiza la sección de "Comandos frecuentes" (`npm run seed:folios`) y la regla de `Folio.scope` (en la sección "Capacidades CRUD admin").

## Capabilities

### New Capabilities

<!-- Ninguna capability nueva: el seed se extiende sobre la `data-seeding` existente y la columna `scope` se modela como modificación de `admin-folios`. -->

### Modified Capabilities

- `admin-folios`: agrega el campo `scope` al contrato del DTO, al body de create/update, al filtro de list y a la validación de regla (enum + immutable-on-code mismatch).
- `pos-api`: añade el requirement de que `CreateSaleUseCase` rechace folios cuyo `scope !== 'POS'`.
- `quotes-api`: añade el requirement de que `CreateQuoteUseCase` y `UpdateQuoteUseCase` rechacen folios cuyo `scope !== 'POS'`.
- `payments-api`: añade el requirement de que `RegisterPaymentUseCase` rechace folios cuyo `scope !== 'OPERATIONS'`. Cambia la spec del folio default de recibos de `RECIBO` a `RB`.
- `data-seeding`: agrega el requirement del script `prisma/seeds/folios.ts`, su comportamiento idempotente, la política de borrado de folios legacy y el comando `npm run seed:folios`.

## Impact

- **Código (backend)**:
  - `prisma/schema.prisma`: modelo `Folio` con campo `scope`.
  - Nueva migración `add_folios_scope_column` (`ALTER TABLE folios ADD COLUMN scope VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'`).
  - `src/modules/folios/domain/entities/Folio.ts` + `application/dto/FolioDto.ts` + `application/use-cases/{Create,Update,List}FolioUseCase.ts`: agregar `scope`.
  - `src/modules/folios/infrastructure/http/FoliosController.ts`: Zod schemas con `scope` + filtro en list.
  - `src/modules/pos/application/use-cases/CreateSaleUseCase.ts` y `EditCompletedSaleUseCase`: nuevo guard de scope.
  - `src/modules/quotes/application/use-cases/CreateQuoteUseCase.ts` y `UpdateQuoteUseCase`: idem.
  - `src/modules/payments/application/use-cases/RegisterPaymentUseCase.ts`: idem.
  - Nuevos errores de dominio `FolioScopeMismatchError` (módulos pos/quotes/payments comparten o cada uno tiene el suyo — decisión en `design.md`).
- **Código (seeds)**:
  - `prisma/seeds/folios.ts` (nuevo, ~150 líneas).
  - `prisma/seed.ts`: remover el bloque `prisma.folio.upsert({ where: { code: "RECIBO" } ... })`.
  - `package.json`: nuevo script `seed:folios`.
- **Código (frontend)**:
  - `app/_hooks/useFoliosOptions.ts`: aceptar `{ scope?: FolioScope }`.
  - `app/(private)/payments/_blocks/RegisterPaymentModal.tsx`: filtra por scope `OPERATIONS`, default `code === 'RB'`.
  - `app/(private)/pos/_blocks/PosPage.tsx`, `EditSalePage.tsx`, `quotes/_blocks/{QuoteCreatePage,QuoteEditPage,ConvertQuoteModal}.tsx`: filtran por scope `POS`.
  - `app/(private)/catalogs/folios/_blocks/FolioEditModal.tsx`: nuevo selector de `scope` (solo create; en edit es editable también).
  - `app/(private)/catalogs/folios/_blocks/FoliosListPage.tsx`: nueva columna "Scope".
- **Datos**: tras correr la migración + `npm run seed:folios`, la tabla `folios` queda con exactamente 8 filas: `TK/POS`, `TC/POS`, `COT/POS`, `TS/INVENTORY`, `RB/OPERATIONS`, `DEV/OPERATIONS`, `AB/OPERATIONS`, `CP/OPERATIONS`. Si había folios legacy con FKs activas el seed aborta y deja la DB intacta.
- **APIs**: nuevo campo `scope` en `FolioDto`, nuevo query param `?scope=` en GET, nuevo campo requerido en POST, nuevo código 400 cuando un sale/quote/payment apunta a folio con scope incompatible.
- **Operativo**: el orden documentado es `npx prisma migrate deploy` → `npm run seed` (RBAC) → `npm run seed:folios` (catálogo de folios canónico).
- **Riesgo**:
  - Cualquier sale/quote/payment activo apuntando a folios fuera del set canónico bloquea el seed; el operador debe decidir limpiar o renombrar antes de correrlo.
  - Tras la migración, todos los folios pre-existentes quedan con `scope='OPERATIONS'` por default; el seed corrige los 8 oficiales pero no toca a otros legacy (los borra). Si el operador quiere conservar un folio legacy debe agregarle el scope adecuado vía PATCH antes del seed (o reincorporarlo al set canónico).
  - FE de Abonos rompe inmediatamente al desplegar el backend nuevo si el deploy de FE va detrás: el folio `RECIBO` deja de existir y el modal queda sin default. Mitigación: desplegar FE+BE+seed en la misma ventana.
