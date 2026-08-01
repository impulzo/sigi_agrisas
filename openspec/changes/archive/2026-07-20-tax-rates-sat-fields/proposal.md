## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con `tax_rates:read` | Como usuario con `tax_rates:read`, quiero ver una cuadrícula con todos los impuestos configurados (incluyendo Clave SAT, Tipo Factor y cuentas contables) para consultar rápido qué tasas existen antes de asignarlas a un producto | Sin visibilidad centralizada de los campos fiscales, el operador no sabe qué claves SAT ya están mapeadas y puede duplicar conceptos o usar tasas incorrectas al dar de alta productos | - Grid muestra `code`, `name`, `satTaxCode`, `factorType`, `displayValue`, `rate`, cuentas contables, y `isActive`<br>- `?includeInactive=true` incluye tasas dadas de baja<br>- Paginado (`pageSize` máx 100), igual que el resto de catálogos admin<br>- Grid vacío no rompe la UI (empty state) | - Sin token → 401<br>- Sin `tax_rates:read` → 403 |
| 2 | Usuario con `tax_rates:write` | Como usuario con `tax_rates:write`, quiero crear un nuevo impuesto con Clave, Concepto, Valor, Clave SAT, Tasa/Cuota y Tipo Factor para tener disponible la tasa correcta al momento de asignarla a un producto | Cada régimen fiscal (IVA 16%, IEPS 8%, exento, etc.) necesita existir en el catálogo, clasificado según el catálogo SAT c_Impuesto/c_TipoFactor, antes de poder aplicarse a un producto o reflejarse en reportes fiscales | - `code` (ya existente, varchar 32, único) sigue siendo obligatorio y único — sin cambios<br>- `satTaxCode` (varchar 3) obligatorio, valida formato catálogo SAT c_Impuesto (regex `^\d{3}$`, ej. `002`=IVA, `003`=IEPS)<br>- `factorType` obligatorio, enum fijo `Tasa | Cuota | Exento` (catálogo SAT c_TipoFactor) — valor fuera de enum → 400<br>- `displayValue` (entero/decimal, ej. `16`, `3`) obligatorio — valor humano mostrado en UI, distinto del factor `rate`<br>- `rate` (factor decimal, ya existente) se amplía a 6 decimales, formato `0.000000`<br>- Cuentas contables (`transferredAccount`, `pendingTransferredAccount`, `creditedAccount`, `pendingCreditedAccount`, varchar 20) opcionales, `null`/vacío permitido<br>- Body inválido → 400 con detalle de campo | - Requiere `tax_rates:write` → 403 si falta (permiso ya sembrado, sin cambios RBAC)<br>- Validación Zod en el controller antes del use case |
| 3 | Usuario con `tax_rates:write` | Como usuario con `tax_rates:write`, quiero modificar Concepto, Valor, Clave SAT, Tipo Factor, tasas y cuentas contables de un impuesto existente (con `code` bloqueado) para corregir o actualizar sus datos sin romper referencias ya usadas por productos | Las clasificaciones fiscales cambian o se corrigen (ej. reclasificar una tasa mal mapeada al catálogo SAT) y bloquear `code` evita romper el vínculo con productos que ya lo referencian | - `code` inmutable — si viene en el PATCH, se ignora silenciosamente (mismo patrón que el resto de catálogos)<br>- PATCH admite `name`/`description`/`rate`/`satTaxCode`/`factorType`/`displayValue`/cuentas contables/`isActive` — al menos 1 campo (body vacío → 400)<br>- No encontrado → 404<br>- Mismas validaciones de formato que en creación | - Requiere `tax_rates:write` → 403 si falta<br>- Cambiar `satTaxCode`/`factorType` de una tasa ya usada en productos no afecta ventas/cotizaciones ya emitidas (siguen usando el snapshot `ivaRate`/`iepsRate` propio del producto, no re-resuelven el catálogo) |
| 4 | Usuario con `tax_rates:write` | Como usuario con `tax_rates:write`, quiero que el sistema siga bloqueando la baja de un impuesto si algún producto activo lo usa | Dar de baja una tasa en uso dejaría productos con una referencia fiscal huérfana y rompería reportes/UX que dependen de `taxRate` | - Comportamiento ya implementado y sin cambios: `DeactivateTaxRateUseCase` verifica `findActiveProductCount(id) > 0` antes de desactivar → 409 `TaxRateInUse` si está en uso<br>- No encontrado → 404 | - Requiere `tax_rates:write` → 403 si falta<br>- Sin cambios de seguridad — se documenta como criterio de aceptación explícito porque la historia original lo pedía, pero la implementación existente ya lo satisface |

*Nota: dividí la historia original en 4 (listar/crear/modificar/eliminar) por INVEST — cada una tiene mecánica y criterios propios. La historia 4 (eliminar) resultó ser un no-op: el guard de integridad referencial ya existe en `DeactivateTaxRateUseCase`/`TaxRateInUseByProductsError` desde el change `tax-rates` (ya implementado, 34/34 tareas completas, pendiente de archivar). Pregunta resuelta con el usuario: el rol de acceso sigue el patrón RBAC estándar del proyecto (`tax_rates:read`/`tax_rates:write`, ya sembrados para admin+operator/viewer — sin permisos nuevos).*

## Why

El catálogo de tasas de impuesto (`TaxRate`, módulo `tax-rates`) ya existe y está en producción, pero fue diseñado como un catálogo simplificado: `code`, `name`, `description`, `rate` (factor 0–1). Ese diseño no captura la clasificación fiscal que exige el catálogo SAT/CFDI 4.0 mexicano (`c_Impuesto` para identificar IVA/IEPS/ISR, `c_TipoFactor` para distinguir Tasa/Cuota/Exento) ni las cuentas contables asociadas (trasladado/acreditado) que el área contable necesita para conciliar. Sin estos campos, el operador no puede garantizar que cada producto quede correctamente clasificado ante el SAT ni generar reportes contables agrupados por cuenta. Esta extensión completa el catálogo existente en vez de crear uno nuevo, preservando el CRUD, el guard de eliminación y el RBAC ya construidos.

## What Changes

- Extiende el modelo `TaxRate` (dominio + Prisma) con: `satTaxCode` (Clave SAT, varchar 3, obligatorio), `factorType` (Tipo Factor: `Tasa | Cuota | Exento`, obligatorio), `displayValue` (Valor humano, obligatorio), y 4 cuentas contables opcionales (varchar 20): `transferredAccount`, `pendingTransferredAccount`, `creditedAccount`, `pendingCreditedAccount`.
- Amplía `rate` de `Decimal(5,4)` a `Decimal(9,6)` para soportar formato `0.000000` (6 decimales) solicitado.
- Migración Prisma additiva sobre `tax_rates` (columnas nuevas; `satTaxCode`/`factorType`/`displayValue` requieren backfill de las 3 filas sembradas — `IVA_16`→`002`/`Tasa`, `IEPS_8`→`003`/`Tasa`, `IVA_0`→`002`/`Tasa`).
- Validación Zod en `TaxRatesController`: `satTaxCode` regex `^\d{3}$`, `factorType` enum, `rate` ajustado a 6 decimales, cuentas contables opcionales `.max(20)`.
- Actualiza `TaxRateDto`, `CreateTaxRateRequest`, `UpdateTaxRateRequest`, `PrismaTaxRateRepository`, `TaxRate` (entidad de dominio) y `prisma/seeds/taxRates.ts` con los nuevos campos.
- UI: `TaxRateEditModal` agrega los campos nuevos (con `factorType` como selector); `TaxRatesTable` agrega columnas Clave SAT / Tipo Factor; tipos `_logic/types/{api,domain}.ts` y schema Zod cliente (`taxRate.schema.ts`) se actualizan en espejo.
- No agrega permisos RBAC nuevos — reutiliza `tax_rates:read`/`tax_rates:write` ya sembrados y asignados (admin+operator write, viewer read).
- No modifica el guard de eliminación/desactivación — ya cumple el criterio de la historia original sin cambios.

## Capabilities

### New Capabilities
(ninguna — esta iteración solo extiende capacidades existentes)

### Modified Capabilities
- `tax-rates-api`: agrega campos `satTaxCode`, `factorType`, `displayValue` y 4 cuentas contables al modelo/DTO/validación de creación y edición; amplía precisión de `rate`.
- `tax-rates-ui`: agrega los campos nuevos al formulario (`TaxRateEditModal`) y a la tabla (`TaxRatesTable`).

## Impact

- Nueva migración Prisma: `add_sat_fields_to_tax_rates`
- Modificado: `prisma/schema.prisma` (modelo `TaxRate`)
- Modificado: `src/modules/tax-rates/domain/entities/TaxRate.ts`
- Modificado: `src/modules/tax-rates/application/dto/TaxRateDto.ts`
- Modificado: `src/modules/tax-rates/application/ports/TaxRateRepository.ts` (`CreateTaxRateData`/`UpdateTaxRateData`)
- Modificado: `src/modules/tax-rates/application/use-cases/{CreateTaxRateUseCase,UpdateTaxRateUseCase}.ts`
- Modificado: `src/modules/tax-rates/infrastructure/repositories/PrismaTaxRateRepository.ts` (no existe repo InMemory — módulo solo tiene tests contra Prisma/mapper; evaluar en design si se agrega)
- Modificado: `src/modules/tax-rates/infrastructure/http/TaxRatesController.ts` (schemas Zod)
- Modificado: `prisma/seeds/taxRates.ts` (backfill de las 3 tasas sembradas)
- Modificado: `app/(private)/catalogs/tax-rates/_blocks/{TaxRateEditModal,TaxRatesTable}.tsx`
- Modificado: `app/(private)/catalogs/tax-rates/_logic/{types/api.ts,types/domain.ts,schemas/taxRate.schema.ts,services/taxRates.ts}`
- Sin cambios: RBAC (`prisma/seed.ts` permisos `tax_rates:*` ya existen), rutas `app/api/v1/admin/tax-rates/`, guard de eliminación (`DeactivateTaxRateUseCase`)
- Pendiente fuera de este change: archivar el change `tax-rates` (34/34 tareas completas, sin archivar) — no se toca aquí, se deja a criterio del usuario
