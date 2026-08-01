## Context

Ver `proposal.md - Why`. `satProductCode` en `products-api` no cambia de contrato — sigue siendo `string | null` validado `^\d{8}$`. Este change sólo agrega un catálogo de referencia + UI de búsqueda para poblarlo con menos error humano, sin bloquear la captura manual mientras el catálogo sembrado sea un subconjunto.

## Goals / Non-Goals

**Goals:** tabla de catálogo SAT de sólo lectura, endpoint de búsqueda, picker en el formulario de producto, subconjunto placeholder claramente marcado.

**Non-Goals:** no se carga el catálogo oficial completo (+52,000 códigos) — decisión explícita del usuario, fuera de alcance por falta de fuente de datos verificada en este entorno. No se agrega CRUD administrable del catálogo SAT (es de sólo lectura, poblado vía seed).

## Decisions

**D1 — Tabla de sólo lectura, sin RBAC nuevo**
El catálogo SAT es información pública de referencia (no datos de negocio del cliente) — cualquier usuario autenticado puede buscar, sin permiso `sat_codes:read` nuevo. Reduce fricción de RBAC para un catálogo que no tiene noción de "propiedad" ni sensibilidad.

**D2 — Búsqueda simple `ILIKE`, no full-text search**
El subconjunto placeholder es pequeño (~50-100 filas) — `ILIKE '%search%'` sobre `code`/`description` es suficiente y evita introducir extensiones Postgres (`pg_trgm`, `tsvector`) que sólo se justificarían con el catálogo completo. Si se carga el catálogo oficial después, esta decisión se revisita.

**D3 — Patrón `Combobox` + hook, igual que `TaxRateSelect`/`useTaxRatesOptions`**
Reusa el patrón ya establecido en el proyecto para selectores con catálogo (`TaxRateSelect.tsx`, `useTaxRatesOptions`) en vez de inventar un componente nuevo — consistencia de UX y menor superficie de código nuevo.

**D4 — Captura manual como respaldo, no bloqueante**
Dado que el catálogo sembrado es parcial, el campo NO se vuelve un `<select>` estricto (que forzaría elegir sólo de la lista) — sigue aceptando texto libre de 8 dígitos. Esto evita que el picker bloquee al operador si el código real no está en el subconjunto placeholder.

## Risks / Trade-offs

- **[Riesgo] Datos placeholder pueden ser incorrectos o quedar desactualizados frente al catálogo oficial vigente del SAT.** Mitigado: comentario explícito en el seed + requirement dedicado (`Seed placeholder disclosure`) + este mismo riesgo documentado en el reporte final de la sesión. El campo sigue validando sólo formato, nunca fuerza a elegir un código del subconjunto — el placeholder no puede *introducir* un error que el campo de texto libre anterior no permitiera ya.
- **[Trade-off] Catálogo incompleto por ahora** — aceptado explícitamente por el usuario; la carga completa queda para cuando exista una fuente de datos verificada (archivo oficial del SAT).

## Migration Plan

Nueva tabla `sat_product_service_codes` (migración simple, sin backfill — tabla nueva, poblada por seed). `npx prisma migrate deploy` + seed `prisma/seeds/satCodes.ts` (nuevo, idempotente vía `upsert`).

## Open Questions

_Ninguna — alcance y limitación de datos confirmados explícitamente por el usuario antes de escribir esta propuesta._
