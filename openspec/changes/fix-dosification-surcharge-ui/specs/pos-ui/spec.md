## ADDED Requirements

### Requirement: Consistencia del recargo de dosificación entre pantallas del carrito

Toda pantalla que instancie `useCart` (POS `/pos`, cotizaciones `/quotes/new` y `/quotes/[id]/edit`, edición de venta `/sales/[id]/edit`) SHALL obtener el `dosificationSurchargePct` vigente vía `usePricingSettingsOptions()` y pasarlo como argumento a `useCart(dosificationSurchargePct)`, de modo que el total calculado en cliente para líneas con cantidad fraccionaria o dosificación coincida con el que el backend persiste al guardar. Ninguna pantalla SHALL invocar `useCart()` sin argumentos (lo que produce un recargo de `0`, desalineado del cálculo real).

#### Scenario: Cotización nueva con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `quotes:create` agrega en `/quotes/new` una línea con cantidad fraccionaria
- **THEN** el total de línea y el total del carrito mostrados incluyen el `dosificationSurchargePct` vigente (no `0`), y coinciden con el total que persiste `POST /api/v1/admin/quotes`

#### Scenario: Edición de cotización con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `quotes:write` edita en `/quotes/[id]/edit` una cotización en estado `draft` y agrega o modifica una línea con cantidad fraccionaria
- **THEN** el total mostrado incluye el `dosificationSurchargePct` vigente y coincide con el total que persiste `PATCH /api/v1/admin/quotes/:id`

#### Scenario: Edición de venta completada con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `sales:edit_completed` (y guard de HQ) edita en `/sales/[id]/edit` una venta y agrega o modifica una línea con cantidad fraccionaria
- **THEN** el total mostrado incluye el `dosificationSurchargePct` vigente y coincide con el total que persiste `EditCompletedSaleUseCase`

#### Scenario: Línea con cantidad entera y sin dosificación — sin regresión
- **WHEN** una línea del carrito tiene cantidad entera y no referencia una dosificación, en cualquiera de las 4 pantallas
- **THEN** el recargo de dosificación no se aplica a esa línea, igual que antes del cambio
