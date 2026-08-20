## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador con acceso a reportes (`reports:sales_by_product_read` / `reports:customer_collections_read`) | Como Operador, quiero ver una opción explícita "Todos los clientes" en el filtro de cliente de los reportes de Ventas por Producto y Cobranza por Cliente, para saber que puedo consultar todos los clientes a la vez sin tener que descubrir que dejar el campo vacío produce ese resultado | - Given el filtro de cliente en `/reports/sales-by-product` o `/reports/collections` (vista Por Cliente), When se abre el combobox sin escribir nada, Then la primera opción de la lista es "Todos los clientes" con `value=""`.<br>- Given el estado inicial de ambas pantallas (`customerId=""` por default ya existente), When el combobox renderiza, Then muestra "Todos los clientes" como valor seleccionado (no un campo vacío sin texto).<br>- Given el usuario selecciona "Todos los clientes", When se aplican los filtros, Then el reporte se comporta igual que hoy al dejar `customerId` vacío (sin cambio de contrato con el backend — `customerId` sigue siendo opcional).<br>- Given el usuario escribe una búsqueda (≥1 char) en el combobox, When los resultados de `useCustomerSearch` llegan, Then "Todos los clientes" NO aparece mezclado entre los resultados de búsqueda — solo aparece como primera opción cuando el campo está vacío/sin buscar activamente. | - No aplica RBAC nuevo: el filtro ya era opcional a nivel de API antes de este cambio; esto solo lo hace visible en la UI, no amplía qué datos puede consultar el usuario.<br>- Sin exposición de datos nueva: "Todos los clientes" no es un cliente real, es un valor sentinel (`value=""`) ya soportado por el backend — no hay riesgo de colisión con un `customerId` real (los UUIDs de cliente nunca son cadena vacía). |

## Why

`GET /api/v1/admin/reports/sales-by-product` y `GET /api/v1/admin/reports/customer-collections` ya aceptan `customerId` opcional — omitirlo trae todos los clientes (`ReportsController.ts:196-211`). Pero `CustomerFilterCombobox.tsx:14` (componente compartido por ambas pantallas) construye sus opciones únicamente a partir de `useCustomerSearch`, sin una entrada sentinel — el único modo de lograr "todos los clientes" es vaciar el campo, algo que el operador no descubre por sí mismo. El cliente reportó explícitamente este vacío para ambos reportes.

## What Changes

- `CustomerFilterCombobox.tsx`: anteponer a las opciones de búsqueda una entrada fija `{ value: "", label: "Todos los clientes" }`, visible cuando el campo está vacío/sin búsqueda activa.
- Sin cambios en los consumidores (`SalesByProductBreakdownCard.tsx`, `CollectionsFilters.tsx`) — ambos ya inicializan `customerId` en `""`, así que la opción aparece seleccionada por defecto sin tocar esos archivos.
- Sin cambios de backend/API — el contrato `customerId` opcional ya existe.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `reports-ui`: se agrega un requisito nuevo sobre el comportamiento del componente compartido `CustomerFilterCombobox` (opción "Todos los clientes" explícita) — hoy la spec solo menciona que el combobox es "el mismo componente compartido" (`spec.md:226`) sin especificar este comportamiento; se documenta como requisito propio en vez de ampliar el requirement existente de sales-by-product, porque aplica igual a la vista de cobranza por cliente (`spec.md:143`).

## Impact

- `app/(private)/reports/_blocks/CustomerFilterCombobox.tsx`
- Efecto en dos pantallas sin tocarlas: `/reports/sales-by-product`, `/reports/collections` (vista Por Cliente)
- Sin cambios de backend, API, ni migraciones.
