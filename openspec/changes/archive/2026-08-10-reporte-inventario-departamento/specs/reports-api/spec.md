## ADDED Requirements

### Requirement: Department price list report endpoint

El sistema SHALL exponer `GET /api/v1/admin/reports/inventory/by-department` que devuelve el reporte de lista de precios por departamento: productos del catálogo agrupados por departamento → producto, cada producto con sus listas de precio (`product_prices`). El endpoint SHALL delegar a `reportsController` (módulo `src/modules/reports/`) y ejecutar el use case `GetDepartmentPriceListReportUseCase`. Soporta `?format=json|pdf|xlsx` (default `json`).

#### Scenario: Request JSON con autenticación válida

- **WHEN** un usuario autenticado con permiso `reports:inventory_read` ejecuta `GET /api/v1/admin/reports/inventory/by-department`
- **THEN** el sistema responde `200 application/json` con el DTO descrito en el requirement "Department price list report JSON DTO"

#### Scenario: Request PDF con autenticación válida

- **WHEN** el mismo usuario ejecuta `GET /api/v1/admin/reports/inventory/by-department?format=pdf`
- **THEN** el sistema responde `200 application/pdf` con `Content-Disposition: attachment; filename="inventory-by-department-YYYY-MM-DD.pdf"` (fecha del `generatedAt` UTC) y el cuerpo es un PDF binario válido generado por `@react-pdf/renderer`

#### Scenario: Request Excel con autenticación válida

- **WHEN** el mismo usuario ejecuta `GET /api/v1/admin/reports/inventory/by-department?format=xlsx`
- **THEN** el sistema responde `200` con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="inventory-by-department-YYYY-MM-DD.xlsx"` y una fila por precio (patrón de hoja plana del corte de caja)

#### Scenario: format desconocido

- **WHEN** el query param `format` toma un valor distinto a `json`, `pdf` o `xlsx` (ej. `?format=csv`)
- **THEN** el sistema responde `400 application/json` con un mensaje de error de validación

### Requirement: Department price list report authentication and authorization

El endpoint SHALL requerir un JWT válido propagado por `AuthMiddlewareAdapter` (headers `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id`) y SHALL exigir el permiso `reports:inventory_read`. SHALL responder `401` si el header `x-user-id` no está presente y `403` si `authz.userCan(userId, "reports:inventory_read")` devuelve `false`.

#### Scenario: Sin token

- **WHEN** la request no incluye `Authorization: Bearer`
- **THEN** el middleware responde `401 application/json` con `{"error":"Unauthorized"}` antes de invocar al controller

#### Scenario: Token válido sin el permiso

- **WHEN** un usuario autenticado SIN `reports:inventory_read` invoca el endpoint
- **THEN** el sistema responde `403 application/json` con `{"error":"Forbidden","required":"reports:inventory_read"}`

#### Scenario: Token válido con el permiso

- **WHEN** un usuario autenticado con `reports:inventory_read` invoca el endpoint sin otros errores
- **THEN** el sistema procede al use case y devuelve la respuesta (`200`)

### Requirement: Department price list report filters

El endpoint SHALL aceptar en la querystring, validados por Zod en el controller:
- `departmentId?: string (UUID)` — restringe el reporte al departamento dado. Si el departamento no existe o no tiene productos, el reporte devuelve `departments: []` (no `404`). Si se omite, el reporte incluye todos los departamentos que tengan al menos un producto.
- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).

#### Scenario: Filtro por departmentId

- **WHEN** el endpoint recibe `?departmentId=<uuid-D>` (D existe y tiene productos)
- **THEN** `departments[]` contiene a lo sumo un elemento (el departamento D) y `products[]` solo lista productos cuyo `departmentId === D`

#### Scenario: departmentId con formato inválido

- **WHEN** `?departmentId=` recibe un valor que no es UUID
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid departmentId"}`

#### Scenario: Sin departmentId

- **WHEN** el endpoint recibe la request sin `departmentId`
- **THEN** el reporte incluye todos los departamentos con productos, y `filters.departmentId === null`

### Requirement: Department price list report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. Los `Decimal` se serializan como `string` preservando la escala del schema (`price` con 4 decimales, `discountPct` con 2); los `Decimal` nullable (`ivaRate`, `iepsRate`, `discountPct`) SHALL aparecer como `null` cuando no tienen valor.

```json
{
  "generatedAt": "2026-08-08T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": { "departmentId": null },
  "departments": [
    {
      "departmentId": "<uuid>",
      "departmentCode": "AGRICULTOR",
      "departmentName": "AGRICULTOR",
      "products": [
        {
          "productId": "<uuid>",
          "code": "ACTIVA1",
          "name": "ACTIVANE 1KG",
          "unit": "PZA",
          "ivaRate": "0.1600",
          "iepsRate": null,
          "prices": [
            {
              "priceId": "<uuid>",
              "name": "Menudeo",
              "price": "100.0000",
              "minQuantity": 1,
              "discountPct": "0.00",
              "isDefault": true
            }
          ]
        }
      ],
      "subtotal": { "productCount": 1, "priceCount": 1 }
    }
  ],
  "totals": { "departmentCount": 1, "productCount": 1, "priceCount": 1 }
}
```

#### Scenario: Subtotales y totales consistentes

- **WHEN** el reporte devuelve `departments[]` con N departamentos, cada uno con P_i productos y Q_{i,j} precios por producto
- **THEN** `totals.departmentCount === N`, `totals.productCount === sum(P_i)`, `totals.priceCount === sum(Q_{i,j})`
- **AND** para cada departamento i: `departments[i].subtotal.productCount === P_i` y `departments[i].subtotal.priceCount === sum(Q_{i,j})`

#### Scenario: Producto sin listas de precio

- **WHEN** un producto no tiene registros `ProductPrice`
- **THEN** el producto se incluye con `prices: []` y su precio no suma a `priceCount`

#### Scenario: Precios nullable

- **WHEN** un producto tiene `ivaRate`/`iepsRate` nulos y un precio con `discountPct` nulo
- **THEN** los campos correspondientes se serializan como `null` (no `"0.0000"`)

#### Scenario: Sin productos

- **WHEN** el filtro selecciona un departamento sin productos
- **THEN** el reporte devuelve `departments: []`, `totals.productCount === 0` y `totals.priceCount === 0`

### Requirement: Department price list report PDF and Excel artifacts

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` que contenga al menos: header con título "Inventario por Departamento", `generatedAt` formateado y email del `generatedBy`; una sección por departamento con `departmentCode` + `departmentName`; por cada producto un grupo con código, nombre y unidad seguido de sus filas de precio (lista, precio, cantidad mínima, % descuento, default); subtotales por departamento y totales globales; footer con número de página (`Página X de Y`). Cuando `?format=xlsx`, el sistema SHALL devolver un workbook con una fila por precio y las columnas `Departamento | Código | Producto | Unidad | Lista | Precio | Cant. Mín | % Descto | Default`, más filas de subtotal por departamento y totales al final.

#### Scenario: PDF con metadatos correctos

- **WHEN** se solicita `?format=pdf` con datos
- **THEN** el `Content-Disposition` es `attachment` y el nombre de archivo respeta `inventory-by-department-<fecha>.pdf`

#### Scenario: Excel plano con totales

- **WHEN** se solicita `?format=xlsx` con datos
- **THEN** la hoja contiene una fila por precio (columnas de producto repetidas), filas de subtotal por departamento y filas de totales al final
