## Context

Ver `proposal.md` — Why / Historia de Usuario. Constraints técnicas relevantes:

- El módulo `src/modules/sat-codes/` ya aloja 3 sub-catálogos SAT (`SatCode`, `SatTaxRegime`, `SatCfdiUse`), todos sin capa `domain/` (puro lookup, sin invariantes de negocio) y todos sin FK hacia las tablas que consumen sus códigos (`Product.satProductCode`, `Customer.taxRegime`, `Customer.cfdiUse`) — columna suelta + validación de formato, para permitir resync total del catálogo sin romper referencias.
- `InvoiceItem` (facturación/CFDI) ya tenía un campo `satUnitCode` separado de `unit`, nunca alimentado desde `Product` — `StampInvoiceUseCase` siempre mandaba defaults hardcodeados (`H87`/`PZA`).
- Ya existe un molecule genérico `SatCatalogCombobox` (`app/_components/molecules/SatCatalogCombobox/`) + hook `useSatCatalogSearch` reutilizado hoy para régimen fiscal y uso CFDI de clientes, con endpoint `GET /api/v1/admin/sat-codes/<catalog>?search=`.
- Guardrail automatizado (`tests/unit/ui/design-system/tokens.test.ts`) bloquea `<button>`/`<table>`/`<select>` crudos **nuevos** en `_blocks/` — sólo los ya existentes (allowlist de deuda declarada) pasan.

## Goals / Non-Goals

**Goals:**
- Catálogo de referencia SAT completo y real (`c_ClaveUnidad`) consumible por búsqueda, mismo patrón que los 3 catálogos SAT existentes.
- `Product.unit` deja de ser texto libre inconsistente y pasa a ser una clave SAT válida verificable por formato.
- Ningún sitio del sistema muestra el código crudo al usuario final — siempre se resuelve a descripción legible con fallback seguro.
- Cero regresión en flujos existentes que no tocan `unit` (ventas, facturación, kardex histórico).

**Non-Goals:**
- No se construye un catálogo CRUD administrable (fila 1 de la historia no pide gestionar el catálogo, sólo consumirlo).
- No se conecta el código real hacia CFDI/facturación — `StampInvoiceUseCase` no se toca.
- No se hace backfill automático de productos existentes con `unit` en texto libre — la migración es puramente aditiva a nivel de schema; la limpieza de datos legados es responsabilidad de cada edición manual futura.
- No se agrega FK entre `products.unit` y `sat_units_of_measure.code`.

## Decisions

**1. Catálogo de referencia read-only, no CRUD administrable.**
Igual patrón que `SatProductServiceCode`/`SatTaxRegime`/`SatCfdiUse`: modelo simple `{code, description}`, sin capa `domain/`, sembrado por script, expuesto sólo como búsqueda sin permiso RBAC adicional. Alternativa descartada: catálogo CRUD tipo `tax-rates` con FK real — el AC1/AC2 de la historia sólo piden *buscar y seleccionar*, no *administrar/restringir* el catálogo; el precedente ya establecido en el repo para catálogos SAT completos es read-only.

**2. `Product.unit` se reemplaza (no se agrega campo aparte).**
Se evaluó agregar `Product.satUnitCode` como campo nuevo, dejando `unit` intacto (cero blast radius en displays existentes). Se descartó explícitamente por decisión del usuario: aunque `InvoiceItem.satUnitCode` ya distinguía "clave SAT" de "unit" (texto libre), el usuario prefirió no mantener dos conceptos de unidad en `Product` y aceptó el costo de actualizar los sitios de display (AC5) a cambio de un modelo de datos más simple.

**3. Reutilizar `SatCatalogCombobox` en vez de clonar un combobox bespoke.**
Se implementó primero un componente nuevo `SatUnitCombobox.tsx` clonado de `SatCodeCombobox.tsx` — el guardrail de design-system lo rechazó (nuevo `<button>` crudo en `_blocks/`, no permitido salvo deuda ya declarada). Se reemplazó por el molecule genérico ya existente `SatCatalogCombobox` (usado hoy para régimen fiscal/uso CFDI), agregando `"clave-unidad"` al union type `SatCatalog` de `useSatCatalogSearch`. Efecto colateral aceptado: a diferencia de `SatCodeCombobox` (permite texto libre de 8 dígitos sin seleccionar sugerencia), `SatCatalogCombobox` sólo confirma el valor al **seleccionar una sugerencia** o al vaciar el campo — escribir sin seleccionar no dispara `onChange`. Es el mismo comportamiento ya validado en producción para régimen fiscal/uso CFDI; se documenta aquí para que no se lea como bug.

**4. Formato de validación por regex, no por existencia en catálogo.**
`unit` valida `^[A-Za-z0-9]{2,3}$` (rango real observado en las 2418 claves oficiales: 2–3 caracteres alfanuméricos, incluye mezcla de mayúsculas/minúsculas como `"Ohm"`, `"Dx"`). No se valida contra el catálogo en el momento de guardar (no hay JOIN/lookup en el use case) — consistente con `satProductCode`, permite resync del catálogo sin romper productos existentes.

**5. Resolución de `unitDescription` en la capa de infraestructura Prisma, no en use cases.**
Util compartido `src/shared/infrastructure/sat-codes/resolveUnitDescriptions.ts` (batch lookup `code → description`), invocado dentro de cada repositorio Prisma (`PrismaProductRepository`, `PrismaInventoryReportRepository`, `PrismaDepartmentPriceListRepository`) y en `recordInventoryMovement.ts`. Los use cases siguen recibiendo sólo el port (`ProductRepository`, etc.) — no conocen Prisma ni el catálogo SAT directamente, respetando la regla de capas del backend (CLAUDE.md: "los use cases reciben ports, nunca implementaciones concretas").

**6. Snapshot de descripción (no de código) en `inventory_movements.unit`.**
Igual filosofía que el snapshot por línea ya usado en `SaleItem`/`QuoteItem`/`ReturnItem`: el kardex histórico debe seguir siendo legible aunque el catálogo SAT se re-siembre después. `recordInventoryMovement.ts` resuelve la descripción antes de persistir, en vez de guardar el código crudo.

## Risks / Trade-offs

- **[Riesgo] Datos legados (`unit` en texto libre) nunca se limpian automáticamente** → Mitigación: `unitDescription: null` + fallback al valor crudo en cada sitio de display (AC4); no rompe nada, sólo se ve menos pulido hasta que cada producto se edite con una clave real.
- **[Riesgo] `SatCatalogCombobox` no acepta texto libre sin seleccionar sugerencia — un usuario que sabe la clave de memoria y no ve la sugerencia (ej. red lenta) puede quedarse sin poder guardar** → Mitigación: comportamiento ya aceptado y probado para régimen fiscal/uso CFDI; el catálogo es pequeño (2418 filas) y la búsqueda es rápida (<1s típico). No se resuelve en este cambio — si se vuelve un problema real, es un cambio futuro acotado al molecule compartido (afecta también a régimen fiscal/uso CFDI).
- **[Riesgo] Endpoint de catálogo sin permiso RBAC específico** → Mitigación: mismo criterio ya aplicado y aceptado para los otros 3 catálogos SAT (dato de referencia público, no de negocio); requiere sesión autenticada igual.

## Migration Plan

1. Migración Prisma aditiva (`CREATE TABLE sat_units_of_measure`) — no toca `products` ni ninguna tabla existente, sin downtime.
2. Seed (`npm run seed:sat-units`) puebla el catálogo — idempotente, resync total transaccional (delete+insert), seguro de re-correr.
3. Deploy de código backend (regex de validación + resolución de `unitDescription`) y frontend (combobox) en el mismo release — no hay periodo intermedio con contrato inconsistente porque la validación de formato y el catálogo se despliegan juntos.
4. Rollback: revertir el deploy de código es seguro (la tabla `sat_units_of_measure` puede quedar sin uso sin romper nada); revertir la migración de schema sólo si se decide abandonar la feature por completo (no hay dependencias de otras tablas hacia `sat_units_of_measure`).
5. Sin backfill de datos — productos existentes no se tocan.
