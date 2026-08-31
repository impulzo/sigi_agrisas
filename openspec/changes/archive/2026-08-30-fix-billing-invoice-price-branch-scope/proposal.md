## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con permiso `billing:write` (facturación) | Como usuario con permiso `billing:write`, quiero que al agregar un producto del catálogo en Factura Parcial se precargue su precio disponible según la sucursal efectiva (`branchId` de la sucursal del usuario o, si no aplica, la matriz/HQ), para poder emitir el CFDI sin bloquearme por un falso "Este producto no tiene precios configurados." cuando el precio real sólo existe como override de sucursal. | - Given un producto cuyo único `ProductPrice` es branch-scoped (sin fila global `branchId=null`), when lo agrego desde el catálogo en Factura Parcial, then su precio default se preselecciona y la línea no queda en `unitPrice: 0` ni dispara el mensaje de "sin precios".<br>- Given un producto con precio global (`branchId=null`) y sin override de sucursal, when lo agrego, then sigue funcionando igual que hoy (no regresión).<br>- Given ya agregada una línea, when uso "Elegir precio" (`handleChangeTier`) para cambiar de tier, then el comportamiento no cambia (ya era branch-aware).<br>- Given ninguna sucursal resuelta (`branchId` null y sin HQ configurada), when agrego un producto, then el comportamiento es el mismo que hoy para ese caso límite (fallback a precios globales, sin regresión ni crash). | - No se introduce bypass de branch scoping: `effectiveBranchId` reutiliza exactamente la misma resolución (`branchId` de sesión ?? `hq.id` ?? `null`) ya usada en `handleChangeTier` — no se expone selección arbitraria de sucursal desde el cliente.<br>- El fix es puramente de lectura de catálogo de precios (`GET /products/:id/prices`); no toca autorización de `POST /invoices` (`billing:write`) ni el flujo de timbrado.<br>- No se filtra información de otras sucursales: `findEffectiveForBranch` ya limita a `branchId IS NULL OR branchId = :effectiveBranchId`, sin cambios en ese contrato. |

Nota: una sola historia — es fix puntual de un bug de paridad de `branchId` entre dos call sites del mismo componente, no amerita partirse por INVEST.

## Why

`PartialInvoiceForm` (`/billing` → nueva factura) resuelve `effectiveBranchId` (`branchId` de sesión ?? `hq?.id` ?? `null`) pero sólo lo usa en `handleChangeTier` ("Elegir precio"). `handleAddProduct` (agregar producto desde catálogo) llama a `getProductPrices(product.id)` sin ese parámetro. Desde que `ProductPrice` soporta overrides por sucursal (migración `add-branch-scoped-prices`), la mayoría de los precios reales de catálogo ya no tienen fila global (`branchId=null`) — sólo la fila scoped. La consulta sin `branchId` (`findByProductId`, que filtra `branchId: null`) retorna `[]` para esos productos, y `PriceTierPicker` renderiza "Este producto no tiene precios configurados.", bloqueando al usuario de facturar con el precio correcto.

El resto de los módulos que comparten el mismo servicio (`getProductPrices`) — POS, Cotizaciones, Editar venta — ya pasan `branchId` consistentemente en sus dos call sites (agregar producto y cambiar tier). Facturación es el único módulo con la divergencia, originada porque el commit que hizo branch-aware a `handleChangeTier` (2026-08-28) no tocó `handleAddProduct`.

## What Changes

- `PartialInvoiceForm.handleAddProduct` (`app/(private)/billing/_blocks/PartialInvoiceForm.tsx:94`) pasa a llamar `getProductPrices(product.id, effectiveBranchId)`, igualando el patrón ya usado en `handleChangeTier` (línea 130) y en POS/Cotizaciones/Editar venta.
- Se actualiza `openspec/specs/billing-ui/spec.md` (requisito de agregar línea desde catálogo) para documentar que la búsqueda de precios es branch-aware (mismo criterio `effectiveBranchId` en ambos call sites), reemplazando el texto actual que documenta "sin branchId" como intencional — decisión heredada del proposal `2026-08-28-fix-pos-price-lookup-branch-scope`, que excluyó deliberadamente a `PartialInvoiceForm` de esa corrección y ya no es compatible con el modelo de datos real.
- Se agrega cobertura de test de regresión que asserte el argumento `branchId` pasado a `getProductPrices` en ambos call sites de `PartialInvoiceForm`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `billing-ui`: el requisito de agregar línea desde catálogo (`spec.md`, sección de conceptos/`PartialInvoiceForm`) cambia de "precios obtenidos sin `branchId`" a "precios obtenidos con `effectiveBranchId` (mismo criterio que `handleChangeTier`)".

## Impact

- Código: `app/(private)/billing/_blocks/PartialInvoiceForm.tsx` (1 línea).
- Tests: `tests/unit/ui/(private)/billing/PartialInvoiceForm.test.tsx` (nuevo caso/assert).
- Spec: `openspec/specs/billing-ui/spec.md` (sync de requisito de branch-awareness).
- Sin cambios de API, DB, ni permisos RBAC. Sin impacto en otros módulos (POS/Cotizaciones/Ventas ya son branch-aware en ambos call sites).
