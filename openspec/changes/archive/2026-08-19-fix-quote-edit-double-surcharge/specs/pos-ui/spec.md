## MODIFIED Requirements

### Requirement: Consistencia del recargo de dosificación entre pantallas del carrito

Toda pantalla que instancie `useCart` (POS `/pos`, cotizaciones `/quotes/new` y `/quotes/[id]/edit`, edición de venta `/sales/[id]/edit`) SHALL obtener el `dosificationSurchargePct` vigente vía `usePricingSettingsOptions()` y pasarlo como argumento a `useCart(dosificationSurchargePct)`, de modo que el total calculado en cliente para líneas con cantidad fraccionaria o dosificación coincida con el que el backend persiste al guardar. Ninguna pantalla SHALL invocar `useCart()` sin argumentos (lo que produce un recargo de `0`, desalineado del cálculo real).

Adicionalmente, ninguna pantalla que reconstruya el carrito a partir de items ya persistidos (snapshots) SHALL alimentar `useCart`/`addLine` con un precio que YA incluye el recargo aplicado. `computeTotalsClient` aplica el recargo de dosificación una sola vez por línea fraccionaria a partir del precio que recibe como "precio base" — si ese precio ya viene recargado (como el `unitPrice` snapshot de un `SaleItem`/`QuoteItem` persistido), el total mostrado queda recargado dos veces. La reconstrucción del carrito desde un snapshot SHALL producir, para cada línea fraccionaria, el mismo total que ya está persistido para esa línea (sin que el operador haya modificado nada).

#### Scenario: Cotización nueva con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `quotes:create` agrega en `/quotes/new` una línea con cantidad fraccionaria
- **THEN** el total de línea y el total del carrito mostrados incluyen el `dosificationSurchargePct` vigente (no `0`), y coinciden con el total que persiste `POST /api/v1/admin/quotes`

#### Scenario: Edición de cotización con línea fraccionaria refleja el recargo vigente (sin duplicarlo)
- **WHEN** un operador con `quotes:write` abre en `/quotes/[id]/edit` una cotización en estado `draft` que ya tiene una línea con cantidad fraccionaria y un `dosificationSurchargePct` vigente distinto de `0`
- **THEN** el total mostrado al cargar coincide exactamente con el `total` ya persistido de esa cotización (recargo aplicado una sola vez, no dos), y si el operador guarda sin modificar nada, el total que persiste `PATCH /api/v1/admin/quotes/:id` es idéntico al que ya se mostraba antes de guardar

#### Scenario: Edición de venta completada con línea fraccionaria refleja el recargo vigente
- **WHEN** un operador con `sales:edit_completed` (y guard de HQ) edita en `/sales/[id]/edit` una venta y agrega o modifica una línea con cantidad fraccionaria
- **THEN** el total mostrado incluye el `dosificationSurchargePct` vigente y coincide con el total que persiste `EditCompletedSaleUseCase`

#### Scenario: Línea con cantidad entera y sin dosificación — sin regresión
- **WHEN** una línea del carrito tiene cantidad entera y no referencia una dosificación, en cualquiera de las 4 pantallas
- **THEN** el recargo de dosificación no se aplica a esa línea, igual que antes del cambio
