## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Catálogo (con `products:read` o `sales:create`) | Como usuario que consulta o vende una dosificación, quiero que el precio unitario se siga calculando en automático a partir del precio base y el recargo configurado (ya no fijo en código), para que el precio mostrado en catálogo y POS refleje siempre el porcentaje vigente sin requerir un despliegue de código | - Given un producto con precio default $100 y una dosificación de 4 partes, when se consulta `computedUnitPrice`, then el resultado usa el % configurado actualmente (no un `7.0` hardcodeado) — con el default de 5% sin configurar aún: `(100/4)*1.05 = 26.25`.<br>- Given no existe configuración guardada (primera vez), when se calcula el precio, then se usa el default 5% documentado, sin error.<br>- Given un producto sin precio default, when se consulta la dosificación, then `computedUnitPrice=null` y `requiresDefaultPrice=true` (comportamiento existente, sin cambio). | - El cálculo del % vigente es de solo lectura para este rol — no puede modificarlo desde el flujo de venta/catálogo de productos, solo `Configuración` (ver historia 2). |
| 2 | Administrador (`settings:write`) | Como administrador, quiero configurar desde un apartado de Configuración el porcentaje de recargo que se aplica a las dosificaciones, para poder ajustarlo según la operación del negocio sin depender de un cambio de código | - Given no hay configuración previa, when el admin abre el apartado, then ve el valor default 5%.<br>- Given el admin cambia el valor a, por ejemplo, 8%, when guarda, then los cálculos de `computedUnitPrice` de TODAS las dosificaciones (de cualquier producto) usan 8% inmediatamente, sin requerir reinicio del servidor.<br>- Given el admin intenta guardar un valor negativo o no numérico, when envía el formulario, then la API rechaza con 400 y el valor vigente no cambia. | - Endpoint gateado por `settings:write` (lectura por `settings:read`) — mismos permisos ya usados por `ticket_settings`, sin permiso nuevo.<br>- Validación de rango en backend (no solo en cliente) para evitar que un request directo a la API guarde un % inválido (negativo, absurdamente alto, no numérico) que rompa cálculos de precio en cascada. |

Nota: ambas historias son independientes y trazables 1:1 a los 2 puntos de "What Changes". No hubo ambigüedad de Rol/Motivo — se infirieron de RBAC (`products:read`/`settings:write`) ya documentado en el proyecto y del patrón `ticket_settings` existente.

## Why

El recargo de dosificaciones vive hoy como una constante hardcodeada (`DOSIFICATION_SURCHARGE_PCT = 7.0`) en `DosificationPriceCalculator.ts`, documentada explícitamente en el spec `products-api` como "fixed 7% surcharge". El cliente pidió que este porcentaje sea administrable (default 5%) para poder ajustar márgenes de dosificación sin depender de un despliegue de código cada vez que cambia la política comercial. El módulo `settings` ya tiene un patrón probado para configuración global tipo singleton (`ticket_settings`), diseñado explícitamente como "extensible a futuras configuraciones globales sin cambiar el patrón" — este change reutiliza ese mismo patrón para una segunda configuración: el recargo de dosificaciones.

## What Changes

- Se elimina la constante `DOSIFICATION_SURCHARGE_PCT` hardcodeada en `src/modules/products/domain/services/DosificationPriceCalculator.ts`; la función pasa a recibir el porcentaje vigente como parámetro. **BREAKING** (interno): la firma de `DosificationPriceCalculator.computeUnitPrice` cambia para aceptar el % como argumento explícito en vez de usar una constante interna.
- Se agrega una nueva configuración global tipo singleton, `pricing_settings` (mismo patrón que `ticket_settings`), con el campo `dosificationSurchargePct` (decimal, default `5.0`).
- Nuevo endpoint `GET/PATCH /api/v1/admin/settings/pricing`, gateado por `settings:read`/`settings:write` (permisos ya existentes, sin cambio de RBAC).
- El flujo que arma el DTO de dosificaciones (mapper/use case) resuelve el % vigente desde la nueva configuración antes de calcular `computedUnitPrice`, en vez de usar el valor fijo.
- Nueva UI en `/settings`: sección "Precios" para editar el porcentaje, análoga a la sección existente de plantilla de ticket.

## Capabilities

### New Capabilities
(ninguna — se extiende `settings-api`, cuyo Purpose ya declara ser "extensible a futuras configuraciones globales sin cambiar el patrón")

### Modified Capabilities
- `products-api`: el cálculo de `computedUnitPrice` de dosificaciones (listado de catálogo) deja de usar un 7% fijo y pasa a usar el porcentaje configurado en `settings-api` (default 5%).
- `pos-api`: descubierto durante el diseño — `CreateSaleUseCase` y `EditCompletedSaleUseCase` también invocan `DosificationPriceCalculator.computeUnitPrice` al vender por dosificación; deben usar el mismo % configurado (no un 7% fijo) para que el precio de venta coincida con el mostrado en catálogo.
- `settings-api`: se agrega un segundo recurso de configuración global singleton (`GET/PATCH /settings/pricing`), junto al ya existente `GET/PATCH /settings/ticket`.

## Impact

- **Backend**: `src/modules/products/domain/services/DosificationPriceCalculator.ts`, `src/modules/products/application/mappers/toProductDosificationDto.ts`, y el/los use case(s) que listan dosificaciones (inyectan el nuevo repositorio de settings).
- **También descubierto**: `src/modules/pos/application/use-cases/CreateSaleUseCase.ts` y `EditCompletedSaleUseCase.ts` también llaman a `DosificationPriceCalculator.computeUnitPrice` (venta por dosificación). Se agrega `getDosificationSurchargePct()` a `PosLookupService` (puerto ya usado por ambos use cases) en vez de acoplar el módulo `pos` directamente a `PricingSettingsRepository` — mantiene la abstracción de lookups existente.
- **Nuevo módulo settings**: entidad `PricingSettings` + `DEFAULT_PRICING_SETTINGS`, use cases `GetPricingSettingsUseCase`/`UpdatePricingSettingsUseCase`, puerto `PricingSettingsRepository`, repositorio Prisma (patrón singleton-row como `PrismaTicketSettingsRepository`), controller/endpoint nuevo.
- **Migración Prisma**: tabla nueva `pricing_settings`.
- **Frontend**: `app/(private)/settings/` — nueva sección/formulario "Precios"; consumidores de dosificaciones (`ProductDosificationsTab.tsx`, `PriceTierPicker.tsx` en POS) no cambian — siguen consumiendo `computedUnitPrice` ya resuelto por el backend.
- **Specs**: `openspec/specs/products-api/spec.md` (sección de dosificaciones), `openspec/specs/settings-api/spec.md` (nuevo requirement de pricing settings).
- **No afecta**: RBAC (reutiliza `settings:read`/`settings:write` existentes), branch scoping (configuración global sin `branchId`, igual que `ticket_settings`), el resto de tareas de POS (stock negativo, desglose de impuesto — ver change `pos-stock-and-tax-inclusive-pricing`).
