## Context

El módulo `tax-rates` (change previo, ya implementado y committeado en HEAD, 34/34 tareas, pendiente de archivar) expone un catálogo simplificado de tasas de impuesto: `code`, `name`, `description`, `rate` (factor 0–1), `isActive`. `products.taxRateId` referencia esta tabla de forma **informativa** — el cálculo real de IVA/IEPS en ventas/cotizaciones sigue usando `product.ivaRate`/`product.iepsRate` (snapshot por línea, ver `CLAUDE.md` §"Snapshot por línea"). Esta iteración NO cambia esa relación informativa; solo enriquece el catálogo con los campos que la historia de usuario (fila 2 y 3 de la tabla en `proposal.md`) exige para cumplir el catálogo fiscal SAT/CFDI 4.0: `c_Impuesto` (Clave SAT: `002`=IVA, `003`=IEPS, `004`=ISR) y `c_TipoFactor` (Tasa, Cuota, Exento), más 4 cuentas contables opcionales para conciliación.

No existe `InMemoryTaxRateRepository` ni tests unitarios para este módulo (gap heredado del change anterior). CLAUDE.md exige que los use cases se prueben con `InMemory<Repo>` — se aprovecha este change para cerrar el gap sobre los 2 use cases que se tocan (`Create`, `Update`), sin expandir a los que no cambian (`List`, `Get`, `Deactivate`).

## Goals / Non-Goals

**Goals:**
- Agregar `satTaxCode`, `factorType`, `displayValue` y 4 cuentas contables opcionales al modelo `TaxRate`, con validación server-side acorde a catálogos SAT.
- Ampliar `rate` a 6 decimales (`Decimal(9,6)`) sin romper los 3 registros sembrados (`IVA_16`, `IEPS_8`, `IVA_0`).
- Reflejar los campos nuevos en la UI (`TaxRateEditModal`, `TaxRatesTable`) manteniendo el patrón "modal create/edit con diff, `code` deshabilitado en edit" ya usado en el resto de catálogos.
- Cerrar el gap de tests unitarios para `CreateTaxRateUseCase`/`UpdateTaxRateUseCase` vía `InMemoryTaxRateRepository`.

**Non-Goals:**
- No cambia la relación `products.taxRateId` de informativa a autoritativa — el cálculo de totales sigue leyendo `ivaRate`/`iepsRate` del producto. Migrar ese comportamiento es un change futuro (fuera de alcance; afectaría `SaleTotalsCalculator`/`QuoteTotalsCalculator`/`ReturnTotalsCalculator` y snapshots existentes).
- No agrega permisos RBAC nuevos (reutiliza `tax_rates:read`/`tax_rates:write`).
- No modifica el guard de desactivación (`DeactivateTaxRateUseCase`) — ya cumple el criterio de la historia 4.
- No archiva el change `tax-rates` previo (queda a criterio del usuario, fuera de este change).
- No agrega branch scoping — `tax-rates` es catálogo global, igual que `products`/`departments`, sin campo `branch_id`.

## Decisions

**1. Migración additiva, no tabla nueva.**
`satTaxCode`, `factorType`, `displayValue` se agregan como `NOT NULL` con `DEFAULT` transitorio + backfill en la misma migración (no se puede insertar `NOT NULL` sin default en tabla con filas existentes). Alternativa descartada: nullable permanente — rechazada porque la historia de usuario (fila 2) los marca "obligatorios, No Nulo" para registros nuevos; se resuelve con `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT '...'` seguido de `ALTER COLUMN ... DROP DEFAULT` tras backfill, patrón estándar Postgres para no bloquear la tabla.

**2. `factorType` como `String` con `CHECK` + enum Zod, no `enum` nativo Prisma.**
El resto del proyecto no usa `enum` de Prisma (revisar `schema.prisma`: estados como `sales.status`, `quotes.status` son `String` con validación en capa Zod/dominio, no `@@enum`). Se mantiene consistencia: `factorType String @db.VarChar(10)` + `CHECK (factor_type IN ('Tasa','Cuota','Exento'))` a nivel DB + `z.enum(["Tasa","Cuota","Exento"])` en el controller. Alternativa (Prisma `enum`) descartada por romper la convención del resto del schema y complicar futuras migraciones de valores.

**3. `satTaxCode` valida formato, no catálogo SAT completo.**
Regex `^\d{3}$` (mismo patrón que `taxRegime`/`cfdiUse` en `providers`/`customers`, ver CLAUDE.md §Products/Providers). No se importa el catálogo oficial SAT c_Impuesto (solo 3 valores reales: 001 ISR, 002 IVA, 003 IEPS) como lista cerrada — se deja como validación de formato, no de pertenencia, igual que el resto de catálogos SAT del proyecto (ninguno valida contra lista cerrada hoy). Ampliar a lista cerrada es un Open Question.

**4. `rate` pasa de `Decimal(5,4)` a `Decimal(9,6)`.**
La historia pide formato `0.000000` (6 decimales). `Decimal(5,4)` (1 entero + 4 decimales) no alcanza. Se usa `Decimal(9,6)` (3 enteros + 6 decimales) para dar margen a "Cuota" (monto fijo, puede superar 1.0), a diferencia de "Tasa" (factor 0–1). Los 3 valores sembrados (`0.16`, `0.08`, `0.0`) son compatibles sin pérdida de precisión.

**5. `displayValue` es campo propio, no derivado de `rate`.**
La historia distingue explícitamente "Valor" (entero humano, ej. `16`) de "Tasa/Cuota" (factor, ej. `0.160000`) como columnas separadas de la tabla fuente. Para `factorType='Cuota'`, el valor no es necesariamente `rate * 100` (una cuota es un monto fijo, no un porcentaje) — encapsular ambos como campos independientes evita asumir una fórmula que no aplica a todos los `factorType`. Alternativa (computar `displayValue` en el mapper) descartada porque rompe para `Cuota`.

**6. Cuentas contables: `String? @db.VarChar(20)`, sin validación de formato.**
La historia las marca "Opcional / Vacío" sin regex ni catálogo — se guardan como texto libre nullable, igual que otros campos opcionales de texto del proyecto (ej. `description`). No se valida contra un catálogo contable (no existe uno en el proyecto).

**7. `InMemoryTaxRateRepository` nuevo, alcance acotado a `Create`/`Update`.**
Se implementa el puerto completo (`TaxRateRepository`) en memoria para no dejarlo parcial, pero los tests unitarios nuevos solo cubren los 2 use cases que cambian de contrato (`Create`, `Update`) — `List`/`Get`/`Deactivate` no cambian de comportamiento en este change, tests para ellos quedan fuera de alcance.

## Risks / Trade-offs

- **[Riesgo] Backfill de `factorType`/`satTaxCode` en los 3 registros sembrados requiere una decisión de negocio (¿`IVA_0` es `Tasa` con valor 0, o `Exento`?)** → Mitigación: se sigue el criterio SAT estándar (tasa 0% es `Tasa` con factor `0.000000`, código `002`; "Exento" es una clasificación distinta usada solo cuando el producto no causa impuesto). Confirmar en `tasks.md` con el usuario si el negocio prefiere `IVA_0` como `Exento`.
- **[Riesgo] Ampliar `rate` a `Decimal(9,6)` cambia la forma en que Prisma serializa el campo (más dígitos) — cualquier código que asuma `Decimal(5,4)` (ninguno detectado fuera de `tax-rates`) podría truncar.** → Mitigación: `grep` confirma que `rate` de `TaxRate` no se usa fuera de `src/modules/tax-rates/` y `app/(private)/catalogs/tax-rates/` (no confundir con `ivaRate`/`iepsRate` de `Product`, que son campos distintos y no se tocan).
- **[Trade-off] No migrar `products.taxRateId` a autoritativo dentro de este change mantiene inconsistencia (el catálogo ahora es fiscalmente completo pero el cálculo de ventas lo sigue ignorando).** → Aceptado explícitamente como Non-Goal; documentado para que un change futuro (`link-tax-rate-to-product-calc` o similar) lo resuelva sin mezclar dos migraciones de comportamiento distintas en un mismo PR.

## Migration Plan

1. Migración Prisma `add_sat_fields_to_tax_rates`:
   - `ALTER TABLE tax_rates ADD COLUMN sat_tax_code VARCHAR(3) NOT NULL DEFAULT '002'`
   - `ALTER TABLE tax_rates ADD COLUMN factor_type VARCHAR(10) NOT NULL DEFAULT 'Tasa'`
   - `ALTER TABLE tax_rates ADD COLUMN display_value DECIMAL(9,4) NOT NULL DEFAULT 0`
   - `ALTER TABLE tax_rates ADD COLUMN transferred_account VARCHAR(20)`, `pending_transferred_account VARCHAR(20)`, `credited_account VARCHAR(20)`, `pending_credited_account VARCHAR(20)` (nullable, sin default)
   - `ALTER TABLE tax_rates ALTER COLUMN rate TYPE DECIMAL(9,6)`
   - `ALTER TABLE tax_rates ADD CONSTRAINT tax_rates_factor_type_check CHECK (factor_type IN ('Tasa','Cuota','Exento'))`
   - Backfill explícito de las 3 filas sembradas vía `UPDATE` en la misma migración (no depender del seeder para producción)
   - `ALTER COLUMN sat_tax_code DROP DEFAULT`, `ALTER COLUMN factor_type DROP DEFAULT`, `ALTER COLUMN display_value DROP DEFAULT` (los defaults transitorios solo existen para no romper filas existentes; los inserts nuevos vía API los exigen explícitos por la validación Zod)
2. `npx prisma generate`.
3. Actualizar `prisma/seeds/taxRates.ts` con los nuevos campos (upsert idempotente ya existente, solo se agregan claves al objeto).
4. Rollback: `prisma migrate resolve` + migración reversa manual (`DROP COLUMN` x7, `ALTER COLUMN rate TYPE DECIMAL(5,4)`) si se revierte antes de tener datos de producción nuevos; si ya hay datos en los campos nuevos, rollback requiere decisión manual (no hay downtime automático dado que son columnas aditivas).

## Open Questions

- ¿`IVA_0` en el seed debe clasificarse como `factorType='Tasa'` (factor 0%) o `factorType='Exento'`? Definido en Decisión 7 como `Tasa` por defecto — confirmar con negocio si aplica antes de archivar.
- ¿Se debe validar `satTaxCode` contra una lista cerrada del catálogo SAT c_Impuesto (`001`,`002`,`003`) en vez de solo el formato `^\d{3}$`? Se deja como validación de formato en este change, siguiendo el patrón del resto de catálogos SAT del proyecto — abrir change futuro si negocio lo requiere.
