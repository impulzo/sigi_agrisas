## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador (crea/edita cotizaciones y ventas) | Como Operador, quiero que el total mostrado en cotizaciones (crear/editar) y en edición de ventas incluya el recargo de dosificación vigente, para que el monto que veo antes de guardar coincida con el que el backend realmente cobra | - Given una línea con cantidad fraccionaria en `/quotes/new`, `/quotes/[id]/edit` o `/sales/[id]/edit`, When se agrega/edita esa línea, Then el total de línea y el total del carrito incluyen `dosificationSurchargePct` vigente (no 0).<br>- Given el mismo escenario, When se guarda (crear cotización, actualizar cotización, o guardar edición de venta), Then el total mostrado antes de guardar coincide exactamente con el total que persiste el backend (mismo cálculo, banker's rounding a 4 decimales).<br>- Given una línea con cantidad entera (no fraccionaria) y sin dosificación, When se calcula el total, Then el comportamiento no cambia (recargo no aplica, regresión cero).<br>- Given `dosificationSurchargePct` aún no cargó (fetch en curso), When se renderiza el carrito, Then usa el mismo fallback/caché de `usePricingSettingsOptions` que ya usa `PosPage` (no bloquea ni rompe la UI). | - No aplica: el recargo es un valor de configuración de negocio (`pricing_settings`), no un dato sensible ni sujeto a permisos por rol — mismo valor para todos los roles con acceso a estas pantallas.<br>- El cambio es puramente de presentación/cálculo cliente; el backend ya es la fuente de verdad y no se modifica — no hay riesgo de que el cliente pueda alterar el monto real cobrado (`CreateQuoteUseCase`, `UpdateQuoteUseCase`, `EditCompletedSaleUseCase` siguen recalculando server-side).<br>- Test de regresión debe cubrir que ninguna de las 3 pantallas quede con `surchargePct=0` por default silencioso otra vez. |

## Why

`useCart(surchargePct = 0)` (`app/(private)/pos/_logic/hooks/useCart.ts:152`) requiere que el caller le pase el recargo de dosificación vigente. `PosPage.tsx:48,59` lo hace correctamente vía `usePricingSettingsOptions()`, pero `QuoteCreatePage.tsx:35`, `QuoteEditPage.tsx:41` y `EditSalePage.tsx:61` llaman `useCart()` sin argumentos, cayendo al default `0`. El backend (`CreateSaleUseCase`, `EditCompletedSaleUseCase`, `CreateQuoteUseCase`, `UpdateQuoteUseCase`) sí aplica el recargo real en líneas con cantidad fraccionaria o dosificación. Resultado: en esas 3 pantallas el operador ve un total menor al que efectivamente se cobra/factura al guardar — un mismatch de datos entre lo que se muestra y lo que se persiste, no una feature nueva.

## What Changes

- `QuoteCreatePage.tsx`, `QuoteEditPage.tsx`, `EditSalePage.tsx`: obtener `dosificationSurchargePct` vía el hook global existente `app/_hooks/usePricingSettingsOptions.ts` y pasarlo a `useCart(dosificationSurchargePct)`, replicando el patrón ya usado en `PosPage.tsx:48,59`.
- Ningún hook, componente ni endpoint nuevo — reutiliza lo existente.
- Cobertura de test nueva para los 3 call sites (hoy no existe; `computeTotalsClient.test.ts:112` sólo cubre `surchargePct=0`).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `pos-ui`: no hay requisito documentado hoy sobre consistencia del recargo de dosificación entre las pantallas que instancian `useCart` (POS, cotizaciones, edición de venta). Se agrega ese requisito explícito — cierra un vacío de spec que permitió el bug, no cambia comportamiento de API/backend.

## Impact

- `app/(private)/quotes/_blocks/QuoteCreatePage.tsx`
- `app/(private)/quotes/_blocks/QuoteEditPage.tsx`
- `app/(private)/sales/_blocks/EditSalePage.tsx`
- Tests nuevos en `tests/unit/ui/(private)/quotes/` y `tests/unit/ui/(private)/sales/` (o donde ya vivan los tests de estas páginas)
- Sin cambios de backend, API, ni migraciones.
