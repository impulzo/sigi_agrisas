## MODIFIED Requirements

### Requirement: Reports module and navigation entry
El sistema SHALL exponer el módulo de UI en `app/(private)/reports/`. La ruta `/reports` SHALL renderizar un **hub** con tarjetas hacia los reportes disponibles ("Estados de Cuenta" → `/reports/account-statements`, "Corte de Ventas" → `/reports/sales-cut`, "Corte de Caja (Cobranza)" → `/reports/cash-cut`), cada tarjeta gated por su permiso (`reports:account_statements_read`, `reports:sales_cut_read` y `reports:cash_cut_read` respectivamente). El `NavigationRail` SHALL conservar el item primario `reports` (`href:/reports`, icon `summarize`, `requires:reports:account_statements_read`), mostrándose optimistamente durante `"loading"` y ocultándose cuando `can("reports:account_statements_read")` es `false`; el hub gatea cada tarjeta con su propio permiso. Las páginas (`page.tsx`) SHALL ser Server Components que exportan `metadata`. (Traza: S4, S5.)

#### Scenario: Item visible con permiso
- **WHEN** un usuario con `reports:account_statements_read` abre el panel
- **THEN** el NavigationRail muestra el item "Reportes" que navega a `/reports`

#### Scenario: Item oculto sin permiso
- **WHEN** un usuario sin el permiso resuelto a `false`
- **THEN** el item "Reportes" no se muestra y la ruta no es accesible

#### Scenario: Hub con tarjetas por permiso
- **WHEN** un usuario con `reports:sales_cut_read` abre `/reports`
- **THEN** ve la tarjeta "Corte de Ventas" que navega a `/reports/sales-cut`

#### Scenario: Tarjeta de cobranza por permiso
- **WHEN** un usuario con `reports:cash_cut_read` abre `/reports`
- **THEN** ve la tarjeta "Corte de Caja (Cobranza)" que navega a `/reports/cash-cut`

#### Scenario: Tarjeta oculta sin permiso
- **WHEN** el usuario no tiene el permiso de un reporte
- **THEN** su tarjeta no se muestra en el hub

---

## ADDED Requirements

### Requirement: Sales cut view
La ruta `/reports/sales-cut` SHALL renderizar el corte de ventas: un toggle de periodo "Hoy | Rango" (SegmentedButton) donde "Hoy" precarga el día actual (envía `preset=today`) y "Rango" habilita `from/to`; filtros de sucursal (visible solo con `can("branches:access_all")`), cajero y método de pago; tarjetas de totales (ventas, tickets, subtotal, IVA, IEPS, canceladas), una tarjeta de neto de caja con sus componentes, tablas de los cuatro desgloses (método, día, cajero, sucursal) y un botón "Exportar PDF" que descarga el PDF con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin ventas SHALL mostrar un estado vacío. (Traza: S4.)

#### Scenario: Corte del día
- **WHEN** un usuario con permiso abre `/reports/sales-cut` con "Hoy" seleccionado
- **THEN** ve los totales, el neto de caja y los desgloses del día actual

#### Scenario: Cambio a rango
- **WHEN** el usuario selecciona "Rango" e ingresa `from/to`
- **THEN** los totales, neto de caja y desgloses se recalculan para ese rango

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el corte se limita a su sucursal

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, autenticado vía `authFetch`

#### Scenario: Periodo sin ventas
- **WHEN** el periodo no tiene ventas
- **THEN** se muestra un estado vacío en lugar de las tablas

---

### Requirement: Cash cut (collections) view
La ruta `/reports/cash-cut` SHALL renderizar el corte de caja (cobranza detallada): filtros de sucursal (visible solo con `can("branches:access_all")`, requerido para acotar el corte) y rango de fechas (`from`/`to`, obligatorios); tarjetas de totales (`totalCollected`, `totalIva`); una tabla de desglose dinámico por forma de pago; una tabla de filas de cobranza con las columnas `Cte, Docto, Factura, Nombre del cliente, Fec-Fact, Días, Importe, Fp, Referencia, F. Cobro, I.V.A., Tasa%` (scroll horizontal); y botones "Exportar PDF" y "Exportar Excel" que descargan el reporte con los filtros aplicados vía `authFetch` (Bearer) sin exponer el token. Los `_blocks` SHALL ser presentacionales (sin `fetch`); el HTTP vive en `_logic/services/` y la orquestación en `_logic/hooks/`. Sin abonos en el periodo SHALL mostrar un estado vacío. (Traza: S5.)

#### Scenario: Corte de caja con filtros
- **WHEN** un usuario con permiso abre `/reports/cash-cut` y define sucursal + rango de fechas
- **THEN** ve los totales, el desglose por forma de pago y la tabla de filas de cobranza del periodo

#### Scenario: Filtro sucursal restringido
- **WHEN** el usuario no tiene `branches:access_all`
- **THEN** el filtro de sucursal no se muestra y el corte se limita a su sucursal

#### Scenario: Exportar PDF
- **WHEN** el usuario pulsa "Exportar PDF"
- **THEN** se descarga el PDF con los mismos filtros aplicados, autenticado vía `authFetch`

#### Scenario: Exportar Excel
- **WHEN** el usuario pulsa "Exportar Excel"
- **THEN** se descarga un archivo `.xlsx` con las mismas columnas y totales, autenticado vía `authFetch`

#### Scenario: Periodo sin cobranza
- **WHEN** el periodo no tiene abonos completados
- **THEN** se muestra un estado vacío en lugar de las tablas
