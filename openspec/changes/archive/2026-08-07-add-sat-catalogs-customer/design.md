# Design: add-sat-catalogs-customer

## Context

El repo ya resuelve la carga de catálogos SAT de referencia para `Product.satProductCode` (`c_ClaveProdServ`) con un patrón probado: tabla `sat_product_service_codes`, seed idempotente, endpoint read-only `GET /api/v1/admin/sat-codes?search=` sin permiso adicional, y un combobox cliente (`SatCodeCombobox` + `useSatCodesSearch`). `Customer.taxRegime` y `Customer.cfdiUse` hoy se capturan con `input` de texto plano y el backend valida con regex (`^\d{3}$` / `^[A-Z]\d{2}$`).

Motivación: ver `proposal.md — Why`.

## Goals / Non-Goals

**Goals**
- Servir dos catálogos SAT oficiales (régimen fiscal y uso CFDI) con el mismo contrato de búsqueda que `sat-codes` de productos.
- Asistir la captura de `taxRegime`/`cfdiUse` en el modal de clientes (crear y editar) con combobox de selección forzada.
- Aceptar el catálogo completo de usos CFDI en el backend (incluye códigos de 4 caracteres `CP01`, `CN01`).

**Non-Goals**
- No cambiar `GET /api/v1/admin/sat-codes` (productos) ni su seed.
- No tocar `tax-rates` (impuestos del SAT, dominio distinto).
- No convertir los catálogos en recursos CRUD administrables.
- No validar coherencia régimen↔uso (el SAT define un mapeo; fuera de alcance en esta iteración).
- No reutilizar el `SatCodeCombobox` de productos (hardcodea el endpoint de productos y no fuerza selección); se crea un combobox genérico propio.

## Decisions

### D1. Data del seed: estática embebida (decisión de usuario)
Los dos catálogos (19 régimenes, 24 usos, CFDI 4.0) se embeben como arrays estáticos en `prisma/seeds/satCatalogs.ts` con procedencia documentada (phpcfdi `cfdi_40_regimenes_fiscales.sql` y `cfdi_40_usos_cfdi.sql`). Idempotencia vía `upsert` por `code` en una transacción.
- Alternativa descartada: TSV + checksum SHA-256 como `sat-codes` — sobre-ingeniería para 43 filas estáticas; el seed de folios ya usa arrays estáticos como precedente.

### D2. Endpoints separados (decisión de usuario)
`GET /api/v1/admin/sat-codes/regimen-fiscal?search=` y `GET /api/v1/admin/sat-codes/uso-cfdi?search=`. Mismo comportamiento que el endpoint de productos: sesión autenticada sin permiso adicional, `search` opcional (min 2 chars), filtra por código O descripción (case-insensitive), tope 20, respuesta `{ items: [{code, description}] }`.
- Alternativa descartada: `?catalog=` genérico — el usuario prefirió rutas separadas, cero riesgo sobre el flujo actual de productos.

### D3. Módulo `sat-codes` extensión por composición, no por parámetro
Dos nuevos pares (port + use case) `SearchSatTaxRegimesUseCase` / `SearchSatCfdiUsesUseCase`, dos repos Prisma (`PrismaSatTaxRegimeRepository`, `PrismaSatCfdiUseRepository`) y dos InMemory para tests, dos controllers y dos rutas. Cada pieza replica el esqueleto de 20–30 líneas del endpoint de productos. Se prefiere duplicación pequeña y explícita sobre un repo genérico con delegates de Prisma (typing verbose, menor legibilidad). El DTO `SatCodeDto {code, description}` se reutiliza.

### D4. Tablas espejo de `sat_product_service_codes`
`sat_tax_regimes(code VARCHAR(3) PK, description TEXT, created_at, updated_at)` y `sat_cfdi_uses(code VARCHAR(3) PK, description TEXT, ...)`. Sin `isActive` ni soft delete (catálogo de referencia). Migración nueva `add_sat_tax_regimes_and_cfdi_uses`.

### D5. Combobox genérico con selección forzada (decisión de usuario)
`SatCatalogCombobox` en `app/(private)/catalogs/customers/_blocks/` con prop `catalog: "regimen-fiscal" | "uso-cfdi"`. Hook genérico `useSatCatalogSearch(catalog, query)` en `app/_hooks/` (mismo esqueleto que `useSatCodesSearch`, parametrizando el endpoint). Selección forzada:
- El estado `selected` guarda el último código válido; `query` es el texto del input.
- Escribir filtra opciones (query efectivo = texto tecleado; si vacío, usa `selected` para resolver la descripción del código actual).
- Al seleccionar una opción: `query = code`, `selected = code`, `onChange(code)`.
- Al limpiar el input: `selected = ""`, `onChange("")` → el modal mapea a `null`.
- Al blur con texto que no coincide con `selected`: se revierte `query = selected` (el texto libre no sobrevive).

### D6. Regex `cfdiUse` relajada
Backend (`CustomersController` create + update) y schema zod cliente pasan de `^[A-Z]\d{2}$` a `^[A-Z]{1,2}\d{2}$`. Necesario para guardar `CP01`/`CN01` del catálogo oficial. `taxRegime` sigue `^\d{3}$`. El `Input` de 4 caracteres se habilita (maxLength se ajusta a 4 para usos CFDI; `taxRegime` mantiene 3).

## Risks / Trade-offs

- [Regla de negocio desconocida: validación de unicidad de `cfdiUse` en CFDI] → No aplica validación cruzada; se documenta como Non-Goal.
- [Cliente existente con `cfdiUse`/`taxRegime` fuera del catálogo (datos legacy)] → Al editar, el combobox muestra el código precargado aunque no esté en el catálogo; la descripción no resuelve pero el código se conserva mientras no se toque. Si el usuario lo reemplaza, la selección forzada exige un código del catálogo.
- [Dos `fetch` de catálogo al abrir el modal] → Mínimo (43 filas en total); debounce 300 ms ya presente; acceptable.
- [Relajar regex puede aceptar códigos CFDI que el SAT considere inválidos (p. ej. `AB12`)] → El combobox fuerza selección del catálogo oficial en la UI; la regex es una red de seguridad de formato, no de membresía.

## Migration Plan

1. Crear migración `add_sat_tax_regimes_and_cfdi_uses` (SQL manual consistente con `20260802000002_add_sat_product_service_codes`).
2. `npx prisma migrate deploy` contra Supabase (`qzzjpyepggwautckqeex`, vía `DIRECT_URL`).
3. `npx prisma generate`.
4. `npm run seed:sat-catalogs` (idempotente; puede repetirse).
5. Deploy del código (frontend + rutas).

Rollback: migración `down` (DROP de las dos tablas) + revert del commit. No hay FK ni data de negocio que dependa de las tablas; el código de clientes ya guardaba `taxRegime`/`cfdiUse` como columnas sueltas.

## Open Questions

Ninguna bloqueante. El mapeo régimen↔uso del SAT queda fuera de alcance (Non-Goal) y puede decidirse en una iteración futura sin alterar estos specs.
