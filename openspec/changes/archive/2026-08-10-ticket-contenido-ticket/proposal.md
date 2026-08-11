# ticket-contenido-ticket

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket de una venta, quiero que el ticket muestre la información del cliente (RFC, nombre y dirección) para que el comprobante identifique al cliente | - Given una venta con cliente (`customerId` presente) en `/sales/:id/ticket`, when reviso el ticket (pantalla e impresión), then aparece la sección "Cliente" con RFC, Nombre y Dirección.<br>- Given una venta sin cliente (`customerId` null), when reviso el ticket, then la sección cliente se omite por completo (sin filas vacías). | - La información del cliente proviene exclusivamente de los datos ya cargados de esa venta (`useSaleDetail` / `SaleDetailDto`); no hay fetch adicional ni exposición de datos de otros clientes. |
| 2 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que el ticket muestre la información del negocio (dirección, teléfono y régimen fiscal) para que el comprobante incluya los datos fiscales del negocio | - Given `GET /settings/ticket` devuelve `businessAddress`, `businessPhone` y `businessTaxRegime`, when se imprime el ticket, then se muestra una sección de negocio con dirección, "Tel. <phone>" y régimen fiscal.<br>- Given los campos están vacíos (null), when se imprime, then la sección se omite sin romper el layout. | - Los datos del negocio se configuran globalmente vía settings (`settings:write`) y se leen con `settings:read`; sin permiso nuevo en el ticket. |
| 3 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que la etiqueta del folio sea "Folio" (no "Orden") para consistencia con el folio fiscal | - Given el ticket en pantalla (`TicketPreviewPage`), when reviso los datos de la transacción, then la etiqueta dice "Folio:" y no existe "Orden:". | - Sin cambios de datos; solo reetiquetado visual. |
| 4 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que la etiqueta del vendedor sea "Vendedor" (no "Cajero") para reflejar el rol correcto | - Given el ticket (pantalla e impresión), when reviso los datos, then aparece "Vendedor: <nombre>" y no "Cajero:". | - El dato sigue siendo `cashierName` del vendedor autenticado; no se exponen datos de otros usuarios. |
| 5 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero un campo "Condiciones" que muestre los días de crédito del cliente para informar las condiciones de pago | - Given una venta cuyo cliente tiene `creditDays`, when se imprime el ticket, then aparece "Condiciones: Crédito a <N> días".<br>- Given la venta no tiene cliente, when se imprime, then el campo se omite. | - `customerCreditDays` se deriva del cliente de la venta; sin fetch adicional. |
| 6 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que el total se etiquete "Total a pagar" para claridad del monto a cobrar | - Given el ticket (pantalla e impresión), when reviso los totales, then la línea del total dice "Total a pagar". | - Es solo reetiquetado; el monto es el `total` de la venta ya cargada. |
| 7 | Cajero/Administrador (`sales:read`) | Como usuario que imprime el ticket, quiero que el ticket muestre una leyenda de revisión de mercancía para informar al cliente de la política de devoluciones | - Given `GET /settings/ticket` devuelve `legendText`, when se imprime el ticket, then la leyenda se muestra en el pie del ticket.<br>- Given `legendText` es null, when se imprime, then la leyenda se omite. | - La leyenda es configuración global editable por `settings:write`; no es dato de la venta. |
| 8 | Cajero/Administrador (`sales:read`) | Como usuario que revisa el ticket, quiero que el diseño actual se conserve y la información se reordene en secciones para legibilidad | - Given el ticket en pantalla e impresión, when lo reviso, then mantiene el formato térmico monospace (58/80mm) y organiza la información por secciones: negocio, datos del ticket, cliente, condiciones, items, totales, leyenda y folio barcode. | - La impresión sigue usando únicamente los datos cargados de esa venta; sin nuevos permisos ni endpoints de lectura. |

## Why

Tras la revisión con el cliente se acordó enriquecer el ticket de venta: (1) incluir la información del cliente (RFC, nombre, dirección) y del negocio (dirección, teléfono, régimen fiscal 612), (2) reetiquetar "Orden" → "Folio" y "Cajero" → "Vendedor", (3) agregar un campo de condiciones con los días de crédito del cliente, (4) renombrar "Total" → "Total a pagar", y (5) agregar una leyenda de revisión de mercancía. Se mantiene el diseño térmico actual, solo se reordena y agrega información por secciones.

## What Changes

- **Backend — settings**: migración `add_ticket_business_fields` agrega a `ticket_settings` las columnas `business_address`, `business_phone`, `business_tax_regime` y `legend_text`. `TicketSettings` entity, `DEFAULT_TICKET_SETTINGS`, `TicketSettingsRepository` port, `PrismaTicketSettingsRepository`, `InMemoryTicketSettingsRepository`, `UpdateTicketSettingsUseCase` y `SettingsController` propagan los 4 campos (PATCH y GET). Defaults con los datos del cliente.
- **Backend — venta**: `PrismaSaleRepository` incluye `customer.address` y `customer.creditDays` en el join; `SaleJoinedFields`, `toSaleDto.ts` y `SaleDto`/`SaleDetailDto` exponen `customerAddress` y `customerCreditDays`.
- **Frontend — tipos**: `sales/_logic/types/api.ts` y `domain.ts` agregan `customerRfc`/`customerAddress`/`customerCreditDays`; `settings/_logic/types/api.ts` agrega los 4 campos de negocio a `TicketSettingsDto` y `UpdateTicketSettingsBody`.
- **Frontend — settings UI**: `TicketSettingsForm` agrega inputs para dirección, teléfono, régimen fiscal y leyenda del ticket.
- **Frontend — ticket**: `PrintableTicket` se reordena por secciones (negocio, datos del ticket con "Vendedor", cliente, condiciones, items, totales con "Total a pagar", leyenda y folio barcode). `TicketPreviewPage` reetiqueta "Orden" → "Folio" y "Cajero" → "Vendedor", agrega secciones cliente/condiciones/negocio y la leyenda, y renombra "Total" → "Total a pagar".
- **Specs**: se actualizan `ticket-print-ui`, `sales-ticket-preview-ui`, `settings-api` y `pos-api`.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `ticket-print-ui`: el ticket térmico muestra sección cliente (RFC/nombre/dirección), sección negocio (dirección/teléfono/régimen), "Vendedor", condiciones de crédito, "Total a pagar" y leyenda configurable.
- `sales-ticket-preview-ui`: la tarjeta Stitch usa "Folio" y "Vendedor", agrega secciones cliente/condiciones/negocio, "Total a pagar" y leyenda.
- `settings-api`: `GET/PATCH /api/v1/admin/settings/ticket` soporta `businessAddress`, `businessPhone`, `businessTaxRegime` y `legendText`.
- `pos-api`: `SaleDetailDto` expone `customerAddress` y `customerCreditDays`.
